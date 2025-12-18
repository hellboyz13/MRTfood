const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function copyChainThumbnails() {
  console.log('=== COPY CHAIN RESTAURANT THUMBNAILS ===\n');

  // Get all outlets with thumbnails
  const { data: outletsWithThumbnails, error: fetchError } = await supabase
    .from('mall_outlets')
    .select('name, thumbnail_url')
    .not('thumbnail_url', 'is', null)
    .neq('thumbnail_url', '');

  if (fetchError) {
    console.log('Error fetching outlets with thumbnails:', fetchError);
    return;
  }

  // Create a map of normalized name -> thumbnail_url
  const thumbnailMap = new Map();
  for (const outlet of outletsWithThumbnails) {
    const normalizedName = outlet.name.toLowerCase().trim();
    if (!thumbnailMap.has(normalizedName)) {
      thumbnailMap.set(normalizedName, outlet.thumbnail_url);
    }
  }

  console.log(`Found ${thumbnailMap.size} unique chain names with thumbnails\n`);

  // Get all outlets without thumbnails
  const { data: outletsWithoutThumbnails, error: fetchError2 } = await supabase
    .from('mall_outlets')
    .select('id, name, mall_id')
    .or('thumbnail_url.is.null,thumbnail_url.eq.');

  if (fetchError2) {
    console.log('Error fetching outlets without thumbnails:', fetchError2);
    return;
  }

  console.log(`Found ${outletsWithoutThumbnails.length} outlets without thumbnails\n`);

  let updated = 0;
  let skipped = 0;

  for (const outlet of outletsWithoutThumbnails) {
    const normalizedName = outlet.name.toLowerCase().trim();

    if (thumbnailMap.has(normalizedName)) {
      const thumbnailUrl = thumbnailMap.get(normalizedName);

      const { error: updateError } = await supabase
        .from('mall_outlets')
        .update({ thumbnail_url: thumbnailUrl })
        .eq('id', outlet.id);

      if (updateError) {
        console.log(`Error updating ${outlet.name} at ${outlet.mall_id}: ${updateError.message}`);
      } else {
        console.log(`Updated: ${outlet.name} at ${outlet.mall_id}`);
        updated++;
      }
    } else {
      skipped++;
    }
  }

  console.log(`\n=== COMPLETE ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped (no matching chain): ${skipped}`);
}

copyChainThumbnails().catch(console.error);
