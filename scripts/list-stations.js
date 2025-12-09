const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4'
);

async function listStations() {
  // Get distinct station_ids from food_listings
  const { data, error } = await supabase
    .from('food_listings')
    .select('station_id')
    .order('station_id');

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  // Get unique station IDs
  const stations = [...new Set(data.map(d => d.station_id))];
  stations.forEach(s => console.log(s));
  console.log('\nTotal unique stations:', stations.length);
}

listStations();
