const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function run() {
  const { data } = await supabase.from('mall_outlets')
    .select('name, mall_id, opening_hours')
    .eq('category', 'hawker stall');

  const total = data.length;
  const withHours = data.filter(d => d.opening_hours && d.opening_hours.trim().length > 0).length;
  const withoutHours = data.filter(d => !d.opening_hours || d.opening_hours.trim().length === 0);

  console.log('Total hawker stalls:', total);
  console.log('With opening hours:', withHours, '(' + (withHours / total * 100).toFixed(1) + '%)');
  console.log('Without opening hours:', withoutHours.length);
  console.log('\nStalls WITHOUT opening hours:');
  withoutHours.forEach(s => console.log('  - ' + s.name + ' (' + s.mall_id + ')'));
}

run();
