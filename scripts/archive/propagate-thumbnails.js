const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Normalize name for matching (lowercase, remove special chars, trim)
function normalizeName(name) {
  return name.toLowerCase()
    .replace(/[''`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract chain name from outlet name (handles variations like "Ajisen Ramen", "AJISEN RAMEN", etc.)
function getChainKey(name) {
  return normalizeName(name)
    .replace(/['&]/g, '')
    .replace(/\s+/g, '-');
}

async function propagateThumbnails() {
  console.log('=== PROPAGATE THUMBNAILS ACROSS ALL MALLS ===\n');

  // Step 1: Get ALL outlets with thumbnails
  const { data: outletsWithThumb, error: thumbError } = await supabase
    .from('mall_outlets')
    .select('name, thumbnail_url')
    .not('thumbnail_url', 'is', null);

  if (thumbError) {
    console.error('Error fetching outlets with thumbnails:', thumbError);
    return;
  }

  console.log(`Found ${outletsWithThumb.length} outlets with thumbnails\n`);

  // Build a map of normalized chain names to thumbnail URLs
  const chainThumbnails = new Map();
  outletsWithThumb.forEach(outlet => {
    const key = getChainKey(outlet.name);
    // Only add if not already in map (first one wins)
    if (!chainThumbnails.has(key)) {
      chainThumbnails.set(key, {
        name: outlet.name,
        thumbnail_url: outlet.thumbnail_url
      });
    }
  });

  console.log(`Built thumbnail map with ${chainThumbnails.size} unique chains\n`);

  // Step 2: Get all outlets without thumbnails
  const { data: outletsWithoutThumb, error: outletError } = await supabase
    .from('mall_outlets')
    .select('id, name, mall_id, thumbnail_url')
    .is('thumbnail_url', null);

  if (outletError) {
    console.error('Error fetching outlets:', outletError);
    return;
  }

  console.log(`Found ${outletsWithoutThumb.length} outlets without thumbnails\n`);

  // Step 3: Match and update
  let updated = 0;
  let matched = 0;
  const updates = [];

  for (const outlet of outletsWithoutThumb) {
    const key = getChainKey(outlet.name);
    const match = chainThumbnails.get(key);

    if (match) {
      matched++;
      updates.push({
        id: outlet.id,
        name: outlet.name,
        mall_id: outlet.mall_id,
        thumbnail_url: match.thumbnail_url,
        matched_with: match.name
      });
    }
  }

  console.log(`Found ${matched} matching chains\n`);

  if (updates.length === 0) {
    console.log('No outlets to update.');
    return;
  }

  // Show what will be updated
  console.log('Outlets to update:');
  updates.forEach(u => {
    console.log(`  ${u.name} @ ${u.mall_id} <- ${u.matched_with}`);
  });

  console.log('\nUpdating thumbnails...');

  // Batch update
  for (const update of updates) {
    const { error: updateError } = await supabase
      .from('mall_outlets')
      .update({ thumbnail_url: update.thumbnail_url })
      .eq('id', update.id);

    if (updateError) {
      console.log(`  Error updating ${update.name}: ${updateError.message}`);
    } else {
      console.log(`  Updated: ${update.name} @ ${update.mall_id}`);
      updated++;
    }
  }

  console.log(`\n=== COMPLETE ===`);
  console.log(`Matched: ${matched}`);
  console.log(`Updated: ${updated}`);
}

propagateThumbnails().catch(console.error);
