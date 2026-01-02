const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

async function searchPlace(query, lat, lng) {
  const url = 'https://places.googleapis.com/v1/places:searchText';
  const body = {
    textQuery: query,
    locationBias: { circle: { center: { latitude: lat, longitude: lng }, radius: 200.0 } },
    maxResultCount: 1
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.photos'
    },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  return data.places?.[0] || null;
}

function getPhotoUrl(photoName) {
  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=800&key=${GOOGLE_API_KEY}`;
}

async function analyzeImageWithVision(imageUrl) {
  const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_API_KEY}`;
  const body = {
    requests: [{
      image: { source: { imageUri: imageUrl } },
      features: [{ type: 'LABEL_DETECTION', maxResults: 10 }]
    }]
  };
  const res = await fetch(visionUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  const labels = data.responses?.[0]?.labelAnnotations?.map(l => l.description.toLowerCase()) || [];
  const foodKeywords = ['food', 'ice cream', 'gelato', 'dessert', 'frozen', 'cream'];
  const rejectKeywords = ['person', 'people', 'building', 'interior', 'furniture', 'room'];
  const hasFood = foodKeywords.some(k => labels.some(l => l.includes(k)));
  const hasReject = rejectKeywords.some(k => labels.some(l => l.includes(k)));
  return { isFood: hasFood && !hasReject, labels };
}

async function run() {
  // Get Mondo listing
  const { data: listing } = await supabase
    .from('food_listings')
    .select('id, lat, lng')
    .eq('name', 'Mondo')
    .eq('source_id', 'straits-times')
    .single();

  console.log('Fixing Mondo gelato thumbnail...');

  // Search for correct Mondo
  const place = await searchPlace('Mondo gelato Amoy Street Singapore', listing.lat, listing.lng);
  console.log('Found:', place?.displayName?.text);

  if (!place || !place.photos) {
    console.log('No photos found');
    return;
  }

  // Get photos and find first food image
  for (const photo of place.photos.slice(0, 8)) {
    const url = getPhotoUrl(photo.name);
    const analysis = await analyzeImageWithVision(url);
    console.log('Photo:', analysis.isFood ? 'FOOD' : 'SKIP', '-', analysis.labels.slice(0, 3).join(', '));

    if (analysis.isFood) {
      await supabase
        .from('food_listings')
        .update({ image_url: url, google_place_id: place.id })
        .eq('id', listing.id);
      console.log('✅ Updated Mondo thumbnail!');
      break;
    }
  }
}

run().catch(console.error);
