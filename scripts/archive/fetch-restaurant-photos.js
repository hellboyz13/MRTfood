/**
 * Fetch Restaurant Photos from Google Places API (New)
 *
 * This script:
 * 1. Fetches all listings from Supabase food_listings table
 * 2. Searches Google Places API using restaurant name + address
 * 3. Gets the first photo for each place
 * 4. Uploads photo to Supabase Storage
 * 5. Updates the listing with the photo URL
 *
 * Usage: node scripts/fetch-restaurant-photos.js [--resume] [--limit=N] [--dry-run]
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local', override: true });

// Configuration
const CONFIG = {
  DELAY_BETWEEN_REQUESTS: 200, // ms between API calls
  DELAY_BETWEEN_BATCHES: 2000, // ms between batches of 10
  BATCH_SIZE: 10,
  PROGRESS_FILE: './scripts/photo-progress.json',
  BUCKET_NAME: 'restaurant-photos',
  MAX_PHOTO_WIDTH: 400, // pixels
};

// Initialize clients
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;

if (!supabaseUrl || !supabaseServiceKey || !googleApiKey) {
  console.error('Missing required environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY, GOOGLE_PLACES_API_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Stats tracking
const stats = {
  total: 0,
  processed: 0,
  success: 0,
  failed: 0,
  skipped: 0,
  noPhoto: 0,
  errors: [],
  startTime: null,
  placesApiCalls: 0,
  photoApiCalls: 0,
};

// Progress tracking
let progress = {
  processedIds: [],
  lastProcessedIndex: 0,
};

// Parse command line arguments
const args = process.argv.slice(2);
const shouldResume = args.includes('--resume');
const isDryRun = args.includes('--dry-run');
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;

/**
 * Load progress from file
 */
function loadProgress() {
  try {
    if (fs.existsSync(CONFIG.PROGRESS_FILE)) {
      const data = fs.readFileSync(CONFIG.PROGRESS_FILE, 'utf8');
      progress = JSON.parse(data);
      console.log(`Loaded progress: ${progress.processedIds.length} already processed`);
    }
  } catch (error) {
    console.log('No previous progress found, starting fresh');
  }
}

/**
 * Save progress to file
 */
function saveProgress() {
  try {
    fs.writeFileSync(CONFIG.PROGRESS_FILE, JSON.stringify(progress, null, 2));
  } catch (error) {
    console.error('Failed to save progress:', error.message);
  }
}

/**
 * Create storage bucket if it doesn't exist
 */
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
      fileSizeLimit: 5242880, // 5MB
    });

    if (createError) {
      console.error('Error creating bucket:', createError.message);
      return false;
    }
    console.log('Bucket created successfully');
  } else {
    console.log(`Bucket ${CONFIG.BUCKET_NAME} already exists`);
  }

  return true;
}

/**
 * Add image_url column if it doesn't exist
 */
async function ensureImageUrlColumn() {
  // Try to query with image_url to see if column exists
  const { error } = await supabase
    .from('food_listings')
    .select('image_url')
    .limit(1);

  if (error && error.message.includes('image_url')) {
    console.log('Note: image_url column may need to be added manually in Supabase dashboard');
    return false;
  }

  console.log('image_url column exists');
  return true;
}

/**
 * Search for a place using Google Places API (New)
 */
