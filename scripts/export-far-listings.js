const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4'
);

async function exportFarListings() {
  // Get all listings with distance > 1000m (1km)
  const { data: listings, error } = await supabase
    .from('food_listings')
    .select('name, lat, lng, station_id, distance_to_station, address')
    .gt('distance_to_station', 1000)
    .eq('is_active', true)
    .order('distance_to_station', { ascending: false });

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  // Print CSV header
  console.log('name,lat,lng,station_id,distance_m,address');

  // Print each listing as CSV
  listings.forEach(l => {
    // Escape commas in name and address
    const name = l.name.includes(',') ? `"${l.name}"` : l.name;
    const address = l.address ? (l.address.includes(',') ? `"${l.address}"` : l.address) : '';
    console.log(`${name},${l.lat},${l.lng},${l.station_id},${l.distance_to_station},${address}`);
  });

  console.error(`\nTotal: ${listings.length} listings > 1km from station`);
}

exportFarListings();
