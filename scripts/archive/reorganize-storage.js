/**
 * Reorganize Supabase Storage into hierarchical folders
 *
 * New structure:
 * storage/
 * ├── listings/
 * │   ├── [listing-id]/
 * │   │   ├── thumbnail.jpg
 * │   │   └── menu/
 * │   │       ├── 1.jpg, 2.jpg, ...
 * │
 * ├── malls/
 * │   ├── [mall-id]/
 * │   │   ├── thumbnail.jpg
 * │   │   └── outlets/
 * │   │       ├── [outlet-id].jpg
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET = 'restaurant-photos';
const BASE_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}`;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Download file from old location
async function downloadFile(oldPath) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(oldPath);

  if (error) throw error;
  return data;
}

// Upload file to new location
async function uploadFile(newPath, fileData) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(newPath, fileData, { upsert: true });

  if (error) throw error;
  return `${BASE_URL}/${newPath}`;
}

// Move a file (copy to new location, update DB, then delete old)
async function moveFile(oldPath, newPath) {
  try {
    const fileData = await downloadFile(oldPath);
    await uploadFile(newPath, fileData);
    return true;
  } catch (err) {
    console.error(`  Failed to move ${oldPath}: ${err.message}`);
    return false;
  }
}

// Delete old file
async function deleteFile(oldPath) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([oldPath]);

  if (error) {
    console.error(`  Failed to delete ${oldPath}: ${error.message}`);
  }
}

async function reorganizeListingPhotos() {
  console.log('\n=== Reorganizing Listing Photos ===\n');

  // Get all menu_images with their listing info
  const { data: menuImages, error } = await supabase
    .from('menu_images')
    .select('id, listing_id, image_url, display_order')
    .order('listing_id')
    .order('display_order');

  if (error) {
    console.error('Error fetching menu_images:', error.message);
    return;
  }

  console.log(`Found ${menuImages.length} menu images to reorganize\n`);

  let success = 0;
  let failed = 0;
  let skipped = 0;
  let currentListingId = null;

  for (const img of menuImages) {
    // Extract old filename from URL
    const urlMatch = img.image_url.match(/restaurant-photos\/(.+)$/);
    if (!urlMatch) {
      console.log(`Skipping non-storage URL: ${img.image_url.substring(0, 50)}`);
      skipped++;
      continue;
    }

    const oldPath = urlMatch[1];

    // Determine new path based on display_order
    // display_order 0 = thumbnail, 1-4 = menu photos
    const isThumb = img.display_order === 0;
    const newPath = isThumb
      ? `listings/${img.listing_id}/thumbnail.jpg`
      : `listings/${img.listing_id}/menu/${img.display_order}.jpg`;

    // Log progress for new listing
    if (currentListingId !== img.listing_id) {
      currentListingId = img.listing_id;
      process.stdout.write(`\nProcessing listing: ${img.listing_id.substring(0, 8)}... `);
    }

    // Move the file
    const moved = await moveFile(oldPath, newPath);

    if (moved) {
      // Update the database URL
      const newUrl = `${BASE_URL}/${newPath}`;
      const { error: updateError } = await supabase
        .from('menu_images')
        .update({ image_url: newUrl })
        .eq('id', img.id);

      if (updateError) {
        console.error(`DB update failed: ${updateError.message}`);
        failed++;
      } else {
        success++;
        process.stdout.write('.');
      }
    } else {
      failed++;
    }

    // Rate limit
    await delay(100);
  }

  console.log(`\n\n--- Listing Photos Summary ---`);
  console.log(`Success: ${success}`);
  console.log(`Failed: ${failed}`);
  console.log(`Skipped: ${skipped}`);

  return { success, failed, skipped };
}

async function cleanupOldFiles() {
  console.log('\n=== Cleaning Up Old Files ===\n');

  // List all files in root of bucket (old flat structure)
  let allFiles = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data: files } = await supabase.storage
      .from(BUCKET)
      .list('', { limit, offset });

    if (!files || files.length === 0) break;

    // Only get files in root (not in folders)
    const rootFiles = files.filter(f => !f.name.includes('/') && f.name.endsWith('.jpg'));
    allFiles = allFiles.concat(rootFiles);

    offset += limit;
    if (files.length < limit) break;
  }

  console.log(`Found ${allFiles.length} old files to clean up`);

  // Delete in batches
  const batchSize = 100;
  for (let i = 0; i < allFiles.length; i += batchSize) {
    const batch = allFiles.slice(i, i + batchSize);
    const paths = batch.map(f => f.name);

    const { error } = await supabase.storage
      .from(BUCKET)
      .remove(paths);

    if (error) {
      console.error(`Failed to delete batch: ${error.message}`);
    } else {
      console.log(`Deleted ${Math.min(i + batchSize, allFiles.length)}/${allFiles.length}`);
    }

    await delay(500);
  }

  console.log('Cleanup complete');
}

async function verifyReorganization() {
  console.log('\n=== Verifying Reorganization ===\n');

  // Check a few menu_images URLs
  const { data: samples } = await supabase
    .from('menu_images')
    .select('listing_id, image_url')
    .limit(5);

  console.log('Sample new URLs:');
  samples?.forEach(s => {
    console.log(`  ${s.listing_id.substring(0, 8)}: ${s.image_url.substring(s.image_url.lastIndexOf('/') - 20)}`);
  });

  // List new folder structure
  const { data: folders } = await supabase.storage
    .from(BUCKET)
    .list('listings', { limit: 5 });

  console.log('\nNew folder structure (first 5):');
  folders?.forEach(f => console.log(`  listings/${f.name}/`));
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  switch (command) {
    case 'reorganize':
      await reorganizeListingPhotos();
      await verifyReorganization();
      break;

    case 'cleanup':
      await cleanupOldFiles();
      break;

    case 'verify':
      await verifyReorganization();
      break;

    case 'all':
      await reorganizeListingPhotos();
      await cleanupOldFiles();
      await verifyReorganization();
      break;

    default:
      console.log(`
Usage: node reorganize-storage.js <command>

Commands:
  reorganize  - Move files to new hierarchical structure
  cleanup     - Delete old files from root
  verify      - Check the new structure
  all         - Run reorganize + cleanup + verify

Steps:
1. Run 'reorganize' first to move files
2. Verify your app works correctly
3. Run 'cleanup' to delete old files
      `);
  }
}

main().catch(console.error);
