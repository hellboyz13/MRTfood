/**
 * Check mall thumbnails status
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: malls } = await supabase.from('malls').select('id, name, thumbnail_url');

  const withThumb = malls.filter(m => m.thumbnail_url);
  const withoutThumb = malls.filter(m => !m.thumbnail_url);
  const googleThumb = malls.filter(m => m.thumbnail_url && m.thumbnail_url.includes('googleapis.com'));
  const supabaseThumb = malls.filter(m => m.thumbnail_url && m.thumbnail_url.includes('supabase.co'));

  console.log('========================================');
  console.log('MALL THUMBNAILS STATUS');
  console.log('========================================');
  console.log(`Total malls: ${malls.length}`);
  console.log(`With thumbnail: ${withThumb.length}`);
  console.log(`  - Supabase URLs: ${supabaseThumb.length}`);
  console.log(`  - Google API URLs: ${googleThumb.length}`);
  console.log(`Without thumbnail: ${withoutThumb.length}`);

  if (withoutThumb.length > 0) {
    console.log('\n========================================');
    console.log('MALLS WITHOUT THUMBNAILS');
    console.log('========================================');
    withoutThumb.forEach(m => console.log(`  - ${m.name}`));

    console.log('\n========================================');
    console.log('COST ESTIMATE');
    console.log('========================================');
    // 1 Place Details call per mall for photo
    const costPerMall = 0.017;
    const totalCost = withoutThumb.length * costPerMall;
    console.log(`Malls needing thumbnails: ${withoutThumb.length}`);
    console.log(`Cost per mall (Place Details): $0.017`);
    console.log(`TOTAL: $${totalCost.toFixed(2)}`);
    console.log('\nStorage: FREE (Supabase 1GB included)');
  }
}

main().catch(console.error);
