/**
 * Fetch mall thumbnails using Google Places API
 * Uses Vision API to detect building/exterior photos (not food photos)
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Rate limiting
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Search for a place and get its place_id
async function searchPlace(mallName, address) {
  const query = `${mallName} ${address} Singapore`;
  const url = `https://places.googleapis.com/v1/places:searchText`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.photos'
    },
    body: JSON.stringify({
      textQuery: query,
      locationBias: {
        circle: {
          center: { latitude: 1.3521, longitude: 103.8198 },
          radius: 50000
        }
      },
      maxResultCount: 1
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Search failed: ${error}`);
  }

  const data = await response.json();
  return data.places?.[0] || null;
}

// Use Vision API to check if image is a building/exterior (not food)
async function isBuilidingPhoto(imageUrl) {
  const url = `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_API_KEY}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{
        image: { source: { imageUri: imageUrl } },
        features: [
          { type: 'LABEL_DETECTION', maxResults: 10 }
        ]
      }]
    })
  });

  if (!response.ok) {
    console.log('  Vision API failed, using photo anyway');
    return true; // Default to true if Vision fails
  }

  const data = await response.json();
  const labels = data.responses?.[0]?.labelAnnotations || [];
  const labelDescriptions = labels.map(l => l.description.toLowerCase());

  // Check for building-related labels
  const buildingKeywords = ['building', 'architecture', 'mall', 'shopping', 'facade', 'exterior', 'commercial', 'tower', 'structure', 'urban', 'city', 'plaza', 'complex'];
  const foodKeywords = ['food', 'dish', 'meal', 'cuisine', 'restaurant', 'plate', 'eating', 'drink', 'beverage', 'menu'];

  const hasBuilding = buildingKeywords.some(kw => labelDescriptions.some(l => l.includes(kw)));
  const hasFood = foodKeywords.some(kw => labelDescriptions.some(l => l.includes(kw)));

  console.log(`  Labels: ${labelDescriptions.slice(0, 5).join(', ')}`);

  // Prefer building photos, reject food photos
  if (hasFood && !hasBuilding) {
    return false;
  }
  return true;
}

// Get photo URL from photo reference
function getPhotoUrl(photoName, maxWidth = 400) {
  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}&key=${GOOGLE_API_KEY}`;
}

// Find best building photo from a list of photos
async function findBuildingPhoto(photos) {
  if (!photos || photos.length === 0) return null;

  // Try first 5 photos to find a building photo
  for (let i = 0; i < Math.min(5, photos.length); i++) {
    const photo = photos[i];
    const photoUrl = getPhotoUrl(photo.name, 400);

    console.log(`  Checking photo ${i + 1}...`);
    const isBuilding = await isBuilidingPhoto(photoUrl);

    if (isBuilding) {
      console.log(`  Found building photo at index ${i}`);
      return photoUrl;
    }

    await delay(500); // Rate limit Vision API
  }

  // If no building photo found, use first photo
  console.log('  No building photo found, using first photo');
  return getPhotoUrl(photos[0].name, 400);
}

async function fetchMallThumbnails() {
  console.log('Fetching mall thumbnails...\n');

  // Get all malls without thumbnails
  const { data: malls, error } = await supabase
    .from('malls')
    .select('id, name, address, thumbnail_url')
    .is('thumbnail_url', null)
    .order('name');

  if (error) {
    console.error('Error fetching malls:', error.message);
    return;
  }

  console.log(`Found ${malls.length} malls without thumbnails\n`);

  let success = 0;
  let failed = 0;

  for (const mall of malls) {
    console.log(`Processing: ${mall.name}`);

    try {
      // Search for the mall
      const place = await searchPlace(mall.name, mall.address || '');

      if (!place) {
        console.log('  No place found\n');
        failed++;
        continue;
      }

      if (!place.photos || place.photos.length === 0) {
        console.log('  No photos available\n');
        failed++;
        continue;
      }

      console.log(`  Found ${place.photos.length} photos`);

      // Find a building photo using Vision API
      const thumbnailUrl = await findBuildingPhoto(place.photos);

      if (thumbnailUrl) {
        // Update the mall with thumbnail
        const { error: updateError } = await supabase
          .from('malls')
          .update({ thumbnail_url: thumbnailUrl })
          .eq('id', mall.id);

        if (updateError) {
          console.log(`  Update failed: ${updateError.message}\n`);
          failed++;
        } else {
          console.log('  Saved thumbnail\n');
          success++;
        }
      } else {
        console.log('  Could not get photo URL\n');
        failed++;
      }

      // Rate limit
      await delay(1000);

    } catch (err) {
      console.log(`  Error: ${err.message}\n`);
      failed++;
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Success: ${success}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${malls.length}`);
}

// Run the script
fetchMallThumbnails().catch(console.error);
