require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET = 'restaurant-photos';
const BASE_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}`;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Convert to human-readable slug
function toSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^\w\s-]/g, '')         // Remove special chars
    .replace(/\s+/g, '-')             // Replace spaces with hyphens
    .replace(/-+/g, '-')              // Replace multiple hyphens
    .trim()
    .replace(/^-+|-+$/g, '');         // Remove leading/trailing hyphens
}

async function reorganizeListings() {
  console.log('\n=== Reorganizing Food Listings ===\n');

  const { data: menuImages, error } = await supabase
    .from('menu_images')
    .select(`
      id,
      listing_id,
      image_url,
      display_order,
      food_listings!inner (
        name
      )
    `)
    .order('listing_id');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${menuImages.length} images\n`);

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (const img of menuImages) {
    try {
      const listing = img.food_listings;
      const slug = toSlug(listing.name);

      // Determine new path
      const isThumb = img.display_order === 0;
      const newPath = isThumb
        ? `listings/${slug}/thumbnail.jpg`
        : `listings/${slug}/menu/${img.display_order}.jpg`;

      const newUrl = `${BASE_URL}/${newPath}`;

      // Skip if already correct
      if (img.image_url === newUrl) {
        skipped++;
        continue;
      }

      // Extract old path from current URL
      const oldPathMatch = img.image_url.match(/restaurant-photos\/(.+)$/);
      if (!oldPathMatch) {
        console.log(`Skip non-storage URL: ${img.image_url.substring(0, 50)}`);
        skipped++;
        continue;
      }
      const oldPath = oldPathMatch[1];

      // Download from old location
      const { data: fileData, error: downloadError } = await supabase.storage
        .from(BUCKET)
        .download(oldPath);

      if (downloadError) {
        failed++;
        continue;
      }

      // Upload to new location
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(newPath, fileData, { upsert: true });

      if (uploadError) {
        console.error(`Upload failed for ${newPath}: ${uploadError.message}`);
        failed++;
        continue;
      }

      // Update database URL
      const { error: updateError } = await supabase
        .from('menu_images')
        .update({ image_url: newUrl })
        .eq('id', img.id);

      if (updateError) {
        console.error(`DB update failed: ${updateError.message}`);
        failed++;
        continue;
      }

      // Delete old file
      await supabase.storage.from(BUCKET).remove([oldPath]);

      success++;
      if (success % 50 === 0) {
        process.stdout.write(`.${success}`);
      }

      await delay(50);
    } catch (err) {
      console.error(`Error: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n\nListings - Success: ${success}, Failed: ${failed}, Skipped: ${skipped}`);
}

async function reorganizeMalls() {
  console.log('\n\n=== Reorganizing Malls ===\n');

  const { data: malls, error } = await supabase
    .from('malls')
    .select('id, name, thumbnail_url')
    .not('thumbnail_url', 'is', null);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${malls.length} malls\n`);

  let success = 0;
  let failed = 0;

  for (const mall of malls) {
    try {
      const slug = toSlug(mall.name);
      const newPath = `malls/${slug}/thumbnail.jpg`;
      const newUrl = `${BASE_URL}/${newPath}`;

      // Skip if already correct
      if (mall.thumbnail_url === newUrl) {
        continue;
      }

      let blob;

      // Check if external URL (Google) or existing Supabase storage
      if (mall.thumbnail_url.startsWith('http') && !mall.thumbnail_url.includes('supabase')) {
        // Download from external URL
        const response = await fetch(mall.thumbnail_url);
        if (!response.ok) {
          failed++;
          continue;
        }
        blob = await response.blob();
      } else if (mall.thumbnail_url.includes('supabase')) {
        // Move from old Supabase location
        const oldPathMatch = mall.thumbnail_url.match(/restaurant-photos\/(.+)$/);
        if (!oldPathMatch) {
          failed++;
          continue;
        }
        const { data, error } = await supabase.storage
          .from(BUCKET)
          .download(oldPathMatch[1]);
        if (error) {
          failed++;
          continue;
        }
        blob = data;
      } else {
        failed++;
        continue;
      }

      // Upload to new location
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(newPath, blob, {
          upsert: true,
          contentType: 'image/jpeg'
        });

      if (uploadError) {
        console.error(`Upload failed for ${mall.name}: ${uploadError.message}`);
        failed++;
        continue;
      }

      // Update database
      const { error: updateError } = await supabase
        .from('malls')
        .update({ thumbnail_url: newUrl })
        .eq('id', mall.id);

      if (updateError) {
        console.error(`DB update failed for ${mall.name}: ${updateError.message}`);
        failed++;
        continue;
      }

      success++;
      process.stdout.write('.');
      await delay(100);
    } catch (err) {
      console.error(`Error for ${mall.name}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n\nMalls - Success: ${success}, Failed: ${failed}`);
}

async function run() {
  await reorganizeListings();
  await reorganizeMalls();

  console.log('\n\n=== Complete! ===');
  console.log('Structure:');
  console.log('  listings/[restaurant-name]/thumbnail.jpg + menu/1.jpg, 2.jpg...');
  console.log('  malls/[mall-name]/thumbnail.jpg');
}

run();
