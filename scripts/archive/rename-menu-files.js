require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET = 'restaurant-photos';
const BASE_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}`;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function renameFiles() {
  console.log('Renaming files to descriptive names...\n');

  const { data: menuImages, error } = await supabase
    .from('menu_images')
    .select('id, listing_id, image_url, display_order')
    .order('listing_id');

  if (error) {
    console.error('Error:', error);
    return;
  }

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (const img of menuImages) {
    const isThumb = img.display_order === 0;

    // Old path with numbers
    const oldPath = isThumb
      ? `listings/${img.listing_id}/thumbnail.jpg`
      : `listings/${img.listing_id}/menu/${img.display_order}.jpg`;

    // New path with descriptive names
    const newPath = isThumb
      ? `listings/${img.listing_id}/thumbnail.jpg`
      : `listings/${img.listing_id}/menu/menu-${img.display_order}.jpg`;

    // Skip if already has descriptive name or is thumbnail
    if (isThumb || img.image_url.includes('menu-')) {
      skipped++;
      continue;
    }

    try {
      // Download from old path
      const { data: fileData, error: downloadError } = await supabase.storage
        .from(BUCKET)
        .download(oldPath);

      if (downloadError) throw downloadError;

      // Upload to new path
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(newPath, fileData, { upsert: true });

      if (uploadError) throw uploadError;

      // Update database URL
      const newUrl = `${BASE_URL}/${newPath}`;
      const { error: updateError } = await supabase
        .from('menu_images')
        .update({ image_url: newUrl })
        .eq('id', img.id);

      if (updateError) throw updateError;

      // Delete old file
      await supabase.storage.from(BUCKET).remove([oldPath]);

      success++;
      if (success % 100 === 0) process.stdout.write(`.${success}`);

      await delay(50);
    } catch (err) {
      console.error(`Failed to rename ${oldPath}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n\nRenamed ${success} files successfully`);
  console.log(`Failed: ${failed}`);
  console.log(`Skipped: ${skipped}`);
}

renameFiles();
