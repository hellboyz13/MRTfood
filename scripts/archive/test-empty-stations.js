const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testEmptyStations() {
  // Get all stations with listings
  const { data: listingsStations } = await supabase
    .from('food_listings')
    .select('station_id')
    .eq('is_active', true)
    .not('station_id', 'is', null);

  // Get all stations with malls
  const { data: mallStations } = await supabase
    .from('malls')
    .select('station_id')
    .not('station_id', 'is', null);

  // Get all unique station IDs
  const { data: allStations } = await supabase
    .from('stations')
    .select('id');

  // Create set of stations with content
  const stationsWithContent = new Set();
  (listingsStations || []).forEach(s => {
    if (s.station_id) stationsWithContent.add(s.station_id);
  });
  (mallStations || []).forEach(m => {
    if (m.station_id) stationsWithContent.add(m.station_id);
  });

  // Return stations that have NO content
  const emptyStations = allStations
    .map(s => s.id)
    .filter(id => !stationsWithContent.has(id));

  console.log('Total stations:', allStations.length);
  console.log('Stations with content:', stationsWithContent.size);
  console.log('Empty stations:', emptyStations.length);
  console.log('\nAll empty stations:');
  emptyStations.forEach((station, index) => {
    console.log(`${index + 1}. ${station}`);
  });
}

testEmptyStations();
