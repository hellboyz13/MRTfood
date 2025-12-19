/**
 * Compare empty malls vs malls without thumbnails
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: malls } = await supabase.from('malls').select('id, name, thumbnail_url');
  const { data: outlets } = await supabase.from('mall_outlets').select('mall_id');

  // Count outlets per mall
  const outletCounts = {};
  outlets.forEach(o => {
    outletCounts[o.mall_id] = (outletCounts[o.mall_id] || 0) + 1;
  });

  // Categorize malls
  const emptyMalls = malls.filter(m => !outletCounts[m.id]); // 0 outlets
  const noThumbMalls = malls.filter(m => !m.thumbnail_url);  // no thumbnail

  // The 36 empty malls
  console.log('========================================');
  console.log('36 EMPTY MALLS (0 outlets)');
  console.log('========================================');
  emptyMalls.forEach(m => {
    const hasThumb = m.thumbnail_url ? 'HAS THUMB' : 'NO THUMB';
    console.log(`  ${hasThumb} - ${m.name}`);
  });

  // Check overlap
  const emptyWithThumb = emptyMalls.filter(m => m.thumbnail_url);
  const emptyNoThumb = emptyMalls.filter(m => !m.thumbnail_url);

  console.log('\n========================================');
  console.log('SUMMARY');
  console.log('========================================');
  console.log(`Empty malls (0 outlets): ${emptyMalls.length}`);
  console.log(`  - With thumbnail: ${emptyWithThumb.length}`);
  console.log(`  - Without thumbnail: ${emptyNoThumb.length}`);
  console.log('');
  console.log(`Total malls without thumbnail: ${noThumbMalls.length}`);

  if (emptyWithThumb.length > 0) {
    console.log('\n========================================');
    console.log('EMPTY MALLS THAT ALREADY HAVE THUMBNAILS');
    console.log('========================================');
    emptyWithThumb.forEach(m => console.log(`  - ${m.name}`));
  }
}

main().catch(console.error);
