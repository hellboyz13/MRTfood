const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
config({ path: '.env.local', override: true });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkSources() {
  // Get listings without source
  const { data: noSource } = await supabase
    .from('food_listings')
    .select('id, name, station_id')
    .is('source_id', null);

  console.log('=== LISTINGS WITHOUT SOURCE ===');
  if (noSource && noSource.length > 0) {
    noSource.forEach(l => console.log(l.name + ' (' + l.station_id + ')'));
    console.log('Total: ' + noSource.length);
  } else {
    console.log('None - all listings have sources!');
  }

  // Get source distribution
  const { data: listings } = await supabase
    .from('food_listings')
    .select('source_id');

  const sourceCounts = {};
  listings.forEach(l => {
    const src = l.source_id || 'null';
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;
  });

  console.log('\n=== SOURCE DISTRIBUTION ===');
  Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([src, count]) => console.log(src + ': ' + count));
}

checkSources();
