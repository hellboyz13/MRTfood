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

async function convertUuidToSlug() {
  console.log('Converting UUID folders to slug-based names...\n');

  // Get listing ID to name mapping from database
  const { data: foodListings } = await supabase
    .from('food_listings')
    .select('id, name');

  const idToSlug = {};
  foodListings.forEach(l => {
    idToSlug[l.id] = toSlug(l.name);
  });

  console.log(`Loaded ${Object.keys(idToSlug).length} listing mappings\n`);

  // Get all UUID folders in listings/
  const { data: folders } = await supabase.storage
    .from(BUCKET)
    .list('listings', { limit: 1000 });

  let success = 0;
  let failed = 0;

  for (const folder of folders) {
    const uuid = folder.name;
    const slug = idToSlug[uuid];

    if (!slug) {
      console.log(`No mapping for ${uuid}`);
      failed++;
      continue;
    }

    // Get all files in this UUID folder
    const { data: files } = await supabase.storage
      .from(BUCKET)
      .list(`listings/${uuid}`, { limit: 100 });

    if (!files) continue;

    for (const file of files) {
      // Handle nested menu folder
      if (file.name === 'menu') {
        const { data: menuFiles } = await supabase.storage
          .from(BUCKET)
          .list(`listings/${uuid}/menu`, { limit: 100 });

        if (menuFiles) {
          for (const menuFile of menuFiles) {
            const oldPath = `listings/${uuid}/menu/${menuFile.name}`;
            const newPath = `listings/${slug}/menu/${menuFile.name}`;

            try {
              const { data: fileData } = await supabase.storage
                .from(BUCKET)
                .download(oldPath);

              if (fileData) {
                await supabase.storage
                  .from(BUCKET)
                  .upload(newPath, fileData, { upsert: true });

                await supabase.storage.from(BUCKET).remove([oldPath]);
                success++;
              }
            } catch (err) {
              failed++;
            }
          }
        }
        continue;
      }

      // Handle thumbnail and other root files
      const oldPath = `listings/${uuid}/${file.name}`;
      const newPath = `listings/${slug}/${file.name}`;

      try {
        const { data: fileData } = await supabase.storage
          .from(BUCKET)
          .download(oldPath);

        if (fileData) {
          await supabase.storage
            .from(BUCKET)
            .upload(newPath, fileData, { upsert: true });

          await supabase.storage.from(BUCKET).remove([oldPath]);
          success++;
        }
      } catch (err) {
        failed++;
      }
    }

    // Try to remove empty UUID folder
    await supabase.storage.from(BUCKET).remove([`listings/${uuid}`]);

    if (success % 50 === 0 && success > 0) {
      process.stdout.write(`.${success}`);
    }

    await new Promise(r => setTimeout(r, 30));
  }

  console.log(`\n\nSuccess: ${success}, Failed: ${failed}`);
}

convertUuidToSlug();
