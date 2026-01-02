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

// Test with one stall
const TEST_STALL = {
  id: 'lagoon-famous-carrot-cake-east-coast-lagoon-food-village',
  name: 'Lagoon Famous Carrot Cake',
  location: 'East Coast Lagoon Food Village Singapore'
};

async function searchPlace(stallName, location) {
  // Use Places API (New) - Text Search
  const url = 'https://places.googleapis.com/v1/places:searchText';

  const body = JSON.stringify({
    textQuery: `${stallName} ${location}`,
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

  const data = await response.json();
  console.log('Search response:', JSON.stringify(data, null, 2));
  return data;
}

async function getPhotoUrl(photoName) {
  // Places API (New) photo URL format
  // photoName is like "places/xxx/photos/yyy"
  const url = `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=400&maxWidthPx=400&key=${GOOGLE_API_KEY}`;
  return url;
}

async function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const request = (reqUrl, redirectCount = 0) => {
      if (redirectCount > 5) {
        reject(new Error('Too many redirects'));
        return;
      }

      protocol.get(reqUrl, (response) => {
        // Handle redirects
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          console.log('Following redirect to:', response.headers.location);
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

    request(url);
  });
}

async function uploadToSupabase(buffer, stallId) {
  const filePath = `hawker-stalls/${stallId}/thumbnail.jpg`;

  const { data, error } = await supabase.storage
    .from('restaurant-photos')
    .upload(filePath, buffer, {
      contentType: 'image/jpeg',
      upsert: true
    });

  if (error) {
    throw error;
  }

  // Get public URL
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

  if (error) {
    throw error;
  }
}

async function run() {
  console.log('='.repeat(50));
  console.log('TESTING GOOGLE PLACES API + SUPABASE UPLOAD');
  console.log('='.repeat(50));
  console.log('API Key:', GOOGLE_API_KEY ? 'SET' : 'NOT SET');
  console.log('Test stall:', TEST_STALL.name);
  console.log('');

  // Step 1: Search for place
  console.log('1. Searching for place...');
  const searchResult = await searchPlace(TEST_STALL.name, TEST_STALL.location);

  if (!searchResult.places || searchResult.places.length === 0) {
    console.log('❌ No places found');
    return;
  }

  const place = searchResult.places[0];
  console.log('✅ Found:', place.displayName?.text);

  if (!place.photos || place.photos.length === 0) {
    console.log('❌ No photos available');
    return;
  }

  // Step 2: Get photo URL
  console.log('\n2. Getting photo...');
  const photoName = place.photos[0].name;
  console.log('Photo reference:', photoName);
  const photoUrl = await getPhotoUrl(photoName);
  console.log('Photo URL:', photoUrl.substring(0, 80) + '...');

  // Step 3: Download image
  console.log('\n3. Downloading image...');
  const imageBuffer = await downloadImage(photoUrl);
  console.log('✅ Downloaded:', imageBuffer.length, 'bytes');

  // Step 4: Upload to Supabase
  console.log('\n4. Uploading to Supabase storage...');
  const supabaseUrl = await uploadToSupabase(imageBuffer, TEST_STALL.id);
  console.log('✅ Uploaded:', supabaseUrl);

  // Step 5: Update database
  console.log('\n5. Updating database...');
  await updateOutlet(TEST_STALL.id, supabaseUrl);
  console.log('✅ Database updated');

  console.log('\n' + '='.repeat(50));
  console.log('SUCCESS! Thumbnail saved to Supabase.');
  console.log('='.repeat(50));
}

run().catch(err => {
  console.error('Error:', err.message);
  if (err.response) {
    console.error('Response:', err.response);
  }
});
