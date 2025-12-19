/**
 * Fetch Food Photos from Google Places API with Cloud Vision Filtering
 *
 * Process:
 * 1. Fetch listings from Supabase (batch of 100)
 * 2. Search Google Places API (New) using name + address
 * 3. Get up to 10 photos per place
 * 4. Filter photos using Cloud Vision API label detection
 * 5. Keep only food-related photos
 * 6. Save top 5 food photos to Supabase Storage
 * 7. Insert into menu_images table
 *
 * Usage:
 *   node scripts/fetch-food-photos-batch.js              # Start from beginning
 *   node scripts/fetch-food-photos-batch.js --resume     # Resume from last position
 *   node scripts/fetch-food-photos-batch.js --dry-run    # Preview without making changes
 *   node scripts/fetch-food-photos-batch.js --batch=2    # Start from batch 2
 *
 * IMPORTANT: Add GOOGLE_PLACES_API_KEY to .env.local before running
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env.local manually to avoid dotenvx issues
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      // Remove quotes
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
});

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  BATCH_SIZE: 100,                    // Listings per batch
  MAX_PHOTOS_PER_PLACE: 10,           // Photos to fetch from Places API
  MAX_FOOD_PHOTOS_TO_SAVE: 5,         // Max food photos to keep per listing
  DELAY_BETWEEN_LISTINGS: 500,        // ms between processing each listing
  DELAY_BETWEEN_PHOTOS: 200,          // ms between photo downloads
  PROGRESS_FILE: './scripts/food-photos-progress.json',
  BUCKET_NAME: 'restaurant-photos',
  MAX_PHOTO_WIDTH: 800,               // Higher res for detail page
};

// Food-related labels that Cloud Vision might return - STRICT food only
const FOOD_LABELS = [
  'food', 'dish', 'meal', 'cuisine', 'recipe',
  'noodle', 'noodles', 'pasta', 'rice', 'soup', 'salad',
  'meat', 'chicken', 'beef', 'pork', 'lamb', 'fish', 'seafood', 'prawn', 'shrimp', 'crab',
  'vegetable', 'vegetables', 'fruit', 'fruits',
  'dessert', 'cake', 'ice cream', 'pastry', 'bread', 'baked goods',
  'drink', 'beverage', 'coffee', 'tea', 'juice', 'smoothie',
  'breakfast', 'lunch', 'dinner', 'brunch',
  'appetizer', 'snack', 'fast food', 'street food',
  'asian food', 'chinese food', 'japanese food', 'korean food', 'thai food', 'indian food',
  'plate', 'bowl', // Keep plate/bowl but not dining/interior
  'sushi', 'ramen', 'curry', 'pizza', 'burger', 'sandwich', 'steak',
  'dim sum', 'dumpling', 'satay', 'laksa', 'char kway teow', 'chicken rice',
  'bak kut teh', 'hokkien mee', 'rojak', 'chilli crab',
];

// Labels that indicate NOT a food photo (storefront, exterior only - less strict)
const REJECT_LABELS = [
  'building', 'storefront', 'facade', 'exterior',
  'selfie', 'portrait',
  'signage', 'banner', 'poster',
  'street', 'road', 'sidewalk', 'parking',
  'architecture',
];

// ============================================
// INITIALIZE CLIENTS
// ============================================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

if (!googleApiKey) {
  console.error('Missing GOOGLE_PLACES_API_KEY in .env.local');
  console.error('Please add: GOOGLE_PLACES_API_KEY="your-api-key"');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================
// STATS & PROGRESS TRACKING
// ============================================
const stats = {
  totalListings: 0,
  processedListings: 0,
  successfulListings: 0,
  failedListings: 0,
  skippedListings: 0,
  noPlaceFound: 0,
  noPhotosAvailable: 0,

  placesApiCalls: 0,
  photoApiCalls: 0,
  visionApiCalls: 0,

  totalPhotosAnalyzed: 0,
  foodPhotosFound: 0,
  photosSaved: 0,

  errors: [],
  startTime: null,
};

let progress = {
  lastProcessedIndex: 0,
  processedIds: [],
  batchNumber: 1,
};

// Parse CLI arguments
const args = process.argv.slice(2);
const shouldResume = args.includes('--resume');
const isDryRun = args.includes('--dry-run');
const batchArg = args.find(a => a.startsWith('--batch='));
const startBatch = batchArg ? parseInt(batchArg.split('=')[1]) : 1;

// ============================================
// PROGRESS PERSISTENCE
// ============================================
function loadProgress() {
  try {
    if (fs.existsSync(CONFIG.PROGRESS_FILE)) {
      const data = fs.readFileSync(CONFIG.PROGRESS_FILE, 'utf8');
      progress = JSON.parse(data);
      console.log(`Loaded progress: ${progress.processedIds.length} listings already processed`);
      console.log(`Last batch: ${progress.batchNumber}`);
    }
  } catch (error) {
    console.log('No previous progress found, starting fresh');
  }
}

function saveProgress() {
  try {
    fs.writeFileSync(CONFIG.PROGRESS_FILE, JSON.stringify(progress, null, 2));
  } catch (error) {
    console.error('Failed to save progress:', error.message);
  }
}

// ============================================
// GOOGLE PLACES API (NEW)
// ============================================
async function searchPlace(name, address) {
  const query = `${name} ${address || ''} Singapore`.trim();

  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': googleApiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.photos',
    },
    body: JSON.stringify({
      textQuery: query,
      locationBias: {
        circle: {
          center: { latitude: 1.3521, longitude: 103.8198 },
          radius: 50000.0,
        },
      },
      maxResultCount: 1,
    }),
  });

  stats.placesApiCalls++;

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Places API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.places?.[0] || null;
}

async function getPlacePhoto(photoName) {
  const url = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${CONFIG.MAX_PHOTO_WIDTH}&key=${googleApiKey}`;

  const response = await fetch(url, { redirect: 'follow' });
  stats.photoApiCalls++;

  if (!response.ok) {
    throw new Error(`Photo API error: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// ============================================
// CLOUD VISION API
// ============================================
async function analyzeImageWithVision(imageBuffer) {
  const base64Image = imageBuffer.toString('base64');

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${googleApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: base64Image },
          features: [{ type: 'LABEL_DETECTION', maxResults: 20 }],
        }],
      }),
    }
  );

  stats.visionApiCalls++;

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Vision API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const labels = data.responses?.[0]?.labelAnnotations || [];

  return labels.map(l => ({
    description: l.description.toLowerCase(),
    score: l.score,
  }));
}

function isFoodPhoto(labels) {
  // First check for reject labels - if found, definitely NOT a food photo
  for (const label of labels) {
    for (const rejectLabel of REJECT_LABELS) {
      if (label.description.includes(rejectLabel) || rejectLabel.includes(label.description)) {
        // Only reject if confidence is high enough
        if (label.score > 0.7) {
          return { isFood: false, rejectedBy: label.description };
        }
      }
    }
  }

  // Now check for food labels
  for (const label of labels) {
    for (const foodLabel of FOOD_LABELS) {
      if (label.description.includes(foodLabel) || foodLabel.includes(label.description)) {
        // Require higher confidence for food detection
        if (label.score > 0.6) {
          return { isFood: true, matchedLabel: label.description, score: label.score };
        }
      }
    }
  }
  return { isFood: false };
}

// ============================================
// SUPABASE STORAGE & DATABASE
// ============================================
async function ensureBucketExists() {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    console.error('Error listing buckets:', listError.message);
    return false;
  }

  const bucketExists = buckets.some(b => b.name === CONFIG.BUCKET_NAME);

  if (!bucketExists) {
    console.log(`Creating bucket: ${CONFIG.BUCKET_NAME}`);
    const { error: createError } = await supabase.storage.createBucket(CONFIG.BUCKET_NAME, {
      public: true,
      fileSizeLimit: 10485760, // 10MB
    });

    if (createError) {
      console.error('Error creating bucket:', createError.message);
      return false;
    }
  }

  return true;
}

async function uploadPhoto(listingId, photoBuffer, photoIndex) {
  const fileName = `${listingId}_${photoIndex}.jpg`;

  const { error } = await supabase.storage
    .from(CONFIG.BUCKET_NAME)
    .upload(fileName, photoBuffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) throw new Error(`Upload error: ${error.message}`);

  const { data: urlData } = supabase.storage
    .from(CONFIG.BUCKET_NAME)
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

async function saveToMenuImages(listingId, photoUrl, displayOrder, isHeader = false) {
  const { error } = await supabase
    .from('menu_images')
    .insert({
      listing_id: listingId,
      image_url: photoUrl,
      is_header: isHeader,
      display_order: displayOrder,
    });

  if (error) throw new Error(`Database insert error: ${error.message}`);
}

async function clearExistingMenuImages(listingId) {
  const { error } = await supabase
    .from('menu_images')
    .delete()
    .eq('listing_id', listingId);

  if (error) {
    console.warn(`  Warning: Could not clear existing images for ${listingId}: ${error.message}`);
  }
}

// ============================================
// MAIN PROCESSING
// ============================================
async function processListing(listing) {
  const { id, name, address } = listing;

  // Skip if already processed
  if (progress.processedIds.includes(id)) {
    stats.skippedListings++;
    return { status: 'skipped', reason: 'already processed' };
  }

  try {
    // 1. Search for place
    const place = await searchPlace(name, address);

    if (!place) {
      stats.noPlaceFound++;
      progress.processedIds.push(id);
      return { status: 'no_place', name };
    }

    // 2. Check for photos
    if (!place.photos || place.photos.length === 0) {
      stats.noPhotosAvailable++;
      progress.processedIds.push(id);
      return { status: 'no_photos', name };
    }

    // 3. Get up to MAX_PHOTOS_PER_PLACE photos
    const photosToFetch = place.photos.slice(0, CONFIG.MAX_PHOTOS_PER_PLACE);
    const foodPhotos = [];

    for (const photo of photosToFetch) {
      try {
        await delay(CONFIG.DELAY_BETWEEN_PHOTOS);

        // Download photo
        const photoBuffer = await getPlacePhoto(photo.name);
        stats.totalPhotosAnalyzed++;

        if (isDryRun) {
          // In dry run, pretend all photos are food
          foodPhotos.push({ buffer: photoBuffer, labels: ['dry-run'] });
          if (foodPhotos.length >= CONFIG.MAX_FOOD_PHOTOS_TO_SAVE) break;
          continue;
        }

        // Analyze with Vision API
        const labels = await analyzeImageWithVision(photoBuffer);
        const { isFood, matchedLabel } = isFoodPhoto(labels);

        if (isFood) {
          stats.foodPhotosFound++;
          foodPhotos.push({ buffer: photoBuffer, matchedLabel });

          if (foodPhotos.length >= CONFIG.MAX_FOOD_PHOTOS_TO_SAVE) break;
        }
      } catch (photoError) {
        console.log(`    Photo fetch/analyze error: ${photoError.message}`);
      }
    }

    // 4. Save food photos
    if (foodPhotos.length > 0 && !isDryRun) {
      // Clear existing images first
      await clearExistingMenuImages(id);

      for (let i = 0; i < foodPhotos.length; i++) {
        const photoUrl = await uploadPhoto(id, foodPhotos[i].buffer, i);
        await saveToMenuImages(id, photoUrl, i, i === 0);
        stats.photosSaved++;
      }
    }

    stats.successfulListings++;
    progress.processedIds.push(id);

    return {
      status: 'success',
      name,
      photosAnalyzed: photosToFetch.length,
      foodPhotosFound: foodPhotos.length,
    };

  } catch (error) {
    stats.failedListings++;
    stats.errors.push({ id, name, error: error.message });
    progress.processedIds.push(id);
    return { status: 'error', name, error: error.message };
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function calculateCosts() {
  // Google Places API (New) pricing:
  // - Text Search (Basic): $32 per 1,000 requests
  // - Place Photo: $7 per 1,000 requests
  // Cloud Vision API pricing:
  // - Label Detection: $1.50 per 1,000 images (first 1M/month)

  const placesSearchCost = (stats.placesApiCalls / 1000) * 32;
  const photoCost = (stats.photoApiCalls / 1000) * 7;
  const visionCost = (stats.visionApiCalls / 1000) * 1.5;

  return {
    placesSearch: placesSearchCost,
    photos: photoCost,
    vision: visionCost,
    total: placesSearchCost + photoCost + visionCost,
  };
}

function printBatchSummary(batchNum, batchListings) {
  const costs = calculateCosts();
  const duration = ((Date.now() - stats.startTime) / 1000).toFixed(1);

  console.log('\n' + '='.repeat(60));
  console.log(`BATCH ${batchNum} COMPLETE`);
  console.log('='.repeat(60));
  console.log('');
  console.log('PROGRESS:');
  console.log(`  Listings processed:    ${stats.processedListings} / ${stats.totalListings}`);
  console.log(`  Successful:            ${stats.successfulListings}`);
  console.log(`  Failed:                ${stats.failedListings}`);
  console.log(`  Skipped:               ${stats.skippedListings}`);
  console.log(`  No place found:        ${stats.noPlaceFound}`);
  console.log(`  No photos available:   ${stats.noPhotosAvailable}`);
  console.log('');
  console.log('API CALLS:');
  console.log(`  Places API (search):   ${stats.placesApiCalls}`);
  console.log(`  Places API (photos):   ${stats.photoApiCalls}`);
  console.log(`  Vision API:            ${stats.visionApiCalls}`);
  console.log('');
  console.log('PHOTOS:');
  console.log(`  Photos analyzed:       ${stats.totalPhotosAnalyzed}`);
  console.log(`  Food photos found:     ${stats.foodPhotosFound}`);
  console.log(`  Photos saved:          ${stats.photosSaved}`);
  console.log('');
  console.log('ESTIMATED COST SO FAR:');
  console.log(`  Places Search:         $${costs.placesSearch.toFixed(2)}`);
  console.log(`  Photo downloads:       $${costs.photos.toFixed(2)}`);
  console.log(`  Vision API:            $${costs.vision.toFixed(2)}`);
  console.log(`  TOTAL:                 $${costs.total.toFixed(2)}`);
  console.log('');
  console.log(`Duration: ${duration}s`);
  console.log('');

  if (stats.errors.length > 0) {
    console.log('Recent errors:');
    stats.errors.slice(-5).forEach(e => {
      console.log(`  - ${e.name}: ${e.error}`);
    });
    console.log('');
  }
}

// ============================================
// MAIN
// ============================================
async function main() {
  console.log('='.repeat(60));
  console.log('FOOD PHOTO FETCHER WITH VISION API FILTERING');
  console.log('='.repeat(60));
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes)' : 'LIVE'}`);
  console.log(`Resume: ${shouldResume ? 'Yes' : 'No'}`);
  if (startBatch > 1) console.log(`Starting from batch: ${startBatch}`);
  console.log('');

  stats.startTime = Date.now();

  // Load progress if resuming
  if (shouldResume) {
    loadProgress();
  }

  // Ensure bucket exists
  if (!isDryRun) {
    const bucketOk = await ensureBucketExists();
    if (!bucketOk) {
      console.error('Failed to ensure storage bucket exists');
      process.exit(1);
    }
  }

  // Fetch all listings
  console.log('Fetching listings from database...');
  const { data: listings, error: fetchError } = await supabase
    .from('food_listings')
    .select('id, name, address')
    .order('created_at', { ascending: true });

  if (fetchError) {
    console.error('Error fetching listings:', fetchError.message);
    process.exit(1);
  }

  stats.totalListings = listings.length;
  console.log(`Found ${stats.totalListings} total listings`);
  console.log('');

  // Calculate batches
  const totalBatches = Math.ceil(listings.length / CONFIG.BATCH_SIZE);
  const effectiveStartBatch = shouldResume ? progress.batchNumber : startBatch;

  console.log(`Total batches: ${totalBatches}`);
  console.log(`Starting from batch: ${effectiveStartBatch}`);
  console.log('');

  // Process batch by batch
  for (let batchNum = effectiveStartBatch; batchNum <= totalBatches; batchNum++) {
    const startIndex = (batchNum - 1) * CONFIG.BATCH_SIZE;
    const endIndex = Math.min(startIndex + CONFIG.BATCH_SIZE, listings.length);
    const batchListings = listings.slice(startIndex, endIndex);

    console.log('\n' + '-'.repeat(60));
    console.log(`BATCH ${batchNum}/${totalBatches} (listings ${startIndex + 1}-${endIndex})`);
    console.log('-'.repeat(60));

    for (const listing of batchListings) {
      stats.processedListings++;

      const result = await processListing(listing);

      const statusEmoji = {
        success: '✅',
        skipped: '⏭️',
        no_place: '❌',
        no_photos: '📷',
        error: '⚠️',
      }[result.status] || '?';

      const extra = result.foodPhotosFound !== undefined
        ? ` (${result.foodPhotosFound} food photos)`
        : '';

      console.log(`${statusEmoji} [${stats.processedListings}/${stats.totalListings}] ${listing.name.substring(0, 35)}... - ${result.status}${extra}`);

      await delay(CONFIG.DELAY_BETWEEN_LISTINGS);
    }

    // Update progress
    progress.batchNumber = batchNum + 1;
    progress.lastProcessedIndex = endIndex;
    saveProgress();

    // Print batch summary
    printBatchSummary(batchNum, batchListings);

    // Check if more batches remain
    const runAll = process.argv.includes('--all');
    if (batchNum < totalBatches && !runAll) {
      console.log('='.repeat(60));
      console.log('BATCH COMPLETE - WAITING FOR APPROVAL');
      console.log('='.repeat(60));
      console.log('');
      console.log('Run the script again to continue with the next batch.');
      console.log(`Next batch: ${batchNum + 1}/${totalBatches}`);
      console.log('');
      console.log('Commands:');
      console.log('  Continue:    node scripts/fetch-food-photos-batch.js --resume');
      console.log('  Run all:     node scripts/fetch-food-photos-batch.js --resume --all');
      console.log('  Dry run:     node scripts/fetch-food-photos-batch.js --resume --dry-run');
      console.log('');

      // Exit after each batch for cost control
      process.exit(0);
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('ALL BATCHES COMPLETE!');
  console.log('='.repeat(60));

  const costs = calculateCosts();
  console.log('');
  console.log('FINAL TOTALS:');
  console.log(`  Listings processed:    ${stats.processedListings}`);
  console.log(`  Photos saved:          ${stats.photosSaved}`);
  console.log(`  Total API cost:        $${costs.total.toFixed(2)}`);
  console.log('');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nInterrupted! Saving progress...');
  saveProgress();
  console.log('Progress saved. Run with --resume to continue.');
  process.exit(0);
});

// Run
main().catch(error => {
  console.error('Fatal error:', error);
  saveProgress();
  process.exit(1);
});
