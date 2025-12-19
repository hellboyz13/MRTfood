require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET = 'restaurant-photos';

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

async function moveFiles() {
  console.log('Moving files from stations/ to listings/...\n');

  // Get all stations
  const { data: stations } = await supabase.storage
    .from(BUCKET)
    .list('stations', { limit: 1000 });

  let success = 0;
  let failed = 0;

  for (const station of stations) {
    // Get all restaurants in this station
    const { data: restaurants } = await supabase.storage
      .from(BUCKET)
      .list(`stations/${station.name}`, { limit: 1000 });

    if (!restaurants) continue;

    for (const restaurant of restaurants) {
      const restaurantSlug = toSlug(restaurant.name);

      // Get all files in this restaurant folder
      const { data: files } = await supabase.storage
        .from(BUCKET)
        .list(`stations/${station.name}/${restaurant.name}`, { limit: 100 });

      if (!files) continue;

      for (const file of files) {
        const oldPath = `stations/${station.name}/${restaurant.name}/${file.name}`;

        // Determine new path
        let newPath;
        if (file.name === 'thumbnail.jpg') {
          newPath = `listings/${restaurantSlug}/thumbnail.jpg`;
        } else if (file.name.startsWith('menu-')) {
          const num = file.name.replace('menu-', '').replace('.jpg', '');
          newPath = `listings/${restaurantSlug}/menu/${num}.jpg`;
        } else {
          continue; // Skip unknown files
        }

        try {
          // Download file
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
            console.error(`Upload failed: ${newPath}`);
            failed++;
            continue;
          }

          // Delete old file
          await supabase.storage.from(BUCKET).remove([oldPath]);

          success++;
          if (success % 100 === 0) {
            process.stdout.write(`.${success}`);
          }

          await new Promise(r => setTimeout(r, 50));
        } catch (err) {
          console.error(`Error moving ${oldPath}: ${err.message}`);
          failed++;
        }
      }
    }
  }

  console.log(`\n\nSuccess: ${success}, Failed: ${failed}`);
}

moveFiles();
