const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const http = require('http');

config({ path: '.env.local', override: true });

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function searchPlace(stallName, location) {
  const url = 'https://places.googleapis.com/v1/places:searchText';
  const body = JSON.stringify({
    textQuery: `${stallName} ${location} Singapore`,
    maxResultCount: 1
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.photos'
    },
    body
  });

  return response.json();
}

async function downloadImage(photoName) {
  const photoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=400&maxWidthPx=400&key=${GOOGLE_API_KEY}`;

  return new Promise((resolve, reject) => {
    const request = (reqUrl, redirectCount = 0) => {
      if (redirectCount > 5) {
        reject(new Error('Too many redirects'));
        return;
      }

      const protocol = reqUrl.startsWith('https') ? https : http;
      protocol.get(reqUrl, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          request(response.headers.location, redirectCount + 1);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }

        const chunks = [];
        response.on('data', chunk => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', reject);
      }).on('error', reject);
    };

    request(photoUrl);
  });
}

async function uploadToSupabase(buffer, outletId) {
  const filePath = `outlets/${outletId}/thumbnail.jpg`;

  const { error } = await supabase.storage
    .from('restaurant-photos')
    .upload(filePath, buffer, {
      contentType: 'image/jpeg',
      upsert: true
    });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from('restaurant-photos')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

async function updateOutlet(outletId, thumbnailUrl) {
  const { error } = await supabase
    .from('mall_outlets')
    .update({ thumbnail_url: thumbnailUrl })
    .eq('id', outletId);

  if (error) throw error;
}

async function processOutlet(outlet, mallName) {
  try {
    const searchResult = await searchPlace(outlet.name, mallName);

    if (!searchResult.places || searchResult.places.length === 0) {
      return { status: 'not_found' };
    }

    const place = searchResult.places[0];

    if (!place.photos || place.photos.length === 0) {
      return { status: 'no_photos' };
    }

    const imageBuffer = await downloadImage(place.photos[0].name);
    const supabaseUrl = await uploadToSupabase(imageBuffer, outlet.id);
    await updateOutlet(outlet.id, supabaseUrl);

    return { status: 'success' };
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}

async function run() {
  console.log('='.repeat(60));
  console.log('FETCHING THUMBNAILS FOR ALL OUTLETS WITHOUT IMAGES');
  console.log('='.repeat(60));

  // Get all malls
  const { data: allMalls } = await supabase
    .from('malls')
    .select('id, name');

  console.log(`Total malls: ${allMalls.length}\n`);

  let totalProcessed = 0;
  let totalSuccess = 0;
  let totalNotFound = 0;
  let totalNoPhotos = 0;
  let totalErrors = 0;

  for (const mall of allMalls) {
    // Get outlets without thumbnails for this mall
    const { data: outlets } = await supabase
      .from('mall_outlets')
      .select('id, name')
      .eq('mall_id', mall.id)
      .is('thumbnail_url', null);

    if (!outlets || outlets.length === 0) {
      continue;
    }

    console.log(`\n--- ${mall.name} (${outlets.length} missing) ---`);

    for (let i = 0; i < outlets.length; i++) {
      const outlet = outlets[i];
      totalProcessed++;

      process.stdout.write(`  [${i + 1}/${outlets.length}] ${outlet.name.substring(0, 35).padEnd(35)} `);

      const result = await processOutlet(outlet, mall.name);

      if (result.status === 'success') {
        console.log('✅');
        totalSuccess++;
      } else if (result.status === 'not_found') {
        console.log('❌ Not found');
        totalNotFound++;
      } else if (result.status === 'no_photos') {
        console.log('📷 No photos');
        totalNoPhotos++;
      } else {
        console.log(`⚠️ ${result.error}`);
        totalErrors++;
      }

      await sleep(100);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total processed: ${totalProcessed}`);
  console.log(`Success: ${totalSuccess} (${totalProcessed > 0 ? (totalSuccess / totalProcessed * 100).toFixed(1) : 0}%)`);
  console.log(`Not found: ${totalNotFound}`);
  console.log(`No photos: ${totalNoPhotos}`);
  console.log(`Errors: ${totalErrors}`);
  console.log(`API requests: ~${totalProcessed * 2}`);
}

run().catch(console.error);
