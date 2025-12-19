require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET = 'restaurant-photos';
const BASE_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}`;

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

async function updateDatabaseUrls() {
  console.log('Step 1: Updating database URLs to slug-based structure...\n');

  const { data: menuImages } = await supabase
    .from('menu_images')
    .select('id, display_order, food_listings!inner (name)');

  let updated = 0;

  for (const img of menuImages) {
    const slug = toSlug(img.food_listings.name);
    const isThumb = img.display_order === 0;
    const newPath = isThumb
      ? `listings/${slug}/thumbnail.jpg`
      : `listings/${slug}/menu/${img.display_order}.jpg`;
    const newUrl = `${BASE_URL}/${newPath}`;

    await supabase
      .from('menu_images')
      .update({ image_url: newUrl })
      .eq('id', img.id);

    updated++;
    if (updated % 100 === 0) process.stdout.write(`.${updated}`);
  }

  console.log(`\n\nUpdated ${updated} URLs to slug-based structure`);
}

async function reorganizePhysicalFiles() {
  console.log('\n\nStep 2: Reorganizing physical files...\n');

  const { data: menuImages } = await supabase
    .from('menu_images')
    .select('id, image_url, display_order, food_listings!inner (name)');

  let success = 0;
  let failed = 0;
  const processed = new Set();

  for (const img of menuImages) {
    const slug = toSlug(img.food_listings.name);
    const isThumb = img.display_order === 0;
    const newPath = isThumb
      ? `listings/${slug}/thumbnail.jpg`
      : `listings/${slug}/menu/${img.display_order}.jpg`;

    // Skip if already processed
    if (processed.has(newPath)) continue;
    processed.add(newPath);

    // Find old path - check all possible old locations
    const possibleOldPaths = [
      `stations/${img.image_url.split('/stations/')[1]}`, // Current stations path
      `listings/${img.food_listings.name.toLowerCase().replace(/\s+/g, '-')}/${isThumb ? 'thumbnail' : 'menu/' + img.display_order}.jpg`, // Old listing path
    ];

    let fileData = null;
    let oldPath = null;

    // Try to download from possible old locations
    for (const tryPath of possibleOldPaths) {
      if (!tryPath || tryPath.includes('undefined')) continue;

      const { data, error } = await supabase.storage
        .from(BUCKET)
        .download(tryPath);

      if (!error && data) {
        fileData = data;
        oldPath = tryPath;
        break;
      }
    }

    if (!fileData) {
      failed++;
      continue;
    }

    // Upload to new location
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(newPath, fileData, { upsert: true });

    if (uploadError) {
      failed++;
      continue;
    }

    // Delete old file
    if (oldPath && oldPath !== newPath) {
      await supabase.storage.from(BUCKET).remove([oldPath]);
    }

    success++;
    if (success % 50 === 0) process.stdout.write(`.${success}`);

    await new Promise(r => setTimeout(r, 50));
  }

  console.log(`\n\nPhysical files - Success: ${success}, Failed: ${failed}`);
}

async function updateMalls() {
  console.log('\n\nStep 3: Updating mall thumbnails...\n');

  const { data: malls } = await supabase
    .from('malls')
    .select('id, name, thumbnail_url')
    .not('thumbnail_url', 'is', null);

  let updated = 0;

  for (const mall of malls) {
    const slug = toSlug(mall.name);
    const newUrl = `${BASE_URL}/malls/${slug}/thumbnail.jpg`;

    await supabase
      .from('malls')
      .update({ thumbnail_url: newUrl })
      .eq('id', mall.id);

    updated++;
  }

  console.log(`Updated ${updated} mall URLs`);
}

async function run() {
  await updateDatabaseUrls();
  await reorganizePhysicalFiles();
  await updateMalls();

  console.log('\n\n=== Complete! ===');
  console.log('All URLs now use slug-based structure');
  console.log('Example: listings/holland-v-fried-bee-hoon/menu/1.jpg');
}

run();
