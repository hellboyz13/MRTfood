const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkImages() {
  // Check menu_images table
  const { data: menuImages, error: menuError } = await supabase
    .from('menu_images')
    .select('id, listing_id, image_url, is_header')
    .limit(100);

  if (menuError) {
    console.log('Menu images error:', menuError.message);
  } else {
    console.log('\n=== MENU IMAGES TABLE ===');
    const count = menuImages ? menuImages.length : 0;
    console.log('Total menu images: ' + count);
    if (count > 0) {
      const headerImages = menuImages.filter(function(img) { return img.is_header; });
      console.log('Header images: ' + headerImages.length);
      const uniqueListings = new Set(menuImages.map(function(m) { return m.listing_id; }));
      console.log('Unique listings with images: ' + uniqueListings.size);
    }
  }

  // Check food_listings with image_url
  const { data: listings, error: listingsError } = await supabase
    .from('food_listings')
    .select('id, name, image_url')
    .not('image_url', 'is', null);

  if (listingsError) {
    console.log('Listings error:', listingsError.message);
  } else {
    console.log('\n=== FOOD LISTINGS WITH IMAGE_URL ===');
    const listCount = listings ? listings.length : 0;
    console.log('Listings with image_url: ' + listCount);
    if (listCount > 0) {
      listings.slice(0, 5).forEach(function(l) {
        const url = l.image_url ? l.image_url.substring(0, 50) + '...' : 'null';
        console.log('  - ' + l.name + ': ' + url);
      });
    }
  }

  // Total listings count
  const { count } = await supabase
    .from('food_listings')
    .select('*', { count: 'exact', head: true });

  console.log('\n=== TOTAL ===');
  console.log('Total food listings: ' + count);
}

checkImages();