async function searchPlace(name, address) {
  const query = `${name} ${address || ''} Singapore`.trim();

  const url = 'https://places.googleapis.com/v1/places:searchText';

  const response = await fetch(url, {
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
          center: { latitude: 1.3521, longitude: 103.8198 }, // Singapore center
          radius: 50000.0, // 50km radius
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
  return data.places && data.places[0] ? data.places[0] : null;
}

/**
 * Get photo from Google Places API (New)
 */
async function getPlacePhoto(photoName) {
  const url = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${CONFIG.MAX_PHOTO_WIDTH}&key=${googleApiKey}`;

  const response = await fetch(url, {
    redirect: 'follow',
  });

  stats.photoApiCalls++;

  if (!response.ok) {
    throw new Error(`Photo API error: ${response.status}`);
  }

  // The API returns the actual image
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Upload photo to Supabase Storage
 */
async function uploadToSupabase(listingId, photoBuffer) {
  const fileName = `${listingId}.jpg`;
  const filePath = fileName;

  const { data, error } = await supabase.storage
    .from(CONFIG.BUCKET_NAME)
    .upload(filePath, photoBuffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) {
    throw new Error(`Upload error: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(CONFIG.BUCKET_NAME)
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

/**
 * Update listing with photo URL
 */
async function updateListingPhoto(listingId, photoUrl) {
  const { error } = await supabase
    .from('food_listings')
    .update({ image_url: photoUrl })
    .eq('id', listingId);

  if (error) {
    throw new Error(`Update error: ${error.message}`);
  }
}

/**
 * Process a single listing
 */
async function processListing(listing) {
  const { id, name, address } = listing;

  // Skip if already processed
  if (progress.processedIds.includes(id)) {
    stats.skipped++;
    return { status: 'skipped', id };
  }

  // Skip if already has image
  if (listing.image_url && listing.image_url.startsWith('http')) {
    stats.skipped++;
    progress.processedIds.push(id);
    return { status: 'skipped', id, reason: 'already has image' };
  }

  try {
    // Search for place
    const place = await searchPlace(name, address);

    if (!place) {
      stats.noPhoto++;
      progress.processedIds.push(id);
      return { status: 'no_place', id, name };
    }

    // Check if place has photos
    if (!place.photos || place.photos.length === 0) {
      stats.noPhoto++;
      progress.processedIds.push(id);
      return { status: 'no_photo', id, name };
    }

    // Get first photo
    const photoName = place.photos[0].name;

    if (isDryRun) {
      console.log(`[DRY RUN] Would fetch photo for: ${name}`);
      stats.success++;
      progress.processedIds.push(id);
      return { status: 'dry_run', id, name };
    }

    // Download photo
    const photoBuffer = await getPlacePhoto(photoName);

    // Upload to Supabase
    const publicUrl = await uploadToSupabase(id, photoBuffer);

    // Update listing
    await updateListingPhoto(id, publicUrl);

    stats.success++;
    progress.processedIds.push(id);

    return { status: 'success', id, name, url: publicUrl };

  } catch (error) {
    stats.failed++;
    stats.errors.push({ id, name, error: error.message });
    progress.processedIds.push(id); // Mark as processed even on failure
    return { status: 'error', id, name, error: error.message };
  }
}

/**
 * Delay helper
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main function
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Restaurant Photo Fetcher');
  console.log('='.repeat(60));
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Resume: ${shouldResume ? 'Yes' : 'No'}`);
  if (limit) console.log(`Limit: ${limit} listings`);
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
      console.error('Failed to ensure bucket exists');
      process.exit(1);
    }

    const columnOk = await ensureImageUrlColumn();
    if (!columnOk) {
      console.warn('Warning: image_url column may not exist');
    }
  }

  // Fetch all listings
  console.log('Fetching listings from database...');

  let query = supabase
    .from('food_listings')
    .select('id, name, address, image_url')
    .order('id');

  if (limit) {
    query = query.limit(limit);
  }

  const { data: listings, error: fetchError } = await query;

  if (fetchError) {
    console.error('Error fetching listings:', fetchError.message);
    process.exit(1);
  }

  stats.total = listings.length;
  console.log(`Found ${stats.total} listings to process`);
  console.log('');

  // Process in batches
  for (let i = 0; i < listings.length; i += CONFIG.BATCH_SIZE) {
    const batch = listings.slice(i, i + CONFIG.BATCH_SIZE);
    const batchNum = Math.floor(i / CONFIG.BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(listings.length / CONFIG.BATCH_SIZE);

    console.log(`\nBatch ${batchNum}/${totalBatches}`);

    for (const listing of batch) {
      stats.processed++;

      const result = await processListing(listing);

      const statusEmoji = {
        success: '✅',
        skipped: '⏭️',
        no_place: '❌',
        no_photo: '📷',
        error: '⚠️',
        dry_run: '🔍',
      }[result.status] || '?';

      console.log(`  ${statusEmoji} [${stats.processed}/${stats.total}] ${listing.name.substring(0, 40)}... - ${result.status}`);

      // Delay between requests
      await delay(CONFIG.DELAY_BETWEEN_REQUESTS);
    }

    // Save progress after each batch
    saveProgress();

    // Delay between batches
    if (i + CONFIG.BATCH_SIZE < listings.length) {
      await delay(CONFIG.DELAY_BETWEEN_BATCHES);
    }
  }

  // Final summary
  const duration = (Date.now() - stats.startTime) / 1000;

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total listings:     ${stats.total}`);
  console.log(`Processed:          ${stats.processed}`);
  console.log(`Success:            ${stats.success}`);
  console.log(`Failed:             ${stats.failed}`);
  console.log(`Skipped:            ${stats.skipped}`);
  console.log(`No photo available: ${stats.noPhoto}`);
  console.log('');
  console.log(`Places API calls:   ${stats.placesApiCalls}`);
  console.log(`Photo API calls:    ${stats.photoApiCalls}`);
  console.log(`Duration:           ${duration.toFixed(1)}s`);
  console.log('');

  // Cost estimate (Google Places API pricing)
  // Text Search: $32 per 1000 requests (Basic), Photos: $7 per 1000 requests
  const textSearchCost = (stats.placesApiCalls / 1000) * 32;
  const photoCost = (stats.photoApiCalls / 1000) * 7;
  const totalCost = textSearchCost + photoCost;

  console.log('ESTIMATED COST (Google Places API):');
  console.log(`  Text Search:      $${textSearchCost.toFixed(2)}`);
  console.log(`  Photo requests:   $${photoCost.toFixed(2)}`);
  console.log(`  TOTAL:            $${totalCost.toFixed(2)}`);
  console.log('');

  if (stats.errors.length > 0) {
    console.log('ERRORS:');
    stats.errors.slice(0, 10).forEach(e => {
      console.log(`  - ${e.name}: ${e.error}`);
    });
    if (stats.errors.length > 10) {
      console.log(`  ... and ${stats.errors.length - 10} more`);
    }
  }

  console.log('\nDone!');
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
