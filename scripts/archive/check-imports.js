const { createClient } = require('@supabase/supabase-js');
const { config } = require('dotenv');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function check() {
  const malls = ['the-star-vista', 'the-seletar-mall', 'thomson-plaza', 'the-woodleigh-mall'];

  for (const mallId of malls) {
    const { data } = await supabase
      .from('mall_outlets')
      .select('name, level, thumbnail_url, opening_hours')
      .eq('mall_id', mallId);

    const withThumb = data?.filter(d => d.thumbnail_url).length || 0;
    const withHours = data?.filter(d => d.opening_hours).length || 0;

    console.log(`\n=== ${mallId} ===`);
    console.log(`Total: ${data?.length || 0}`);
    console.log(`With thumbnail: ${withThumb}`);
    console.log(`With opening hours: ${withHours}`);

    // Show a few samples
    console.log('\nSamples:');
    data?.slice(0, 3).forEach(d => {
      console.log(`  ${d.name}: thumb=${d.thumbnail_url ? 'YES' : 'NO'}, hours=${d.opening_hours ? 'YES' : 'NO'}`);
    });
  }
}
check();
