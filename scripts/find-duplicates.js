const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4'
);

async function main() {
  // Get all listings
  const { data: listings } = await supabase
    .from('food_listings')
    .select('id, name, station_id, address')
    .order('name');

  // Group by name + station_id
  const groups = {};
  listings.forEach(l => {
    const key = l.name + '|' + l.station_id;
    if (!groups[key]) groups[key] = [];
    groups[key].push(l);
  });

  // Find duplicates
  const duplicates = Object.entries(groups).filter(([k, v]) => v.length > 1);

  console.log('Found ' + duplicates.length + ' groups with duplicates:\n');
  duplicates.forEach(([key, items]) => {
    const [name, stationId] = key.split('|');
    console.log(name + ' @ ' + stationId + ' (' + items.length + ' copies)');
    items.forEach(item => {
      console.log('  - ID: ' + item.id);
    });
  });
}

main();
