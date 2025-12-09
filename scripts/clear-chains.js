const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4'
);

async function clearChains() {
  console.log('=== CLEARING CHAIN TABLES ===\n');

  // Delete chain_outlets first (foreign key to chain_brands)
  console.log('Deleting chain_outlets...');
  const { error: outletsError } = await supabase
    .from('chain_outlets')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (outletsError) {
    console.log('Error:', outletsError.message);
  } else {
    console.log('chain_outlets cleared');
  }

  // Delete chain_brands
  console.log('Deleting chain_brands...');
  const { error: brandsError } = await supabase
    .from('chain_brands')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (brandsError) {
    console.log('Error:', brandsError.message);
  } else {
    console.log('chain_brands cleared');
  }

  // Verify
  const { count: outletsCount } = await supabase.from('chain_outlets').select('*', { count: 'exact', head: true });
  const { count: brandsCount } = await supabase.from('chain_brands').select('*', { count: 'exact', head: true });

  console.log('\n=== AFTER CLEAR ===');
  console.log('chain_outlets:', outletsCount);
  console.log('chain_brands:', brandsCount);
}

clearChains();
