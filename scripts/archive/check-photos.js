const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function check() {
  // Get listings with photos
  const { data: images, error: imgErr } = await supabase
    .from('menu_images')
    .select('listing_id');

  if (imgErr) {
    console.error('Error fetching images:', imgErr);
    return;
  }

  const listingIds = [...new Set(images.map(i => i.listing_id))];
  console.log('Found', listingIds.length, 'listings with photos');

  // Get listing details with nearest station
  const { data: listings, error: listErr } = await supabase
    .from('food_listings')
    .select('id, name, station_id')
    .in('id', listingIds);

  if (listErr) {
    console.error('Error fetching listings:', listErr);
    return;
  }

  // Group by station
  const byStation = {};
  listings.forEach(l => {
    const station = l.station_id || 'Unknown';
    if (!byStation[station]) byStation[station] = [];
    byStation[station].push(l.name);
  });

  console.log('Stations with photos:');
  Object.entries(byStation).forEach(([station, restaurants]) => {
    console.log('\n' + station + ' (' + restaurants.length + ' restaurants):');
    restaurants.slice(0, 3).forEach(r => console.log('  - ' + r));
    if (restaurants.length > 3) console.log('  ... and ' + (restaurants.length - 3) + ' more');
  });
}

check();
