/**
 * Fetch mall thumbnails and save to Supabase Storage
 *
 * Run with: node scripts/fetch-mall-thumbnails.js [--save] [--batch=5]
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET_NAME = 'restaurant-photos';
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Download image from URL
async function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { timeout: 30000 }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        downloadImage(response.headers.location).then(resolve).catch(reject);
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
    });
    request.on('error', reject);
    request.on('timeout', () => { request.destroy(); reject(new Error('Timeout')); });
  });
}

// Upload to Supabase Storage
async function uploadToSupabase(buffer, path) {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, buffer, { contentType: 'image/jpeg', upsert: true });

  if (error) throw new Error(error.message);

  const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
  return urlData.publicUrl;
}

// Search for mall and get photo
async function fetchMallPhoto(mallName, mallAddress) {
  const searchQuery = `${mallName} ${mallAddress || ''} Singapore`;

  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': googleApiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.photos'
    },
    body: JSON.stringify({ textQuery: searchQuery, maxResultCount: 1 })
  });

  const data = await response.json();

  if (!data.places || data.places.length === 0) {
    return null;
  }

  const place = data.places[0];
  if (!place.photos || place.photos.length === 0) {
    return null;
  }

  // Get first photo URL
  const photoName = place.photos[0].name;
  const photoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=800&key=${googleApiKey}`;

  return photoUrl;
}

async function main() {
  const args = process.argv.slice(2);
  const saveMode = args.includes('--save');
  const batchArg = args.find(a => a.startsWith('--batch='));
  const batchSize = batchArg ? parseInt(batchArg.split('=')[1]) : 5;

  console.log('========================================');
  console.log('Fetch Mall Thumbnails');
  console.log('========================================');
  console.log(`Mode: ${saveMode ? 'SAVE' : 'DRY RUN'}`);
  console.log(`Batch size: ${batchSize}\n`);

  // Get malls without thumbnails
  const { data: malls } = await supabase
    .from('malls')
    .select('id, name, address, thumbnail_url')
    .is('thumbnail_url', null);

  console.log(`Found ${malls.length} malls without thumbnails\n`);

  if (malls.length === 0) {
    console.log('All malls have thumbnails!');
    return;
  }

  // Process in batches
  const batch = malls.slice(0, batchSize);
  let success = 0;
  let failed = 0;

  for (let i = 0; i < batch.length; i++) {
    const mall = batch[i];
    console.log(`[${i + 1}/${batch.length}] ${mall.name}`);

    if (!saveMode) {
      console.log('  [DRY RUN] Would fetch thumbnail');
      continue;
    }

    try {
      // Fetch photo URL from Google
      console.log('  Searching Google Places...');
      const photoUrl = await fetchMallPhoto(mall.name, mall.address);

      if (!photoUrl) {
        console.log('  ✗ No photo found');
        failed++;
        continue;
      }

      // Download image
      console.log('  Downloading image...');
      const imageBuffer = await downloadImage(photoUrl);
      console.log(`  Downloaded: ${(imageBuffer.length / 1024).toFixed(1)} KB`);

      // Upload to Supabase
      const storagePath = `malls/${mall.id}/thumbnail.jpg`;
      console.log('  Uploading to Supabase...');
      const newUrl = await uploadToSupabase(imageBuffer, storagePath);

      // Update database
      console.log('  Updating database...');
      const { error } = await supabase
        .from('malls')
        .update({ thumbnail_url: newUrl })
        .eq('id', mall.id);

      if (error) throw new Error(error.message);

      console.log('  ✓ Done');
      success++;
    } catch (err) {
      console.log(`  ✗ Error: ${err.message}`);
      failed++;
    }

    await delay(200);
  }

  // Summary
  console.log('\n========================================');
  console.log('SUMMARY');
  console.log('========================================');
  console.log(`Processed: ${batch.length}`);
  console.log(`Success: ${success}`);
  console.log(`Failed: ${failed}`);
  console.log(`Remaining: ${malls.length - batch.length}`);

  if (!saveMode) {
    console.log('\n[DRY RUN] Run with --save to fetch thumbnails');
  } else if (malls.length > batchSize) {
    console.log(`\nRun again to process next ${Math.min(batchSize, malls.length - batchSize)} malls`);
  }
}

main().catch(console.error);
