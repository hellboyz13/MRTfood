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

async function reorganize() {
  console.log('=== Final Reorganization ===\n');

  // Get listing ID to name mapping
  const { data: foodListings } = await supabase
    .from('food_listings')
    .select('id, name');

  const idToName = {};
  foodListings.forEach(l => {
    idToName[l.id] = l.name;
  });

  console.log(`Loaded ${Object.keys(idToName).length} listing names\n`);

  // Get all files at root level
  const { data: rootFiles } = await supabase.storage
    .from(BUCKET)
    .list('', { limit: 5000 });

  // Filter to UUID files
  const uuidFiles = rootFiles.filter(f => f.name.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/));
  console.log(`Found ${uuidFiles.length} UUID-based files at root\n`);

  let success = 0;
  let failed = 0;

  for (const file of uuidFiles) {
    // Parse filename: uuid_number.jpg or uuid.jpg
    const match = file.name.match(/^([0-9a-f-]+?)(?:_(\d+))?\.jpg$/);
    if (!match) {
      failed++;
      continue;
    }

    const uuid = match[1];
    const displayOrder = match[2] ? parseInt(match[2]) : 0;
    const listingName = idToName[uuid];

    if (!listingName) {
      failed++;
      continue;
    }

    const slug = toSlug(listingName);
    const oldPath = file.name;
    const newPath = displayOrder === 0
      ? `listings/${slug}/thumbnail.jpg`
      : `listings/${slug}/menu/${displayOrder}.jpg`;

    try {
      // Download
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
        console.error(`Upload error: ${newPath} - ${uploadError.message}`);
        failed++;
        continue;
      }

      // Update database
      const newUrl = `${BASE_URL}/${newPath}`;
      await supabase
        .from('menu_images')
        .update({ image_url: newUrl })
        .eq('listing_id', uuid)
        .eq('display_order', displayOrder);

      // Delete old file
      await supabase.storage.from(BUCKET).remove([oldPath]);

      success++;
      if (success % 100 === 0) {
        process.stdout.write(`.${success}`);
      }

      await new Promise(r => setTimeout(r, 25));
    } catch (err) {
      console.error(`Error: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n\n=== Complete ===`);
  console.log(`Success: ${success}`);
  console.log(`Failed: ${failed}`);
}

reorganize();
