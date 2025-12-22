const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const BATCH_SIZE = 50;
const TYPE = process.argv[2] || 'all'; // 'food', 'mall', or 'all'
const BATCH_NUM = parseInt(process.argv[3]) || 1;

async function searchAndUpload(name, location = 'Singapore') {
  const query = `${name} ${location} restaurant`;

  try {
    // 1. Search for place
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': 'places.displayName,places.photos,places.id'
      },
      body: JSON.stringify({
        textQuery: query,
        maxResultCount: 1
      })
    });

    const data = await res.json();

    if (!data.places || data.places.length === 0) return null;
    const place = data.places[0];
    if (!place.photos || place.photos.length === 0) return null;

    // 2. Download image from Google
    const photoName = place.photos[0].name;
    const photoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=400&key=${GOOGLE_API_KEY}`;

    const imageRes = await fetch(photoUrl);
    if (!imageRes.ok) return null;

    const imageBuffer = await imageRes.arrayBuffer();
    const contentType = imageRes.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.includes('png') ? 'png' : 'jpg';

    // 3. Upload to Supabase Storage
    const fileName = `mall-outlets/${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('thumbnails')
      .upload(fileName, imageBuffer, {
        contentType: contentType,
        upsert: true
      });

    if (uploadError) {
      console.log(`  Upload error: ${uploadError.message}`);
      return null;
    }

    // 4. Get public URL
    const { data: urlData } = supabase.storage
      .from('thumbnails')
      .getPublicUrl(fileName);

    return { photoUrl: urlData.publicUrl, placeId: place.id };
  } catch (e) {
    console.log(`  API Error: ${e.message.substring(0, 50)}`);
    return null;
  }
}

async function getMissingFoodListings() {
  const { data } = await supabase
    .from('food_listings')
    .select('id, name, station_id')
    .is('thumbnail_url', null)
    .order('name');
  return data || [];
}

async function getMissingMallOutlets() {
  const { data } = await supabase
    .from('mall_outlets')
    .select('id, name, mall_id')
    .is('thumbnail_url', null)
    .order('name');
  return data || [];
}

async function updateFoodListing(id, thumbnailUrl) {
  const { error } = await supabase
    .from('food_listings')
    .update({ thumbnail_url: thumbnailUrl })
    .eq('id', id);
  return !error;
}

async function updateMallOutlet(id, thumbnailUrl) {
  const { error } = await supabase
    .from('mall_outlets')
    .update({ thumbnail_url: thumbnailUrl })
    .eq('id', id);
  return !error;
}

async function processBatch(items, type, startIdx) {
  let found = 0;
  let updated = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const location = type === 'food' ? item.station_id : item.mall_id;

    console.log(`[${startIdx + i + 1}] ${item.name} (${location})`);

    const result = await searchAndUpload(item.name, 'Singapore');

    if (result && result.photoUrl) {
      found++;
      console.log(`  ✓ Found photo`);

      const success = type === 'food'
        ? await updateFoodListing(item.id, result.photoUrl)
        : await updateMallOutlet(item.id, result.photoUrl);

      if (success) {
        updated++;
      } else {
        console.log(`  ✗ DB update failed`);
      }
    } else {
      console.log(`  - No photo found`);
    }

    // Rate limit: 10 requests per second max
    await new Promise(r => setTimeout(r, 150));
  }

  return { found, updated };
}

async function main() {
  console.log(`=== FETCHING GOOGLE THUMBNAILS ===`);
  console.log(`Type: ${TYPE}, Batch: ${BATCH_NUM}\n`);

  let foodItems = [];
  let mallItems = [];

  if (TYPE === 'food' || TYPE === 'all') {
    foodItems = await getMissingFoodListings();
    console.log(`Food listings missing thumbnails: ${foodItems.length}`);
  }

  if (TYPE === 'mall' || TYPE === 'all') {
    mallItems = await getMissingMallOutlets();
    console.log(`Mall outlets missing thumbnails: ${mallItems.length}`);
  }

  // Combine and batch
  const allItems = [
    ...foodItems.map(f => ({ ...f, type: 'food' })),
    ...mallItems.map(m => ({ ...m, type: 'mall' }))
  ];

  const startIdx = (BATCH_NUM - 1) * BATCH_SIZE;
  const batch = allItems.slice(startIdx, startIdx + BATCH_SIZE);

  console.log(`\nProcessing batch ${BATCH_NUM}: items ${startIdx + 1} to ${startIdx + batch.length}`);
  console.log(`Total remaining: ${allItems.length}\n`);

  if (batch.length === 0) {
    console.log('No more items to process!');
    return;
  }

  // Split batch by type
  const foodBatch = batch.filter(b => b.type === 'food');
  const mallBatch = batch.filter(b => b.type === 'mall');

  let totalFound = 0;
  let totalUpdated = 0;

  if (foodBatch.length > 0) {
    console.log(`\n--- Processing ${foodBatch.length} food listings ---\n`);
    const { found, updated } = await processBatch(foodBatch, 'food', startIdx);
    totalFound += found;
    totalUpdated += updated;
  }

  if (mallBatch.length > 0) {
    console.log(`\n--- Processing ${mallBatch.length} mall outlets ---\n`);
    const { found, updated } = await processBatch(mallBatch, 'mall', startIdx + foodBatch.length);
    totalFound += found;
    totalUpdated += updated;
  }

  console.log(`\n=== COMPLETE ===`);
  console.log(`Found: ${totalFound}/${batch.length}`);
  console.log(`Updated: ${totalUpdated}`);

  const nextBatch = BATCH_NUM + 1;
  const remaining = allItems.length - (startIdx + batch.length);
  if (remaining > 0) {
    console.log(`\nRun next batch: node scripts/fetch-google-thumbnails.js ${TYPE} ${nextBatch}`);
    console.log(`Remaining: ${remaining} items`);
  }
}

main().catch(console.error);
