require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET = 'restaurant-photos';
const BASE_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}`;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Sanitize folder name - remove special chars, replace spaces with hyphens
function sanitizeName(name) {
  return name
    .replace(/[^\w\s-]/g, '') // Remove special chars except word chars, spaces, hyphens
    .replace(/\s+/g, '-')      // Replace spaces with hyphens
    .replace(/-+/g, '-')       // Replace multiple hyphens with single
    .trim();
}

async function reorganizeToGeographical() {
  console.log('Reorganizing to geographical hierarchy...\n');

  // Get all menu images with their listing, mall, and station info
  const { data: menuImages, error } = await supabase
    .from('menu_images')
    .select(`
      id,
      listing_id,
      image_url,
      display_order,
      food_listings (
        id,
        name,
        mall_id,
        malls (
          id,
          name,
          nearest_station
        )
      )
    `)
    .order('listing_id');

  if (error) {
    console.error('Error fetching data:', error);
    return;
  }

  console.log(`Found ${menuImages.length} images to reorganize\n`);

  let success = 0;
  let failed = 0;

  for (const img of menuImages) {
    try {
      const listing = img.food_listings;
      if (!listing) {
        console.log(`Skipping - no listing for image ${img.id}`);
        failed++;
        continue;
      }

      const mall = listing.malls;
      const listingName = sanitizeName(listing.name);

      // Determine old path (current structure)
      const oldPathMatch = img.image_url.match(/restaurant-photos\/(.+)$/);
      if (!oldPathMatch) {
        console.log(`Skipping - non-storage URL: ${img.image_url.substring(0, 50)}`);
        failed++;
        continue;
      }
      const oldPath = oldPathMatch[1];

      // Determine new path based on whether it's attached to a mall
      let newPath;
      const isThumb = img.display_order === 0;
      const fileName = isThumb ? 'thumbnail.jpg' : `menu-${img.display_order}.jpg`;

      if (mall) {
        // Outlet attached to mall: stations/[station]/[mall]/[outlet]/[file]
        const stationName = sanitizeName(mall.nearest_station || 'Unknown-Station');
        const mallName = sanitizeName(mall.name);
        newPath = `stations/${stationName}/${mallName}/${listingName}/${fileName}`;
      } else {
        // Standalone listing: listings/[listing-name]/[file]
        newPath = `listings/${listingName}/${fileName}`;
      }

      // Download from old path
      const { data: fileData, error: downloadError } = await supabase.storage
        .from(BUCKET)
        .download(oldPath);

      if (downloadError) {
        console.log(`Failed to download ${oldPath}: ${downloadError.message}`);
        failed++;
        continue;
      }

      // Upload to new path
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(newPath, fileData, { upsert: true });

      if (uploadError) {
        console.log(`Failed to upload ${newPath}: ${uploadError.message}`);
        failed++;
        continue;
      }

      // Update database URL
      const newUrl = `${BASE_URL}/${newPath}`;
      const { error: updateError } = await supabase
        .from('menu_images')
        .update({ image_url: newUrl })
        .eq('id', img.id);

      if (updateError) {
        console.log(`Failed to update DB: ${updateError.message}`);
        failed++;
        continue;
      }

      // Delete old file
      await supabase.storage.from(BUCKET).remove([oldPath]);

      success++;
      if (success % 50 === 0) {
        process.stdout.write(`.${success}`);
      }

      await delay(100);
    } catch (err) {
      console.error(`Error processing image ${img.id}:`, err.message);
      failed++;
    }
  }

  console.log(`\n\n--- Summary ---`);
  console.log(`Success: ${success}`);
  console.log(`Failed: ${failed}`);
  console.log(`\nNew structure:`);
  console.log(`  stations/[Station]/[Mall]/[Outlet]/thumbnail.jpg + menu-1.jpg, menu-2.jpg, ...`);
  console.log(`  listings/[Listing-Name]/thumbnail.jpg + menu-1.jpg, menu-2.jpg, ...`);
}

// Reorganize mall thumbnails
async function reorganizeMallThumbnails() {
  console.log('\n\n=== Reorganizing Mall Thumbnails ===\n');

  const { data: malls, error } = await supabase
    .from('malls')
    .select('id, name, nearest_station, thumbnail_url')
    .not('thumbnail_url', 'is', null);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${malls.length} malls with thumbnails\n`);

  let success = 0;
  let failed = 0;

  for (const mall of malls) {
    try {
      // Mall thumbnails are currently Google URLs, we'll download and store them
      const stationName = sanitizeName(mall.nearest_station || 'Unknown-Station');
      const mallName = sanitizeName(mall.name);
      const newPath = `stations/${stationName}/${mallName}/mall-thumbnail.jpg`;

      // Download from Google URL
      const response = await fetch(mall.thumbnail_url);
      if (!response.ok) {
        console.log(`Failed to fetch ${mall.name}: ${response.statusText}`);
        failed++;
        continue;
      }

      const blob = await response.blob();

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(newPath, blob, {
          upsert: true,
          contentType: 'image/jpeg'
        });

      if (uploadError) {
        console.log(`Failed to upload ${mall.name}: ${uploadError.message}`);
        failed++;
        continue;
      }

      // Update database URL
      const newUrl = `${BASE_URL}/${newPath}`;
      const { error: updateError } = await supabase
        .from('malls')
        .update({ thumbnail_url: newUrl })
        .eq('id', mall.id);

      if (updateError) {
        console.log(`Failed to update ${mall.name}: ${updateError.message}`);
        failed++;
        continue;
      }

      success++;
      process.stdout.write('.');

      await delay(100);
    } catch (err) {
      console.error(`Error processing ${mall.name}:`, err.message);
      failed++;
    }
  }

  console.log(`\n\nMall thumbnails - Success: ${success}, Failed: ${failed}`);
}

async function run() {
  await reorganizeToGeographical();
  await reorganizeMallThumbnails();
}

run();
