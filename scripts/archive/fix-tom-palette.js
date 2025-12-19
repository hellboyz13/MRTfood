const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bkzfrgrxfnqounyeqvvn.supabase.co';
// Use service key for write access (bypasses RLS)
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
  // The CORRECT address for Tom's Palette Bugis is:
  // 51 Middle Road, #01-01 Boon Sing Building, Singapore 188959
  const correctAddress = '51 Middle Road, #01-01 Boon Sing Building, Singapore 188959';

  const { data, error } = await supabase
    .from('food_listings')
    .update({ address: correctAddress })
    .ilike('name', '%Tom%Palette%')
    .select('id, name, address');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Fixed Tom\'s Palette address:');
  data.forEach(d => {
    console.log(`  ${d.name}: ${d.address}`);
  });
}

fix().catch(console.error);
