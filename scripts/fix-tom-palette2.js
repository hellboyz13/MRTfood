const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bkzfrgrxfnqounyeqvvn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1Nzk5MzAsImV4cCI6MjA4MDE1NTkzMH0.wOYifcpHN4rxtg_gcDYPzzpAeXoOykBfP_jWLMMfdP4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
  // First find the listing
  const { data: listings } = await supabase
    .from('food_listings')
    .select('id, name, address')
    .ilike('name', '%Tom%Palette%');

  console.log('Found listings:', listings);

  if (listings && listings.length > 0) {
    // The CORRECT address for Tom's Palette Bugis is:
    const correctAddress = '51 Middle Road, #01-01 Boon Sing Building, Singapore 188959';

    for (const listing of listings) {
      const { error } = await supabase
        .from('food_listings')
        .update({ address: correctAddress })
        .eq('id', listing.id);

      if (error) {
        console.error(`Error updating ${listing.name}:`, error);
      } else {
        console.log(`Updated ${listing.name} to: ${correctAddress}`);
      }
    }
  }

  // Verify
  const { data: updated } = await supabase
    .from('food_listings')
    .select('id, name, address')
    .ilike('name', '%Tom%Palette%');

  console.log('\nVerified listings:', updated);
}

fix().catch(console.error);
