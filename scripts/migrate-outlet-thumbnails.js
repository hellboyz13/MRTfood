/**
 * Fetch outlet thumbnails from Google Places and upload directly to Supabase Storage
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const slugify = (str) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

let apiCost = 0;

async function fetchAndUpload(outlet) {
  // Step 1: Get photo reference from Google Places
  const detailsUrl = `https://places.googleapis.com/v1/places/${outlet.google_place_id}?fields=photos&key=${API_KEY}`;
  const detailsRes = await fetch(detailsUrl, {
    headers: { 'X-Goog-Api-Key': API_KEY }
  });
  const details = await detailsRes.json();
  apiCost += 0.017;

  if (!details.photos || details.photos.length === 0) {
    return null;
  }

  // Step 2: Fetch the actual photo
  const photoName = details.photos[0].name;
  const photoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=400&maxWidthPx=400&key=${API_KEY}`;
  const photoRes = await fetch(photoUrl);

  if (!photoRes.ok) {
    console.log('  Failed to fetch photo');
    return null;
  }

  // Step 3: Upload to Supabase Storage
  const buffer = Buffer.from(await photoRes.arrayBuffer());
  const fileName = `malls/${outlet.mall_id}/outlets/${slugify(outlet.name)}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from('restaurant-photos')
    .upload(fileName, buffer, {
      contentType: 'image/jpeg',
      upsert: true
    });

  if (uploadError) {
    console.log(`  Upload error: ${uploadError.message}`);
    return null;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('restaurant-photos')
    .getPublicUrl(fileName);

  return publicUrl;
}

async function run() {
  const limit = process.argv.includes('--all') ? 1000 : 5;

  // Get outlets without thumbnails that have a google_place_id
  const { data: outlets } = await supabase
    .from('mall_outlets')
    .select('id, name, mall_id, google_place_id')
    .is('thumbnail_url', null)
    .not('google_place_id', 'is', null)
    .limit(limit);

  console.log(`Fetching thumbnails for ${outlets.length} outlets:\n`);

  let success = 0, noPhoto = 0, errors = 0;

  for (let i = 0; i < outlets.length; i++) {
    const outlet = outlets[i];
    console.log(`[${i + 1}/${outlets.length}] ${outlet.name}`);

    const newUrl = await fetchAndUpload(outlet);

    if (newUrl) {
      const { error } = await supabase
        .from('mall_outlets')
        .update({ thumbnail_url: newUrl })
        .eq('id', outlet.id);

      if (error) {
        console.log(`  DB error: ${error.message}`);
        errors++;
      } else {
        console.log(`  ✓ Saved`);
        success++;
      }
    } else {
      console.log(`  - No photo`);
      noPhoto++;
    }

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 100));
  }

  console.log('\n========================================');
  console.log('SUMMARY');
  console.log('========================================');
  console.log(`Success: ${success}`);
  console.log(`No photo available: ${noPhoto}`);
  console.log(`Errors: ${errors}`);
  console.log(`API cost: $${apiCost.toFixed(2)}`);
}

run().catch(console.error);
