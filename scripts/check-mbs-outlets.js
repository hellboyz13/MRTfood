const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data: outlets, error } = await supabase
    .from('mall_outlets')
    .select('*')
    .eq('mall_id', 'shoppes-at-marina-bay-sands')
    .order('name');

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  if (!outlets || outlets.length === 0) {
    console.log('No outlets found for MBS');
    return;
  }

  console.log('=== MBS Outlets in Database ===');
  console.log('Total:', outlets.length);
  console.log('With hours:', outlets.filter(o => o.opening_hours).length);
  console.log('');
  outlets.forEach(o => {
    const hasHours = o.opening_hours ? 'Y' : 'N';
    console.log(`${hasHours} | ${o.name}`);
  });
}

check();
