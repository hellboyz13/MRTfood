const { createClient } = require('@supabase/supabase-js');
const { config } = require('dotenv');

config({ path: '.env.local', override: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

if (!googleApiKey) {
  console.error('Missing GOOGLE_PLACES_API_KEY for Vision API');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const IMAGES_PER_LISTING = 5;

// Food-related labels that indicate the image is food
const FOOD_LABELS = [
  'food', 'dish', 'cuisine', 'meal', 'recipe', 'ingredient',
  'breakfast', 'lunch', 'dinner', 'snack', 'dessert', 'appetizer',
  'meat', 'vegetable', 'fruit', 'seafood', 'fish', 'chicken', 'beef', 'pork',
  'rice', 'noodle', 'pasta', 'bread', 'soup', 'salad', 'curry', 'stew',
  'cake', 'pastry', 'coffee', 'tea', 'beverage', 'drink', 'juice', 'smoothie',
  'pizza', 'burger', 'sandwich', 'sushi', 'ramen', 'dim sum', 'dumpling',
  'ice cream', 'chocolate', 'cookie', 'pie', 'tart',
  'plate', 'bowl', 'platter', 'serving', 'portion',
  'baked goods', 'comfort food', 'fast food', 'street food',
  'asian food', 'chinese food', 'japanese food', 'korean food', 'thai food',
  'indian food', 'italian food', 'mexican food', 'french food',
  'fried', 'grilled', 'roasted', 'steamed', 'boiled'
];

// Non-food labels that indicate the image is NOT food
const NON_FOOD_LABELS = [
  'person', 'people', 'human', 'face', 'portrait', 'selfie', 'crowd',
  'building', 'architecture', 'structure', 'tower', 'skyscraper',
  'interior design', 'furniture', 'room', 'lobby', 'hallway',
  'street', 'road', 'sidewalk', 'parking', 'car', 'vehicle',
  'landscape', 'mountain', 'beach', 'ocean', 'sky', 'sunset', 'sunrise',
  'logo', 'sign', 'signage', 'advertisement', 'poster', 'banner',
  'text', 'document', 'screenshot', 'map', 'diagram',
  'animal', 'pet', 'dog', 'cat', 'bird'
];

async function analyzeImageWithVision(imageUrl) {
  const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${googleApiKey}`;

  try {
    const response = await fetch(visionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { source: { imageUri: imageUrl } },
          features: [
            { type: 'LABEL_DETECTION', maxResults: 15 },
            { type: 'OBJECT_LOCALIZATION', maxResults: 10 }
          ]
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vision API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const result = data.responses?.[0];

    if (result?.error) {
      throw new Error(`Vision API error: ${result.error.message}`);
    }

    // Get labels and objects
    const labels = (result?.labelAnnotations || []).map(l => l.description.toLowerCase());
    const objects = (result?.localizedObjectAnnotations || []).map(o => o.name.toLowerCase());
    const allDetections = [...labels, ...objects];

    // Check for food indicators
    let foodScore = 0;
    let nonFoodScore = 0;
    const foodMatches = [];
    const nonFoodMatches = [];

    for (const detection of allDetections) {
      for (const foodLabel of FOOD_LABELS) {
        if (detection.includes(foodLabel) || foodLabel.includes(detection)) {
          foodScore++;
          if (!foodMatches.includes(detection)) foodMatches.push(detection);
        }
      }
      for (const nonFoodLabel of NON_FOOD_LABELS) {
        if (detection.includes(nonFoodLabel) || nonFoodLabel.includes(detection)) {
          nonFoodScore++;
          if (!nonFoodMatches.includes(detection)) nonFoodMatches.push(detection);
        }
      }
    }

    const isFood = foodScore > nonFoodScore || foodScore >= 2;

    return {
      isFood,
      foodScore,
      nonFoodScore,
      labels: allDetections,
      foodMatches,
      nonFoodMatches
    };
  } catch (error) {
    console.error(`  Error analyzing image: ${error.message}`);
    return { isFood: null, error: error.message };
  }
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const BATCH_SIZE = 100;

async function fetchImagesBatch(offset) {
  const { data, error } = await supabase
    .from('menu_images')
    .select('id, listing_id, image_url')
    .not('listing_id', 'is', null)
    .range(offset, offset + BATCH_SIZE - 1);

  if (error) {
    console.error('Error fetching batch:', error);
    return { data: [], hasMore: false };
  }

  return { data: data || [], hasMore: data?.length === BATCH_SIZE };
}

async function checkMissingMenuImages() {
  console.log('=== CHECKING FOOD LISTINGS MENU IMAGES ===\n');

  // Get all food listings
  const { data: listings, error: listingsError } = await supabase
    .from('food_listings')
    .select('id, name');

  if (listingsError) {
    console.error('Error fetching food listings:', listingsError);
    return;
  }

  console.log(`Total food listings: ${listings?.length || 0}\n`);

  // Get count of all menu images first
  const { count: totalImageCount, error: countError } = await supabase
    .from('menu_images')
    .select('*', { count: 'exact', head: true })
    .not('listing_id', 'is', null);

  if (countError) {
    console.error('Error counting menu images:', countError);
    return;
  }

  console.log(`Total menu images to check: ${totalImageCount}\n`);

  // Process images in batches
  const nonFoodImages = [];
  const uncertainImages = [];
  const imageCountByListing = {};
  let offset = 0;
  let totalChecked = 0;
  let batchNum = 0;

  while (true) {
    batchNum++;
    console.log(`\n=== BATCH ${batchNum} (images ${offset + 1} to ${offset + BATCH_SIZE}) ===\n`);

    const { data: batch, hasMore } = await fetchImagesBatch(offset);

    if (batch.length === 0) break;

    // Count images per listing
    for (const img of batch) {
      imageCountByListing[img.listing_id] = (imageCountByListing[img.listing_id] || 0) + 1;
    }

    // Check each image in batch with Vision API
    for (let i = 0; i < batch.length; i++) {
      const img = batch[i];
      totalChecked++;
      process.stdout.write(`\rChecking image ${i + 1}/${batch.length} (total: ${totalChecked}/${totalImageCount})...`);

      const result = await analyzeImageWithVision(img.image_url);

      if (result.error) {
        uncertainImages.push({ ...img, reason: result.error });
      } else if (!result.isFood) {
        nonFoodImages.push({
          id: img.id,
          listing_id: img.listing_id,
          image_url: img.image_url,
          nonFoodMatches: result.nonFoodMatches,
          foodMatches: result.foodMatches,
          labels: result.labels.slice(0, 10)
        });
        console.log(`\n  NON-FOOD: ${img.image_url.substring(0, 60)}...`);
        console.log(`    Detected: ${result.nonFoodMatches.join(', ')}`);
      }

      // Rate limit: ~1 request per 100ms
      await delay(100);
    }

    console.log(`\nBatch ${batchNum} complete. Non-food found so far: ${nonFoodImages.length}`);

    if (!hasMore) break;
    offset += BATCH_SIZE;
  }

  // Find listings with missing images
  const listingsWithNoImages = [];
  const listingsWithPartialImages = [];
  const listingsWithFullImages = [];

  for (const listing of listings || []) {
    const imageCount = imageCountByListing[listing.id] || 0;

    if (imageCount === 0) {
      listingsWithNoImages.push({ ...listing, imageCount });
    } else if (imageCount < IMAGES_PER_LISTING) {
      listingsWithPartialImages.push({ ...listing, imageCount });
    } else {
      listingsWithFullImages.push({ ...listing, imageCount });
    }
  }

  console.log('\n\n=== MISSING IMAGES SUMMARY ===\n');
  console.log(`Listings with 0 images: ${listingsWithNoImages.length}`);
  console.log(`Listings with 1-${IMAGES_PER_LISTING - 1} images: ${listingsWithPartialImages.length}`);
  console.log(`Listings with ${IMAGES_PER_LISTING}+ images: ${listingsWithFullImages.length}`);
  console.log();

  const totalMissingImages =
    (listingsWithNoImages.length * IMAGES_PER_LISTING) +
    listingsWithPartialImages.reduce((sum, l) => sum + (IMAGES_PER_LISTING - l.imageCount), 0);

  console.log(`Total images needed to reach ${IMAGES_PER_LISTING} per listing: ${totalMissingImages}`);

  console.log('\n\n=== NON-FOOD IMAGES SUMMARY ===\n');
  console.log(`Images checked: ${totalChecked}`);
  console.log(`Non-food images found: ${nonFoodImages.length}`);
  console.log(`Uncertain (errors): ${uncertainImages.length}`);

  if (nonFoodImages.length > 0) {
    console.log('\n=== NON-FOOD IMAGES TO REMOVE ===\n');
    for (const img of nonFoodImages) {
      const listing = listings.find(l => l.id === img.listing_id);
      console.log(`- ${listing?.name || img.listing_id}`);
      console.log(`  URL: ${img.image_url}`);
      console.log(`  Detected: ${img.nonFoodMatches.join(', ')}`);
      console.log();
    }
  }

  console.log('\n=== FINAL CALCULATION ===\n');
  console.log(`Images needed (missing): ${totalMissingImages}`);
  console.log(`Images to remove (non-food): ${nonFoodImages.length}`);
  console.log(`TOTAL IMAGES TO FETCH: ${totalMissingImages + nonFoodImages.length}`);
}

checkMissingMenuImages().catch(console.error);
