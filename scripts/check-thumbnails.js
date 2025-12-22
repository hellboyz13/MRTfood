require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  // Food Listings - use image_url column
  const { data: allListings, error: listingsError } = await supabase
    .from('food_listings')
    .select('id, name, image_url')
    .eq('is_active', true);

  if (listingsError) {
    console.error('Error fetching listings:', listingsError);
    return;
  }

  const listingsWithThumb = allListings.filter(l => l.image_url && l.image_url.trim() !== '');
  const listingsNoThumb = allListings.filter(l => !l.image_url || l.image_url.trim() === '');

  // Mall Outlets - no is_active column
  const { data: allOutlets, error: outletsError } = await supabase
    .from('mall_outlets')
    .select('id, name, thumbnail_url');

  if (outletsError) {
    console.error('Error fetching outlets:', outletsError);
    return;
  }

  const outletsWithThumb = allOutlets.filter(o => o.thumbnail_url && o.thumbnail_url.trim() !== '');
  const outletsNoThumb = allOutlets.filter(o => !o.thumbnail_url || o.thumbnail_url.trim() === '');

  console.log('=== Thumbnail Summary ===');
  console.log('');
  console.log('FOOD LISTINGS:');
  console.log('  Total active:', allListings.length);
  console.log('  With thumbnail:', listingsWithThumb.length);
  console.log('  Missing thumbnail:', listingsNoThumb.length);
  console.log('  Coverage:', ((listingsWithThumb.length / allListings.length) * 100).toFixed(1) + '%');
  console.log('');
  console.log('MALL OUTLETS:');
  console.log('  Total active:', allOutlets.length);
  console.log('  With thumbnail:', outletsWithThumb.length);
  console.log('  Missing thumbnail:', outletsNoThumb.length);
  console.log('  Coverage:', ((outletsWithThumb.length / allOutlets.length) * 100).toFixed(1) + '%');
}

check().catch(console.error);
