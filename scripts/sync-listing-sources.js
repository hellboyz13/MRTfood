const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4'
);

async function syncListingSources() {
  console.log('=== SYNCING LISTING_SOURCES ===\n');

  // Get all listings
  const { data: listings } = await supabase.from('food_listings').select('id, name, source_id, source_url');

  // Get existing listing_sources
  const { data: existing } = await supabase.from('listing_sources').select('listing_id');
  const existingIds = new Set(existing.map(e => e.listing_id));

  // Find listings not in listing_sources
  const missing = listings.filter(l => existingIds.has(l.id) === false);

  console.log('Missing from listing_sources:', missing.length);

  // Insert missing entries
  const toInsert = missing.map(l => ({
    listing_id: l.id,
    source_id: l.source_id,
    source_url: l.source_url || null,
    is_primary: true
  }));

  if (toInsert.length > 0) {
    const { error } = await supabase.from('listing_sources').insert(toInsert);
    if (error) {
      console.log('Error inserting:', error.message);
    } else {
      console.log('Inserted', toInsert.length, 'entries into listing_sources');
    }
  }

  // Verify
  const { count } = await supabase.from('listing_sources').select('*', { count: 'exact', head: true });
  console.log('\nTotal listing_sources entries now:', count);
}

syncListingSources();
