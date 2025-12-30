const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function run() {
  const { data } = await supabase.from('mall_outlets')
    .select('name, opening_hours')
    .eq('category', 'hawker stall')
    .not('opening_hours', 'is', null);

  const weird = data.filter(d => {
    const h = d.opening_hours;
    if (typeof h !== 'string') return false;
    // Check for trailing garbage
    return h.match(/\s+\d{2,3}$/) ||
           h.match(/[A-Z][a-z]+'s?\s*$/) ||
           h.match(/\s+M\+\s*$/) ||
           (h.match(/\s+[A-Z][a-z]+\s*$/) && h.length > 50);
  });

  if (weird.length === 0) {
    console.log('All opening hours look clean!');
  } else {
    console.log('Still have', weird.length, 'issues:');
    weird.forEach(w => console.log(' -', w.name + ':', w.opening_hours));
  }
}

run();
