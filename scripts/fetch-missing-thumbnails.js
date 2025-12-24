const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// Delay helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchThumbnailFromGoogle(outletName, mallName) {
  const searchQuery = `${outletName} ${mallName} Singapore`;

  const searchUrl = 'https://places.googleapis.com/v1/places:searchText';

  // Add timeout - abort if taking longer than 5 seconds
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  let searchResponse;
  try {
    searchResponse = await fetch(searchUrl, {
      signal: controller.signal,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.photos'
      },
      body: JSON.stringify({
        textQuery: searchQuery,
        maxResultCount: 1
      })
    });
    clearTimeout(timeout);
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      throw new Error('Timeout');
    }
    throw err;
  }

  const searchData = await searchResponse.json();

  if (!searchData.places || !searchData.places[0] || !searchData.places[0].photos) {
    return null;
  }

  const photoName = searchData.places[0].photos[0].name;
  const photoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=400&maxWidthPx=400&key=${API_KEY}`;

  // Fetch the actual image with timeout
  const imgController = new AbortController();
  const imgTimeout = setTimeout(() => imgController.abort(), 5000);

  let photoResponse;
  try {
    photoResponse = await fetch(photoUrl, { signal: imgController.signal });
    clearTimeout(imgTimeout);
  } catch (err) {
    clearTimeout(imgTimeout);
    if (err.name === 'AbortError') {
      throw new Error('Timeout');
    }
    throw err;
  }

  if (!photoResponse.ok) {
    return null;
  }

  const imageBuffer = await photoResponse.arrayBuffer();
  return imageBuffer;
}

async function uploadToSupabase(outletId, imageBuffer) {
  const fileName = `${outletId}.jpg`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('thumbnails')
    .upload(fileName, imageBuffer, {
      contentType: 'image/jpeg',
      upsert: true
    });

  if (uploadError) {
    console.error(`  Upload error for ${outletId}:`, uploadError.message);
    return null;
  }

  const { data: urlData } = supabase.storage.from('thumbnails').getPublicUrl(fileName);
  return urlData.publicUrl;
}

async function main() {
  console.log('=== FETCHING MISSING THUMBNAILS ===\n');

  // Step 1: Get all outlets without thumbnails
  const { data: noThumb, error: e1 } = await supabase
    .from('mall_outlets')
    .select('id, name, mall_id, malls(name)')
    .is('thumbnail_url', null);

  if (e1) {
    console.error('Error fetching outlets:', e1);
    return;
  }

  // Step 2: Get all outlets WITH thumbnails that are in Supabase storage
  const { data: withThumb, error: e2 } = await supabase
    .from('mall_outlets')
    .select('id, name, thumbnail_url')
    .not('thumbnail_url', 'is', null)
    .like('thumbnail_url', '%supabase.co%');

  // Create a map of outlet names to their Supabase thumbnails
  const thumbMap = {};
  withThumb.forEach(outlet => {
    const normalizedName = outlet.name.toLowerCase().trim();
    if (!thumbMap[normalizedName]) {
      thumbMap[normalizedName] = outlet.thumbnail_url;
    }
  });

  // Separate outlets into reusable and need-to-fetch
  const canReuse = [];
  const needFetch = [];

  noThumb.forEach(outlet => {
    const normalizedName = outlet.name.toLowerCase().trim();
    if (thumbMap[normalizedName]) {
      canReuse.push({
        id: outlet.id,
        name: outlet.name,
        existingThumb: thumbMap[normalizedName]
      });
    } else {
      needFetch.push({
        id: outlet.id,
        name: outlet.name,
        mallName: outlet.malls?.name || ''
      });
    }
  });

  console.log(`Found ${canReuse.length} outlets that can reuse existing thumbnails`);
  console.log(`Found ${needFetch.length} outlets that need fetching from Google\n`);

  // Step 3: Update outlets that can reuse existing thumbnails
  console.log('--- REUSING EXISTING THUMBNAILS ---');
  let reusedCount = 0;
  for (const outlet of canReuse) {
    const { error } = await supabase
      .from('mall_outlets')
      .update({ thumbnail_url: outlet.existingThumb })
      .eq('id', outlet.id);

    if (error) {
      console.log(`  ✗ ${outlet.name} (${outlet.id}): ${error.message}`);
    } else {
      console.log(`  ✓ ${outlet.name} (${outlet.id})`);
      reusedCount++;
    }
  }
  console.log(`Reused ${reusedCount}/${canReuse.length} thumbnails\n`);

  // Step 4: Fetch from Google for the rest
  console.log('--- FETCHING FROM GOOGLE PLACES API ---');
  let fetchedCount = 0;
  let failedCount = 0;
  const failed = [];

  for (let i = 0; i < needFetch.length; i++) {
    const outlet = needFetch[i];
    const progress = `[${i + 1}/${needFetch.length}]`;

    try {
      // Fetch from Google
      const imageBuffer = await fetchThumbnailFromGoogle(outlet.name, outlet.mallName);

      if (!imageBuffer) {
        console.log(`${progress} ✗ ${outlet.name} @ ${outlet.mallName}: No photo found`);
        failed.push({ id: outlet.id, name: outlet.name, mall: outlet.mallName, reason: 'No photo' });
        failedCount++;
        continue;
      }

      // Upload to Supabase
      const thumbnailUrl = await uploadToSupabase(outlet.id, imageBuffer);

      if (!thumbnailUrl) {
        console.log(`${progress} ✗ ${outlet.name} @ ${outlet.mallName}: Upload failed`);
        failed.push({ id: outlet.id, name: outlet.name, mall: outlet.mallName, reason: 'Upload failed' });
        failedCount++;
        continue;
      }

      // Update database
      const { error } = await supabase
        .from('mall_outlets')
        .update({ thumbnail_url: thumbnailUrl })
        .eq('id', outlet.id);

      if (error) {
        console.log(`${progress} ✗ ${outlet.name} @ ${outlet.mallName}: DB update failed`);
        failed.push({ id: outlet.id, name: outlet.name, mall: outlet.mallName, reason: 'DB update failed' });
        failedCount++;
      } else {
        console.log(`${progress} ✓ ${outlet.name} @ ${outlet.mallName}`);
        fetchedCount++;
      }

      // Rate limit - 200ms between requests
      await delay(200);

    } catch (err) {
      console.log(`${progress} ✗ ${outlet.name} @ ${outlet.mallName}: ${err.message}`);
      failed.push({ id: outlet.id, name: outlet.name, mall: outlet.mallName, reason: err.message });
      failedCount++;
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Reused existing thumbnails: ${reusedCount}`);
  console.log(`Fetched from Google: ${fetchedCount}`);
  console.log(`Failed: ${failedCount}`);

  if (failed.length > 0) {
    console.log('\n=== FAILED OUTLETS ===');
    failed.forEach(f => console.log(`  - ${f.name} @ ${f.mall}: ${f.reason}`));
  }
}

main().catch(console.error);
