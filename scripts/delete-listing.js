const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Use service role key to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4'
);

async function main() {
  // Search for Ho Yun Tim Sum
  const { data, error } = await supabase
    .from('food_listings')
    .select('id, name, station_id')
    .ilike('name', '%ho yun%');

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('No listing found for Ho Yun Tim Sum');
    return;
  }

  console.log('Found:', data);

  // Delete the listing(s)
  for (const listing of data) {
    // Delete from listing_sources first
    await supabase.from('listing_sources').delete().eq('listing_id', listing.id);
    // Delete from listing_prices
    await supabase.from('listing_prices').delete().eq('listing_id', listing.id);
    // Delete the listing
    const { error: delError } = await supabase.from('food_listings').delete().eq('id', listing.id);
    if (delError) {
      console.log('Delete error:', delError.message);
    } else {
      console.log('Deleted:', listing.name);
    }
  }
}

main();
