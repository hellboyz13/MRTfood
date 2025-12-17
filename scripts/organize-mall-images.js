require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET = 'restaurant-photos';
const BASE_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}`;
const CONCURRENCY = 10;

function toSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .replace(/^-+|-+$/g, '');
}

async function downloadFromUrl(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.arrayBuffer();
  } catch (err) {
    return null;
  }
}

async function processMall(mall) {
  const slug = toSlug(mall.name);
  const newPath = `malls/${slug}/thumbnail.jpg`;

  try {
    // Download from Google Places URL
    const imageData = await downloadFromUrl(mall.thumbnail_url);
    if (!imageData) return { success: false, type: 'mall', name: mall.name };

    // Upload to Supabase
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(newPath, imageData, {
        upsert: true,
        contentType: 'image/jpeg'
      });

    if (uploadError) {
      console.error(`  Mall upload error: ${mall.name} - ${uploadError.message}`);
      return { success: false, type: 'mall', name: mall.name };
    }

    // Update database
    const newUrl = `${BASE_URL}/${newPath}`;
    await supabase
      .from('malls')
      .update({ thumbnail_url: newUrl })
      .eq('id', mall.id);

    return { success: true, type: 'mall', name: mall.name };
  } catch (err) {
    console.error(`  Mall error: ${mall.name} - ${err.message}`);
    return { success: false, type: 'mall', name: mall.name };
  }
}

async function processOutlet(outlet, mallSlug) {
  const outletSlug = toSlug(outlet.name);
  const newPath = `malls/${mallSlug}/outlets/${outletSlug}.jpg`;

  try {
    // Download from Google Places URL
    const imageData = await downloadFromUrl(outlet.thumbnail_url);
    if (!imageData) return { success: false, type: 'outlet', name: outlet.name };

    // Upload to Supabase
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(newPath, imageData, {
        upsert: true,
        contentType: 'image/jpeg'
      });

    if (uploadError) {
      console.error(`  Outlet upload error: ${outlet.name} - ${uploadError.message}`);
      return { success: false, type: 'outlet', name: outlet.name };
    }

    // Update database
    const newUrl = `${BASE_URL}/${newPath}`;
    await supabase
      .from('mall_outlets')
      .update({ thumbnail_url: newUrl })
      .eq('id', outlet.id);

    return { success: true, type: 'outlet', name: outlet.name };
  } catch (err) {
    console.error(`  Outlet error: ${outlet.name} - ${err.message}`);
    return { success: false, type: 'outlet', name: outlet.name };
  }
}

async function main() {
  console.log('=== Mall Image Organization ===\n');

  // Get all malls with Google thumbnail URLs
  const { data: malls } = await supabase
    .from('malls')
    .select('id, name, thumbnail_url')
    .not('thumbnail_url', 'is', null)
    .like('thumbnail_url', '%places.googleapis.com%');

  console.log(`Found ${malls?.length || 0} malls with Google URLs\n`);

  // Get all outlets with Google thumbnail URLs
  const { data: outlets } = await supabase
    .from('mall_outlets')
    .select('id, name, mall_id, thumbnail_url')
    .not('thumbnail_url', 'is', null)
    .or('thumbnail_url.like.%places.googleapis.com%,thumbnail_url.like.%googleusercontent.com%');

  console.log(`Found ${outlets?.length || 0} outlets with Google URLs\n`);

  // Get mall id to name mapping
  const { data: allMalls } = await supabase.from('malls').select('id, name');
  const mallIdToName = {};
  allMalls?.forEach(m => mallIdToName[m.id] = m.name);

  let mallSuccess = 0, mallFailed = 0;
  let outletSuccess = 0, outletFailed = 0;

  // Process malls
  console.log('Processing malls...');
  for (let i = 0; i < (malls?.length || 0); i += CONCURRENCY) {
    const batch = malls.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(m => processMall(m)));

    results.forEach(r => {
      if (r.success) mallSuccess++;
      else mallFailed++;
    });

    const total = mallSuccess + mallFailed;
    if (total % 20 === 0 || i + CONCURRENCY >= malls.length) {
      console.log(`  Malls: ${total}/${malls.length} (${mallSuccess} success)`);
    }
  }

  // Process outlets
  console.log('\nProcessing outlets...');
  for (let i = 0; i < (outlets?.length || 0); i += CONCURRENCY) {
    const batch = outlets.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(o => {
      const mallName = mallIdToName[o.mall_id];
      const mallSlug = mallName ? toSlug(mallName) : o.mall_id;
      return processOutlet(o, mallSlug);
    }));

    results.forEach(r => {
      if (r.success) outletSuccess++;
      else outletFailed++;
    });

    const total = outletSuccess + outletFailed;
    if (total % 100 === 0 || i + CONCURRENCY >= outlets.length) {
      console.log(`  Outlets: ${total}/${outlets.length} (${outletSuccess} success)`);
    }
  }

  console.log('\n=== Complete ===');
  console.log(`Malls: ${mallSuccess} success, ${mallFailed} failed`);
  console.log(`Outlets: ${outletSuccess} success, ${outletFailed} failed`);
}

main().catch(console.error);
