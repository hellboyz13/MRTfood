/**
 * Fetch menu images for listings with low photo count using Google Places API + Vision API
 * Usage: node scripts/fetch-menu-images-batch.js [limit]
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const googleApiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_PLACES_API_KEY;

if (!googleApiKey) {
  console.error('Missing GOOGLE_API_KEY');
  process.exit(1);
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Food-related labels for Vision API
const FOOD_LABELS = [
  'food', 'dish', 'cuisine', 'meal', 'recipe', 'ingredient',
  'meat', 'vegetable', 'fruit', 'seafood', 'fish', 'chicken', 'beef', 'pork',
  'rice', 'noodle', 'pasta', 'bread', 'soup', 'salad', 'curry', 'stew',
  'cake', 'pastry', 'coffee', 'tea', 'beverage', 'drink',
  'pizza', 'burger', 'sandwich', 'sushi', 'ramen', 'dumpling',
  'ice cream', 'chocolate', 'dessert',
  'plate', 'bowl', 'platter', 'serving',
  'fried', 'grilled', 'roasted', 'steamed'
];

const NON_FOOD_LABELS = [
  'person', 'people', 'human', 'face', 'portrait', 'selfie', 'crowd',
  'building', 'architecture', 'structure', 'tower',
  'interior design', 'furniture', 'room', 'lobby',
  'street', 'road', 'car', 'vehicle',
  'logo', 'sign', 'signage', 'text', 'document'
];

// Get listings needing photos (<=3 photos currently)
async function getListingsNeedingPhotos(limit) {
  // Get all menu images
  let allImages = [];
  let offset = 0;

  while (true) {
    const { data } = await supabase
      .from('menu_images')
      .select('listing_id')
      .not('listing_id', 'is', null)
      .range(offset, offset + 999);

    if (!data || data.length === 0) break;
    allImages = allImages.concat(data);
    offset += 1000;
    if (data.length < 1000) break;
  }

  // Count per listing
  const countByListing = {};
  allImages.forEach(img => {
    countByListing[img.listing_id] = (countByListing[img.listing_id] || 0) + 1;
  });

  // Get all food listings
  let allListings = [];
  offset = 0;

  while (true) {
    const { data } = await supabase
      .from('food_listings')
      .select('id, name, address')
      .range(offset, offset + 999);

    if (!data || data.length === 0) break;
    allListings = allListings.concat(data);
    offset += 1000;
    if (data.length < 1000) break;
  }

  // Find listings with <=3 photos, prioritize 0 photos first
  const needsPhotos = allListings
    .filter(l => (countByListing[l.id] || 0) <= 3)
    .map(l => ({ ...l, photoCount: countByListing[l.id] || 0 }))
    .sort((a, b) => a.photoCount - b.photoCount);

  return needsPhotos.slice(0, limit);
}

// Search Google Places and get photos
async function fetchGooglePhotos(listing) {
  const searchQuery = `${listing.name} Singapore restaurant`;

  const searchUrl = 'https://places.googleapis.com/v1/places:searchText';
  const searchResponse = await fetch(searchUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': googleApiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.photos'
    },
    body: JSON.stringify({
      textQuery: searchQuery,
      maxResultCount: 3
    })
  });

  const searchData = await searchResponse.json();

  if (searchData.error) {
    console.log(`  API Error: ${searchData.error.message}`);
    return [];
  }

  if (!searchData.places || searchData.places.length === 0) {
    return [];
  }

  // Find first result with photos
  const place = searchData.places.find(p => p.photos && p.photos.length > 0);
  if (!place) return [];

  // Get up to 8 photos
  const photoRefs = place.photos.slice(0, 8);
  const photos = [];

  for (let i = 0; i < photoRefs.length; i++) {
    const photoName = photoRefs[i].name;
    const photoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=800&key=${googleApiKey}`;

    try {
      const photoResponse = await fetch(photoUrl);
      if (!photoResponse.ok) continue;

      const imageBuffer = await photoResponse.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString('base64');

      photos.push({
        index: i + 1,
        photoName,
        base64Image
      });
    } catch (e) {
      // Skip failed photos
    }
    await delay(50);
  }

  return photos;
}

// Filter food photos using Vision API
async function filterFoodPhotos(photos) {
  const foodPhotos = [];

  for (const photo of photos) {
    const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${googleApiKey}`;

    try {
      const visionResponse = await fetch(visionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: photo.base64Image },
            features: [{ type: 'LABEL_DETECTION', maxResults: 15 }]
          }]
        })
      });

      const visionData = await visionResponse.json();
      const result = visionData.responses?.[0];

      if (result?.error) continue;

      const labels = (result?.labelAnnotations || []).map(l => l.description.toLowerCase());

      let foodScore = 0;
      let nonFoodScore = 0;

      for (const label of labels) {
        for (const foodLabel of FOOD_LABELS) {
          if (label.includes(foodLabel)) foodScore++;
        }
        for (const nonFoodLabel of NON_FOOD_LABELS) {
          if (label.includes(nonFoodLabel)) nonFoodScore++;
        }
      }

      const isFood = foodScore > nonFoodScore && foodScore >= 2;

      if (isFood) {
        foodPhotos.push({ ...photo, labels, foodScore });
      }
    } catch (e) {
      // Skip failed vision checks
    }
    await delay(100);
  }

  // Return top 5 by food score
  return foodPhotos
    .sort((a, b) => b.foodScore - a.foodScore)
    .slice(0, 5);
}

// Upload to Supabase
async function uploadToSupabase(listing, foodPhotos, existingCount) {
  const slug = listing.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  let uploaded = 0;

  for (let i = 0; i < foodPhotos.length; i++) {
    const photo = foodPhotos[i];
    const displayOrder = existingCount + i + 1;
    const fileName = `${displayOrder}.jpg`;
    const filePath = `listings/${slug}/menu/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('restaurant-photos')
        .upload(filePath, Buffer.from(photo.base64Image, 'base64'), {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) continue;

      const { data: urlData } = supabase.storage
        .from('restaurant-photos')
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from('menu_images')
        .insert({
          listing_id: listing.id,
          image_url: urlData.publicUrl,
          display_order: displayOrder
        });

      if (!insertError) uploaded++;
    } catch (e) {
      // Skip failed uploads
    }
  }

  return uploaded;
}

async function main() {
  const limit = parseInt(process.argv[2]) || 159;

  console.log(`\n=== FETCH MENU IMAGES VIA GOOGLE API (limit: ${limit}) ===\n`);

  const listings = await getListingsNeedingPhotos(limit);
  console.log(`Found ${listings.length} listings needing photos\n`);

  if (listings.length === 0) {
    console.log('All listings have sufficient photos!');
    return;
  }

  const results = { processed: 0, photosAdded: 0, apiCalls: 0, failed: 0 };

  for (const listing of listings) {
    console.log(`[${results.processed + 1}/${listings.length}] ${listing.name} (has ${listing.photoCount} photos)`);

    try {
      // Fetch from Google Places
      const photos = await fetchGooglePhotos(listing);
      results.apiCalls += 1 + photos.length; // 1 search + N photo fetches

      if (photos.length === 0) {
        console.log(`  ✗ No photos found`);
        results.failed++;
        results.processed++;
        continue;
      }

      // Filter with Vision API
      const foodPhotos = await filterFoodPhotos(photos);
      results.apiCalls += photos.length; // Vision calls

      if (foodPhotos.length === 0) {
        console.log(`  ✗ No food photos (${photos.length} checked)`);
        results.failed++;
        results.processed++;
        continue;
      }

      // Upload to Supabase
      const uploaded = await uploadToSupabase(listing, foodPhotos, listing.photoCount);
      results.photosAdded += uploaded;

      console.log(`  ✓ Added ${uploaded} photos (${foodPhotos.length} food / ${photos.length} total)`);

    } catch (e) {
      console.log(`  ✗ Error: ${e.message}`);
      results.failed++;
    }

    results.processed++;
    await delay(200);
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Processed: ${results.processed}`);
  console.log(`Photos added: ${results.photosAdded}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`API calls: ${results.apiCalls}`);
  console.log(`Est. cost: ~$${(results.apiCalls * 0.01).toFixed(2)}`);
}

main().catch(console.error);
