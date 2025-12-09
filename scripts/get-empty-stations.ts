import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4'
);

async function main() {
  const { data: stations } = await supabase.from('stations').select('id, name');
  const { data: listings } = await supabase.from('food_listings').select('station_id');

  if (!stations || !listings) {
    console.log('Error fetching data');
    return;
  }

  const stationCounts: Record<string, number> = {};
  stations.forEach(s => stationCounts[s.id] = 0);
  listings.forEach(l => {
    if (l.station_id && stationCounts[l.station_id] !== undefined) {
      stationCounts[l.station_id]++;
    }
  });

  const empty = stations.filter(s => stationCounts[s.id] === 0).sort((a, b) => a.name.localeCompare(b.name));

  console.log(`\nStations with 0 listings (${empty.length}):\n`);
  empty.forEach(s => console.log(`  - ${s.name} (${s.id})`));
}

main().catch(console.error);
