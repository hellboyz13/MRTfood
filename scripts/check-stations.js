const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
config({ path: '.env.local', override: true });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkStations() {
  // Get all stations from DB
  const { data: stations } = await supabase.from('stations').select('id, name, lat, lng').order('id');

  // Get listing counts per station
  const { data: listings } = await supabase.from('food_listings').select('station_id');

  const stationCounts = {};
  listings.forEach(l => {
    stationCounts[l.station_id] = (stationCounts[l.station_id] || 0) + 1;
  });

  console.log('=== STATIONS WITH LISTINGS ===');
  const withListings = stations.filter(s => stationCounts[s.id]);
  console.log('Stations with food: ' + withListings.length);

  console.log('\n=== STATIONS WITHOUT LISTINGS ===');
  const withoutListings = stations.filter(s => !stationCounts[s.id]);
  withoutListings.forEach(s => console.log(s.id));
  console.log('Total without food: ' + withoutListings.length);

  console.log('\n=== TOP 10 STATIONS BY LISTINGS ===');
  const sorted = Object.entries(stationCounts).sort((a,b) => b[1] - a[1]).slice(0, 10);
  sorted.forEach(([id, count]) => console.log(id + ': ' + count));

  console.log('\n=== TOTAL ===');
  console.log('Total stations: ' + stations.length);
  console.log('Total listings: ' + listings.length);
}
checkStations();
