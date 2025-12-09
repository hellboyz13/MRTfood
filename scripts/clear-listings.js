const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4'
);

async function clearMichelinStars() {
  console.log('=== DELETING MICHELIN 1-2-3 STAR LISTINGS ===\n');

  // Get listings to delete (1, 2, 3 star)
  const { data: toDelete } = await supabase
    .from('food_listings')
    .select('id, name, source_id')
    .in('source_id', ['michelin-1-star', 'michelin-2-star', 'michelin-3-star']);

  console.log('Listings to delete:', toDelete.length);
  toDelete.forEach(l => console.log('  -', l.name, '(' + l.source_id + ')'));

  const ids = toDelete.map(l => l.id);

  // Delete from listing_sources first
  console.log('\nDeleting from listing_sources...');
  await supabase.from('listing_sources').delete().in('listing_id', ids);

  // Delete from food_listings
  console.log('Deleting from food_listings...');
  await supabase.from('food_listings').delete().in('id', ids);

  // Verify
  const { count } = await supabase.from('food_listings').select('*', { count: 'exact', head: true });
  console.log('\n=== REMAINING ===');
  console.log('Total listings:', count);

  const { data: remaining } = await supabase.from('food_listings').select('source_id');
  const counts = {};
  remaining.forEach(l => counts[l.source_id] = (counts[l.source_id] || 0) + 1);
  Object.entries(counts).forEach(([s, c]) => console.log('  ' + s + ': ' + c));
}

clearMichelinStars();
