const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function check() {
  // Get total food listings
  const { count: totalListings } = await supabase
    .from('food_listings')
    .select('*', { count: 'exact', head: true });

  // Get listing IDs that have menu images
  const { data: menuImages } = await supabase
    .from('menu_images')
    .select('listing_id')
    .not('listing_id', 'is', null);

  const uniqueListingIds = new Set(menuImages.map(m => m.listing_id));
  const listingsWithImages = uniqueListingIds.size;
  const listingsWithoutImages = totalListings - listingsWithImages;

  console.log('=== MENU PHOTOS COVERAGE ===');
  console.log('Total food_listings:', totalListings);
  console.log('With menu photos:', listingsWithImages);
  console.log('Without menu photos:', listingsWithoutImages);
  console.log('Coverage:', (listingsWithImages / totalListings * 100).toFixed(1) + '%');

  // Get some examples without images
  if (listingsWithoutImages > 0) {
    const { data: allListings } = await supabase
      .from('food_listings')
      .select('id, name')
      .limit(1000);

    const missing = allListings.filter(l => !uniqueListingIds.has(l.id)).slice(0, 10);
    if (missing.length > 0) {
      console.log('\nExamples without menu photos:');
      missing.forEach((l, i) => console.log((i+1) + '. ' + l.name));
    }
  }
}

check().catch(console.error);
