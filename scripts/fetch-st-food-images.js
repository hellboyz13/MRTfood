const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Search for a place using Google Places API (New)
async function searchPlace(name, lat, lng) {
  const url = 'https://places.googleapis.com/v1/places:searchText';

  const body = {
    textQuery: name + ' restaurant Singapore',
    locationBias: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: 500.0
      }
    },
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

  if (data.places && data.places.length > 0) {
    return data.places[0];
  }
  return null;
}

// Get photo URL from photo name (new API format)
function getPhotoUrl(photoName, maxWidth = 800) {
  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}&key=${GOOGLE_API_KEY}`;
}

// Use Vision API to analyze if image is food
async function analyzeImageWithVision(imageUrl) {
  const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_API_KEY}`;

  const body = {
    requests: [{
      image: { source: { imageUri: imageUrl } },
      features: [
        { type: 'LABEL_DETECTION', maxResults: 15 },
        { type: 'OBJECT_LOCALIZATION', maxResults: 10 }
      ]
    }]
  };

  try {
    const res = await fetch(visionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    if (data.responses && data.responses[0]) {
      const labels = data.responses[0].labelAnnotations || [];
      const objects = data.responses[0].localizedObjectAnnotations || [];

      // Food-related keywords
      const foodKeywords = ['food', 'dish', 'cuisine', 'meal', 'plate', 'bowl', 'rice', 'noodle', 'soup', 'meat', 'vegetable', 'dessert', 'drink', 'beverage', 'coffee', 'tea', 'cake', 'bread', 'pasta', 'pizza', 'sushi', 'seafood', 'salad', 'sandwich', 'burger', 'ice cream', 'gelato', 'pastry', 'croissant'];

      // Non-food keywords to reject
      const rejectKeywords = ['person', 'people', 'human', 'face', 'man', 'woman', 'building', 'architecture', 'interior', 'exterior', 'room', 'furniture', 'table', 'chair', 'window', 'door', 'wall', 'ceiling', 'floor', 'street', 'car', 'vehicle'];

      const allLabels = labels.map(l => l.description.toLowerCase());
      const allObjects = objects.map(o => o.name.toLowerCase());
      const allDetected = [...allLabels, ...allObjects];

      // Check for rejection keywords
      const hasRejectKeyword = rejectKeywords.some(keyword =>
        allDetected.some(detected => detected.includes(keyword))
      );

      // Check for food keywords
      const hasFoodKeyword = foodKeywords.some(keyword =>
        allDetected.some(detected => detected.includes(keyword))
      );

      // Must have food AND not have reject keywords (or food is dominant)
      const foodScore = foodKeywords.filter(k => allDetected.some(d => d.includes(k))).length;
      const rejectScore = rejectKeywords.filter(k => allDetected.some(d => d.includes(k))).length;

      return {
        isFood: hasFoodKeyword && (foodScore > rejectScore || !hasRejectKeyword),
        foodScore,
        rejectScore,
        labels: allLabels.slice(0, 5)
      };
    }
  } catch (err) {
    console.log('    Vision API error:', err.message);
  }

  return { isFood: false, foodScore: 0, rejectScore: 0, labels: [] };
}

async function run() {
  console.log('='.repeat(60));
  console.log('FETCHING IMAGES FOR ST FOOD 2025');
  console.log('='.repeat(60));

  // Get ST Food listings
  const { data: listings } = await supabase
    .from('food_listings')
    .select('id, name, lat, lng, google_place_id')
    .eq('source_id', 'straits-times');

  console.log(`Processing ${listings.length} listings...\n`);

  for (const listing of listings) {
    console.log(`\n--- ${listing.name} ---`);

    // Step 1: Find place on Google
    console.log('  Searching for place...');
    const place = await searchPlace(listing.name, listing.lat, listing.lng);

    if (!place) {
      console.log('  ❌ Place not found');
      continue;
    }

    console.log('  Found:', place.displayName?.text || place.id);

    // Save place_id
    if (!listing.google_place_id) {
      await supabase
        .from('food_listings')
        .update({ google_place_id: place.id })
        .eq('id', listing.id);
    }

    // Step 2: Check photos
    if (!place.photos || place.photos.length === 0) {
      console.log('  ❌ No photos found');
      continue;
    }

    console.log(`  Found ${place.photos.length} photos`);

    // Step 3: Get up to 8 photos and vet them
    const photosToCheck = place.photos.slice(0, 8);
    const foodImages = [];

    for (let i = 0; i < photosToCheck.length; i++) {
      const photo = photosToCheck[i];
      const photoUrl = getPhotoUrl(photo.name);

      process.stdout.write(`  Photo ${i + 1}: `);

      const analysis = await analyzeImageWithVision(photoUrl);

      if (analysis.isFood) {
        console.log(`✅ FOOD (${analysis.labels.slice(0, 3).join(', ')})`);
        foodImages.push({
          url: photoUrl,
          score: analysis.foodScore,
          labels: analysis.labels
        });
      } else {
        console.log(`❌ Skip (${analysis.labels.slice(0, 3).join(', ')})`);
      }

      await sleep(200); // Rate limit
    }

    // Step 4: Take top 5 food images
    const topFoodImages = foodImages
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    if (topFoodImages.length === 0) {
      console.log('  ⚠️ No food images passed vetting');
      continue;
    }

    console.log(`  Selected ${topFoodImages.length} food images`);

    // Step 5: Set first as thumbnail
    const thumbnailUrl = topFoodImages[0].url;
    await supabase
      .from('food_listings')
      .update({ image_url: thumbnailUrl })
      .eq('id', listing.id);
    console.log('  📷 Set thumbnail');

    // Step 6: Save menu images
    for (let i = 0; i < topFoodImages.length; i++) {
      const { error } = await supabase
        .from('listing_images')
        .upsert({
          listing_id: listing.id,
          image_url: topFoodImages[i].url,
          display_order: i + 1,
          is_food: true
        }, { onConflict: 'listing_id,display_order' });

      if (error) {
        console.log(`  ❌ Error saving image ${i + 1}:`, error.message);
      }
    }
    console.log(`  💾 Saved ${topFoodImages.length} menu images`);

    await sleep(500); // Rate limit between listings
  }

  console.log('\n' + '='.repeat(60));
  console.log('DONE');
  console.log('='.repeat(60));
}

run().catch(console.error);
