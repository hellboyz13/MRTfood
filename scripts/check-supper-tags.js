require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  // Check listings with Supper tag
  const { data: supperListings } = await supabase
    .from('food_listings')
    .select('name, station_id, tags, opening_hours')
    .contains('tags', ['Supper'])
    .limit(30);

  console.log('=== Listings with Supper tag ===');
  console.log('Total:', supperListings?.length);
  supperListings?.forEach(l => {
    console.log(`\n- ${l.name} @ ${l.station_id}`);
    console.log(`  Tags: ${JSON.stringify(l.tags)}`);
    if (l.opening_hours) {
      const hours = typeof l.opening_hours === 'string' ? l.opening_hours : JSON.stringify(l.opening_hours);
      console.log(`  Hours: ${hours.substring(0, 100)}...`);
    }
  });

  // Check mall outlets matching supper query
  const { data: mallOutlets } = await supabase
    .from('mall_outlets')
    .select('name, category')
    .or('category.ilike.%supper%,category.ilike.%24%,category.ilike.%late%night%')
    .limit(15);

  console.log('\n\n=== Mall outlets matching supper categories ===');
  console.log('Total:', mallOutlets?.length);
  mallOutlets?.forEach(o => console.log(`- ${o.name} [${o.category}]`));
}

check();
