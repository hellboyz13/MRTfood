const { createClient } = require('@supabase/supabase-js');
const { config } = require('dotenv');

config({ path: '.env.local', override: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;

if (!supabaseUrl || !supabaseServiceKey || !googleApiKey) {
  console.error('Missing credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Food-related labels
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

// Non-food labels
const NON_FOOD_LABELS = [
  'person', 'people', 'human', 'face', 'portrait', 'selfie', 'crowd',
  'building', 'architecture', 'structure', 'tower',
  'interior design', 'furniture', 'room', 'lobby',
  'street', 'road', 'car', 'vehicle',
  'logo', 'sign', 'signage', 'text', 'document'
];

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Step 1: Find food listings without menu images
async function findListingsWithoutImages() {
  console.log('Step 1: Finding food listings without menu images...\n');

  // Get all listing IDs that have images
  const { data: existingImages } = await supabase
    .from('menu_images')
    .select('listing_id')
    .not('listing_id', 'is', null);

  const listingIdsWithImages = new Set((existingImages || []).map(i => i.listing_id));
  console.log(`Listings with existing images: ${listingIdsWithImages.size}`);

  // Get ALL food listings (paginate to get all)
  let allListings = [];
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data: listings, error } = await supabase
      .from('food_listings')
      .select('id, name, address')
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('Error fetching listings:', error);
      break;
    }

    if (!listings || listings.length === 0) break;

    allListings = allListings.concat(listings);
    offset += pageSize;

    if (listings.length < pageSize) break;
  }

  console.log(`Total food_listings in database: ${allListings.length}`);

  const listingsWithoutImages = allListings.filter(l => !listingIdsWithImages.has(l.id));

  console.log(`Listings WITHOUT menu images: ${listingsWithoutImages.length}\n`);
  return listingsWithoutImages;
}

// Step 2: Search Google Places (NEW API) for the restaurant and get photos
async function fetchGooglePhotos(listing) {
  console.log('Step 2: Fetching photos from Google Places API (New)...\n');

  const searchQuery = `${listing.name} Singapore restaurant`;
  console.log(`  Searching: "${searchQuery}"`);

  // Use the Places API (New) - Text Search
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
      maxResultCount: 5
    })
  });

  const searchData = await searchResponse.json();

  if (searchData.error) {
    console.log(`  API Error: ${searchData.error.message}`);
    return [];
  }

  if (!searchData.places || searchData.places.length === 0) {
    console.log('  No places found');
    return [];
  }

  // Find first result with photos
  const place = searchData.places.find(p => p.photos && p.photos.length > 0);

  if (!place) {
    console.log('  No place with photos found');
    return [];
  }

  console.log(`  Found place: ${place.displayName?.text}`);

  // Get up to 8 photos (will filter down to 5 with Vision API)
  const photoRefs = place.photos.slice(0, 8);
  console.log(`  Found ${photoRefs.length} photo references\n`);

  const photos = [];
  for (let i = 0; i < photoRefs.length; i++) {
    const photoName = photoRefs[i].name;

    // Use Places Photo (New) API
    const photoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=800&key=${googleApiKey}`;

    // Fetch the actual image
    const photoResponse = await fetch(photoUrl);

    if (!photoResponse.ok) {
      console.log(`  Photo ${i + 1}: failed to fetch`);
      continue;
    }

    const imageBuffer = await photoResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    photos.push({
      index: i + 1,
      photoName,
      base64Image
    });

    console.log(`  Photo ${i + 1}: fetched (${Math.round(imageBuffer.byteLength / 1024)}KB)`);
    await delay(100);
  }

  return photos;
}

// Step 3: Use Vision API to check if each photo is food
async function filterFoodPhotos(photos) {
  console.log('\nStep 3: Checking photos with Google Cloud Vision API...\n');

  const foodPhotos = [];

  for (const photo of photos) {
    console.log(`  Checking photo ${photo.index}...`);

    // Call Vision API with base64 image
    const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${googleApiKey}`;
    const visionResponse = await fetch(visionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: photo.base64Image },
          features: [
            { type: 'LABEL_DETECTION', maxResults: 15 }
          ]
        }]
      })
    });

    const visionData = await visionResponse.json();
    const result = visionData.responses?.[0];

    if (result?.error) {
      console.log(`    Error: ${result.error.message}`);
      continue;
    }

    const labels = (result?.labelAnnotations || []).map(l => l.description.toLowerCase());

    // Score the image
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

    console.log(`    Labels: ${labels.slice(0, 5).join(', ')}`);
    console.log(`    Food: ${foodScore}, Non-food: ${nonFoodScore} => ${isFood ? 'FOOD ✓' : 'NOT FOOD ✗'}`);

    if (isFood) {
      foodPhotos.push({
        ...photo,
        labels,
        foodScore
      });
    }

    await delay(200);
  }

  console.log(`\nFood photos found: ${foodPhotos.length}`);

  // Return top 5 by food score
  return foodPhotos
    .sort((a, b) => b.foodScore - a.foodScore)
    .slice(0, 5);
}

// Step 4: Upload to Supabase storage and insert into menu_images
async function uploadToSupabase(listing, foodPhotos) {
  console.log('\nStep 4: Uploading to Supabase...\n');

  // Create slug from listing name
  const slug = listing.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  for (let i = 0; i < foodPhotos.length; i++) {
    const photo = foodPhotos[i];
    const fileName = `${i + 1}.jpg`;
    const filePath = `listings/${slug}/menu/${fileName}`;

    console.log(`  Uploading ${filePath}...`);

    // Upload to storage (bucket: restaurant-photos)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('restaurant-photos')
      .upload(filePath, Buffer.from(photo.base64Image, 'base64'), {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (uploadError) {
      console.log(`    Upload error: ${uploadError.message}`);
      continue;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('restaurant-photos')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // Insert into menu_images table
    const { error: insertError } = await supabase
      .from('menu_images')
      .insert({
        listing_id: listing.id,
        image_url: publicUrl,
        display_order: i + 1
      });

    if (insertError) {
      console.log(`    Insert error: ${insertError.message}`);
    } else {
      console.log(`    ✓ Saved: ${publicUrl}`);
    }
  }

  console.log('\nDone!');
}

// Main function
async function main() {
  console.log('=== FETCH MENU IMAGES FOR SINGLE LISTING ===\n');

  // Step 1: Find listings without images
  const listings = await findListingsWithoutImages();
  if (listings.length === 0) {
    console.log('All listings have images!');
    return;
  }

  // Try each listing until we find one with Google photos
  for (const listing of listings) {
    console.log(`\n--- Trying: ${listing.name} ---\n`);

    // Step 2: Fetch Google photos
    const photos = await fetchGooglePhotos(listing);
    if (photos.length === 0) {
      console.log('Skipping - no photos found\n');
      continue;
    }

    // Step 3: Filter food photos with Vision API
    const foodPhotos = await filterFoodPhotos(photos);
    if (foodPhotos.length === 0) {
      console.log('Skipping - no food photos\n');
      continue;
    }

    // Step 4: Upload to Supabase
    await uploadToSupabase(listing, foodPhotos);

    // Only process 1 listing for now
    console.log('\n=== COMPLETED 1 LISTING ===');
    return;
  }

  console.log('\nNo listings with valid photos found');
}

main().catch(console.error);
