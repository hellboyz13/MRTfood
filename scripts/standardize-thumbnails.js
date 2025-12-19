const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Normalize name for grouping
function normalizeName(name) {
  let n = name
    .toLowerCase()
    .replace(/[®™©]/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s*-\s*(tampines|jurong|orchard|bugis|amk|hub|mall|plaza|point|centre|central|city|square|junction|gateway|singpost|novena|woodlands|yishun|tampines|bedok|clementi|bishan|toa payoh|ang mo kio|serangoon|hougang|sengkang|punggol|pasir ris|changi|airport|harbourfront|vivocity|sentosa|marina|bay|sands|esplanade|raffles|tanjong pagar|chinatown|clarke quay|boat quay|robertson|dempsey|holland|bukit timah|newton|stevens|orchard|somerset|dhoby ghaut|city hall|bugis|lavender|kallang|stadium|mountbatten|dakota|paya lebar|eunos|kembangan|bedok|tanah merah|expo|changi|simei|tampines|pasir ris|punggol|sengkang|buangkok|hougang|kovan|serangoon|bartley|tai seng|macpherson|potong pasir|boon keng|farrer park|little india|rochor|jalan besar|bendemeer|geylang bahru|mattar|ubi|kaki bukit|aljunied).*/gi, '')
    .replace(/\s+(sg|singapore)$/i, '')
    .replace(/['']/g, "'")
    .replace(/[""]/g, '')
    .replace(/&/g, 'and')
    .replace(/\s+/g, ' ')
    .trim();

  // Remove trailing modifiers like "express", "cafe", "café"
  n = n.replace(/\s+(express|cafe|café|bistro|bar|kitchen|restaurant|dining|grill|deli|bakery)$/i, '');

  // Normalize accented characters
  n = n.replace(/é/g, 'e').replace(/è/g, 'e').replace(/ê/g, 'e');
  n = n.replace(/à/g, 'a').replace(/á/g, 'a').replace(/â/g, 'a');
  n = n.replace(/ù/g, 'u').replace(/ú/g, 'u').replace(/û/g, 'u');
  n = n.replace(/ì/g, 'i').replace(/í/g, 'i').replace(/î/g, 'i');
  n = n.replace(/ò/g, 'o').replace(/ó/g, 'o').replace(/ô/g, 'o');

  // Remove "signature" prefix
  n = n.replace(/^signature\s+/i, '');

  return n;
}

// Score a thumbnail URL - higher is better
function scoreThumbnail(url) {
  if (!url) return 0;

  // Prefer Supabase storage URLs
  if (url.includes('supabase.co/storage')) return 100;

  // Then prefer specific food delivery platforms
  if (url.includes('deliveroo')) return 80;
  if (url.includes('foodpanda')) return 75;
  if (url.includes('grab')) return 70;

  // Official mall websites
  if (url.includes('capitaland')) return 60;
  if (url.includes('fairprice')) return 55;

  // Generic CDNs
  if (url.includes('cloudinary')) return 50;
  if (url.includes('imgix')) return 45;

  // Any other URL
  return 30;
}

async function main() {
  console.log('Fetching all outlets with thumbnails...');

  // Fetch all outlets in batches (Supabase has 1000 row limit per query)
  let allOutlets = [];
  let offset = 0;
  const batchSize = 1000;

  while (true) {
    const { data: batch, error } = await supabase
      .from('mall_outlets')
      .select('id, name, mall_id, thumbnail_url')
      .not('thumbnail_url', 'is', null)
      .range(offset, offset + batchSize - 1);

    if (error) {
      console.error('Error fetching outlets:', error);
      return;
    }

    if (!batch || batch.length === 0) break;

    allOutlets = allOutlets.concat(batch);
    offset += batchSize;

    if (batch.length < batchSize) break;
  }

  const outlets = allOutlets;

  console.log(`Found ${outlets.length} outlets with thumbnails\n`);

  // Group by normalized name
  const groups = {};
  for (const outlet of outlets) {
    const normalized = normalizeName(outlet.name);
    if (!groups[normalized]) {
      groups[normalized] = [];
    }
    groups[normalized].push(outlet);
  }

  // Find groups with multiple different thumbnails
  const inconsistent = [];
  for (const [name, outletList] of Object.entries(groups)) {
    if (outletList.length < 2) continue;

    const uniqueThumbnails = [...new Set(outletList.map(o => o.thumbnail_url).filter(Boolean))];
    if (uniqueThumbnails.length > 1) {
      // Find best thumbnail
      let bestThumbnail = null;
      let bestScore = -1;

      for (const thumb of uniqueThumbnails) {
        const score = scoreThumbnail(thumb);
        if (score > bestScore) {
          bestScore = score;
          bestThumbnail = thumb;
        }
      }

      // Find outlets that need updating
      const toUpdate = outletList.filter(o => o.thumbnail_url !== bestThumbnail);

      if (toUpdate.length > 0) {
        inconsistent.push({
          name,
          bestThumbnail,
          bestScore,
          totalOutlets: outletList.length,
          toUpdate
        });
      }
    }
  }

  console.log(`Found ${inconsistent.length} chains with inconsistent thumbnails\n`);

  // Sort by number of outlets to update
  inconsistent.sort((a, b) => b.toUpdate.length - a.toUpdate.length);

  // Show what we'll update
  let totalToUpdate = 0;
  for (const chain of inconsistent) {
    console.log(`${chain.name.toUpperCase()}: ${chain.toUpdate.length}/${chain.totalOutlets} outlets to update`);
    console.log(`  Best thumbnail (score ${chain.bestScore}): ${chain.bestThumbnail.substring(0, 80)}...`);
    for (const outlet of chain.toUpdate.slice(0, 3)) {
      console.log(`  - ${outlet.name} @ ${outlet.mall_id}`);
    }
    if (chain.toUpdate.length > 3) {
      console.log(`  ... and ${chain.toUpdate.length - 3} more`);
    }
    totalToUpdate += chain.toUpdate.length;
    console.log('');
  }

  console.log(`\nTotal outlets to update: ${totalToUpdate}`);
  console.log('\nUpdating database...\n');

  let updated = 0;
  let failed = 0;

  for (const chain of inconsistent) {
    for (const outlet of chain.toUpdate) {
      const { error: updateError } = await supabase
        .from('mall_outlets')
        .update({ thumbnail_url: chain.bestThumbnail })
        .eq('id', outlet.id);

      if (updateError) {
        console.error(`Failed to update ${outlet.id}: ${updateError.message}`);
        failed++;
      } else {
        updated++;
      }
    }
    console.log(`Updated ${chain.name}: ${chain.toUpdate.length} outlets`);
  }

  console.log('\n=== Summary ===');
  console.log(`Chains processed: ${inconsistent.length}`);
  console.log(`Outlets updated: ${updated}`);
  console.log(`Failed: ${failed}`);
}

main().catch(console.error);
