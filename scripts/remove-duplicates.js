const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4'
);

async function main() {
  // Get all listings ordered by created_at to keep the oldest
  const { data: listings } = await supabase
    .from('food_listings')
    .select('id, name, station_id, created_at')
    .order('created_at');

  // Group by name + station_id
  const groups = {};
  listings.forEach(l => {
    const key = l.name + '|' + l.station_id;
    if (!groups[key]) groups[key] = [];
    groups[key].push(l);
  });

  // Find duplicates and collect IDs to delete
  const idsToDelete = [];
  const duplicates = Object.entries(groups).filter(([k, v]) => v.length > 1);

  console.log('Found ' + duplicates.length + ' groups with duplicates\n');

  duplicates.forEach(([key, items]) => {
    const [name, stationId] = key.split('|');
    console.log(name + ' @ ' + stationId);
    console.log('  Keeping: ' + items[0].id);

    // Delete all except the first (oldest)
    for (let i = 1; i < items.length; i++) {
      console.log('  Deleting: ' + items[i].id);
      idsToDelete.push(items[i].id);
    }
  });

  if (idsToDelete.length === 0) {
    console.log('\nNo duplicates to delete!');
    return;
  }

  console.log('\nDeleting ' + idsToDelete.length + ' duplicate listings...');

  // Delete in batches to avoid issues
  const batchSize = 20;
  for (let i = 0; i < idsToDelete.length; i += batchSize) {
    const batch = idsToDelete.slice(i, i + batchSize);
    const { error } = await supabase
      .from('food_listings')
      .delete()
      .in('id', batch);

    if (error) {
      console.log('Error deleting batch: ' + error.message);
    } else {
      console.log('Deleted batch ' + Math.floor(i/batchSize + 1) + ' (' + batch.length + ' items)');
    }
  }

  console.log('\nDone! Deleted ' + idsToDelete.length + ' duplicate listings.');

  // Verify
  const { count } = await supabase
    .from('food_listings')
    .select('*', { count: 'exact', head: true });

  console.log('Total listings remaining: ' + count);
}

main();
