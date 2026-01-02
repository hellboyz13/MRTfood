// Remove final TRUE duplicate mall outlets (exact matches)
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const trueDuplicates = [
  // Bedok
  { mall: 'Ma La Xiang Guo', station: 'bedok' },
  { mall: 'Xue Hua Fei Cold & Hot Drinks', station: 'bedok' },
  { mall: 'Ming Hui Nasi Lemak', station: 'bedok' },
  // Maxwell
  { mall: 'Shang Hai Fried Xiao Long Bao', station: 'maxwell' },
];

async function removeDuplicates() {
  console.log('Removing final TRUE duplicate mall outlets...\n');

  const { data: outlets } = await supabase
    .from('mall_outlets')
    .select(`id, name, malls!inner (station_id, name)`);

  const toDelete = [];

  for (const dup of trueDuplicates) {
    const match = outlets.find(o =>
      o.name === dup.mall &&
      o.malls?.station_id === dup.station
    );

    if (match) {
      toDelete.push({ id: match.id, name: match.name, mall: match.malls?.name });
      console.log(`✓ Found: "${match.name}" @ ${match.malls?.name}`);
    } else {
      console.log(`✗ Not found: "${dup.mall}" at ${dup.station}`);
    }
  }

  if (toDelete.length > 0) {
    console.log(`\nDeleting ${toDelete.length} mall outlets...`);

    const { error } = await supabase
      .from('mall_outlets')
      .delete()
      .in('id', toDelete.map(d => d.id));

    if (error) {
      console.error('Error:', error);
    } else {
      console.log(`✅ Successfully deleted ${toDelete.length} duplicate mall outlets`);
    }
  }
}

removeDuplicates().catch(console.error);
