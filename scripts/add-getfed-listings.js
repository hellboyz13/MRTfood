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

// New listings from Get Fed
const LISTINGS = [
  {
    name: '928 Yishun Laksa',
    cuisine: 'Local',
    address: '928 Yishun Central 1, #01-155, Singapore 760928',
    unit: '#01-155',
    openingHours: '8:30am-6pm (Mon-Sat), Closed (Sun)',
    youtubeUrl: 'https://youtu.be/YH5gL8G_GaA',
    mallId: null // Need to find or create
  },
  {
    name: 'Lu Jia Fish Soup',
    cuisine: 'Local',
    address: '1 Yishun Industrial Street 1, #01-12, Singapore 768160',
    unit: '#01-12',
    openingHours: '10:30am-7:30pm (Mon-Fri), 10am-2pm (Sat), Closed (Sun)',
    mallId: null
  },
  {
    name: 'Jo Ju Bang',
    cuisine: 'Korean',
    address: '1 Tanjong Pagar Plz, #01-15, Singapore 082001',
    unit: '#01-15',
    openingHours: '10am-7pm (Daily)',
    mallId: null // Tanjong Pagar Plaza
  },
  {
    name: 'Meijing Sabah Sandakan Fried Pork Noodle',
    cuisine: 'Local',
    address: '531A Upper Cross St, #02-33, Singapore 051531',
    unit: '#02-33',
    openingHours: '7:30am-2:30pm (Mon-Fri), 7:30am-1:30pm (Sat), Closed (Sun)',
    youtubeUrl: 'https://youtu.be/OAFB7sKF6VY',
    mallId: 'hong-lim-market-and-food-centre'
  },
  {
    name: 'Bee Kia Seafood Restaurant',
    cuisine: 'Local',
    address: '1 Thomson Rd, #01-326, Singapore 300001',
    unit: '#01-326',
    openingHours: '12pm-10:30pm (Mon-Sat), Closed (Sun)',
    mallId: null // Balestier Point
  },
  {
    name: 'Ma Cuisinette',
    cuisine: 'French',
    address: '1 Seletar Rd, #01-09/10, Singapore 807011',
    unit: '#01-09/10',
    openingHours: '11am-9pm (Daily)',
    mallId: null // The Summerhouse
  }
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function searchPlace(name, address) {
  const url = 'https://places.googleapis.com/v1/places:searchText';
  const body = JSON.stringify({
    textQuery: `${name} ${address}`,
    maxResultCount: 1
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.photos,places.formattedAddress,places.regularOpeningHours'
    },
    body
  });

  return response.json();
}

async function downloadImage(photoName, maxSize = 400) {
  const photoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=${maxSize}&maxWidthPx=${maxSize}&key=${GOOGLE_API_KEY}`;

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

async function uploadToSupabase(buffer, path) {
  const { error } = await supabase.storage
    .from('restaurant-photos')
    .upload(path, buffer, {
      contentType: 'image/jpeg',
      upsert: true
    });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from('restaurant-photos')
    .getPublicUrl(path);

  return urlData.publicUrl;
}

function slugify(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function processListing(listing) {
  console.log(`\n--- ${listing.name} ---`);

  // Search Google Places
  console.log('Searching Google Places...');
  const searchResult = await searchPlace(listing.name, listing.address);

  if (!searchResult.places || searchResult.places.length === 0) {
    console.log('❌ Place not found on Google');
    return null;
  }

  const place = searchResult.places[0];
  console.log('✅ Found:', place.displayName?.text);

  let thumbnailUrl = null;
  const menuUrls = [];

  if (place.photos && place.photos.length > 0) {
    // Download thumbnail (first photo)
    console.log('Downloading thumbnail...');
    try {
      const slug = slugify(listing.name);
      const thumbnailBuffer = await downloadImage(place.photos[0].name, 400);
      thumbnailUrl = await uploadToSupabase(thumbnailBuffer, `outlets/${slug}/thumbnail.jpg`);
      console.log('✅ Thumbnail uploaded');
    } catch (err) {
      console.log('⚠️ Thumbnail error:', err.message);
    }

    // Download menu images (look for food photos - up to 5)
    console.log('Downloading menu/food images...');
    const maxMenuPhotos = Math.min(5, place.photos.length);
    for (let i = 0; i < maxMenuPhotos; i++) {
      try {
        const slug = slugify(listing.name);
        const menuBuffer = await downloadImage(place.photos[i].name, 800);
        const menuUrl = await uploadToSupabase(menuBuffer, `outlets/${slug}/menu-${i + 1}.jpg`);
        menuUrls.push(menuUrl);
        await sleep(100);
      } catch (err) {
        console.log(`⚠️ Menu photo ${i + 1} error:`, err.message);
      }
    }
    console.log(`✅ ${menuUrls.length} menu images uploaded`);
  }

  return {
    ...listing,
    thumbnailUrl,
    menuUrls,
    googlePlaceId: place.id
  };
}

async function run() {
  console.log('='.repeat(60));
  console.log('ADDING GET FED LISTINGS');
  console.log('='.repeat(60));

  const results = [];

  for (const listing of LISTINGS) {
    const result = await processListing(listing);
    if (result) {
      results.push(result);
    }
    await sleep(200);
  }

  console.log('\n' + '='.repeat(60));
  console.log('RESULTS');
  console.log('='.repeat(60));

  for (const r of results) {
    console.log(`\n${r.name}:`);
    console.log(`  Mall ID: ${r.mallId || 'NEEDS ASSIGNMENT'}`);
    console.log(`  Thumbnail: ${r.thumbnailUrl ? '✅' : '❌'}`);
    console.log(`  Menu images: ${r.menuUrls?.length || 0}`);
  }

  // Save results for manual review
  const fs = require('fs');
  fs.writeFileSync('scripts/getfed-results.json', JSON.stringify(results, null, 2));
  console.log('\nResults saved to scripts/getfed-results.json');
}

run().catch(console.error);
