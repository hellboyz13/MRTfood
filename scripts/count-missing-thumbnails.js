const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'NOT SET');
console.log('KEY:', process.env.SUPABASE_SERVICE_KEY ? 'set' : 'NOT SET');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function run() {
  // Get all malls
  const { data: allMalls } = await supabase
    .from('malls')
    .select('id, name');

  console.log('Total malls:', (allMalls || []).length);

  // Filter hawker centres and food courts by name/id patterns
  const hawkerPatterns = [
    'food centre', 'food-centre', 'hawker', 'food village', 'food-village',
    'food court', 'food-court', 'kopitiam', 'market', 'lau pa sat',
    'gluttons bay', 'timbre'
  ];

  const malls = (allMalls || []).filter(m => {
    const name = m.name.toLowerCase();
    const id = m.id.toLowerCase();
    return hawkerPatterns.some(p => name.includes(p) || id.includes(p));
  });

  console.log('Hawker/food courts found:', malls.length);

  let total = 0;
  let missing = 0;
  const breakdown = [];

  for (const mall of malls || []) {
    const { data: outlets } = await supabase
      .from('mall_outlets')
      .select('id, name, thumbnail_url')
      .eq('mall_id', mall.id);

    if (!outlets || outlets.length === 0) continue;

    const noThumb = outlets.filter(o => !o.thumbnail_url);
    total += outlets.length;
    missing += noThumb.length;

    if (noThumb.length > 0) {
      breakdown.push({
        name: mall.name,
        total: outlets.length,
        missing: noThumb.length
      });
    }
  }

  console.log('='.repeat(50));
  console.log('HAWKER/FOOD COURT THUMBNAIL STATUS');
  console.log('='.repeat(50));
  console.log(`Total stalls: ${total}`);
  console.log(`Missing thumbnails: ${missing}`);
  console.log(`Have thumbnails: ${total - missing}`);
  console.log(`Coverage: ${((total - missing) / total * 100).toFixed(1)}%`);

  console.log('\n--- Breakdown by location ---');
  breakdown.sort((a, b) => b.missing - a.missing);
  for (const b of breakdown) {
    console.log(`${b.name}: ${b.missing}/${b.total} missing`);
  }
}

run().catch(console.error);
