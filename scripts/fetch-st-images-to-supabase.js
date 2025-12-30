const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Search for a place using Google Places API (New)
async function searchPlace(name, lat, lng) {
  const url = 'https://places.googleapis.com/v1/places:searchText';

  const body = {
    textQuery: name + ' Singapore',
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
      const foodKeywords = ['food', 'dish', 'cuisine', 'meal', 'plate', 'bowl', 'rice', 'noodle', 'soup', 'meat', 'vegetable', 'dessert', 'drink', 'beverage', 'coffee', 'tea', 'cake', 'bread', 'pasta', 'pizza', 'sushi', 'seafood', 'salad', 'sandwich', 'burger', 'ice cream', 'gelato', 'pastry', 'croissant', 'donut', 'doughnut', 'wine', 'cocktail'];

      // Non-food keywords to reject
      const rejectKeywords = ['person', 'people', 'human', 'face', 'man', 'woman', 'building', 'architecture', 'interior', 'exterior', 'room', 'furniture', 'table', 'chair', 'window', 'door', 'wall', 'ceiling', 'floor', 'street', 'car', 'vehicle', 'selfie', 'portrait'];

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

// Download image and upload to Supabase storage
async function downloadAndUpload(imageUrl, listingSlug, index) {
  try {
    // Download image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine content type
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.includes('png') ? 'png' : 'jpg';

    // Upload to Supabase storage
    const path = `listings/${listingSlug}/menu/${index}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('restaurant-photos')
      .upload(path, buffer, {
        contentType,
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Return public URL
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/restaurant-photos/${path}`;
    return publicUrl;
  } catch (err) {
    console.log(`    Download/upload error: ${err.message}`);
    return null;
  }
}

// Create URL-friendly slug from name
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function run() {
  console.log('='.repeat(60));
  console.log('FETCHING & UPLOADING IMAGES FOR ST FOOD 2025');
  console.log('='.repeat(60));

  // Get ST Food listing IDs from listing_sources
  const { data: sources } = await supabase
    .from('listing_sources')
    .select('listing_id')
    .eq('source_id', 'straits-times');

  const ids = sources.map(s => s.listing_id);

  // Get listing details
  const listings = [];
  for (const id of ids) {
    const { data } = await supabase
      .from('food_listings')
      .select('id, name, lat, lng')
      .eq('id', id)
      .single();
    if (data) listings.push(data);
  }

  console.log(`Processing ${listings.length} listings...\n`);

  for (const listing of listings) {
    const slug = slugify(listing.name);
    console.log(`\n--- ${listing.name} (${slug}) ---`);

    // Step 1: Find place on Google
    console.log('  Searching for place...');
    const place = await searchPlace(listing.name, listing.lat, listing.lng);

    if (!place) {
      console.log('  Place not found');
      continue;
    }

    console.log('  Found:', place.displayName?.text || place.id);

    // Step 2: Check photos
    if (!place.photos || place.photos.length === 0) {
      console.log('  No photos found');
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
        console.log(`FOOD (${analysis.labels.slice(0, 3).join(', ')})`);
        foodImages.push({
          url: photoUrl,
          score: analysis.foodScore,
          labels: analysis.labels
        });
      } else {
        console.log(`Skip (${analysis.labels.slice(0, 3).join(', ')})`);
      }

      await sleep(200); // Rate limit
    }

    // Step 4: Take top 5 food images
    const topFoodImages = foodImages
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    if (topFoodImages.length === 0) {
      console.log('  No food images passed vetting');
      continue;
    }

    console.log(`  Selected ${topFoodImages.length} food images`);

    // Step 5: Delete existing menu_images for this listing
    await supabase
      .from('menu_images')
      .delete()
      .eq('listing_id', listing.id);

    // Step 6: Download, upload to Supabase, and save to DB
    let thumbnailUrl = null;

    for (let i = 0; i < topFoodImages.length; i++) {
      const img = topFoodImages[i];
      process.stdout.write(`  Uploading ${i + 1}/${topFoodImages.length}... `);

      const supabaseUrl = await downloadAndUpload(img.url, slug, i + 1);

      if (supabaseUrl) {
        console.log('OK');

        // First image is header/thumbnail
        const isHeader = i === 0;
        if (isHeader) {
          thumbnailUrl = supabaseUrl;
        }

        // Save to menu_images
        const { error } = await supabase
          .from('menu_images')
          .insert({
            listing_id: listing.id,
            image_url: supabaseUrl,
            is_header: isHeader,
            display_order: i + 1
          });

        if (error) {
          console.log(`    DB error: ${error.message}`);
        }
      } else {
        console.log('FAILED');
      }

      await sleep(300);
    }

    // Step 7: Update thumbnail on food_listings
    if (thumbnailUrl) {
      await supabase
        .from('food_listings')
        .update({ image_url: thumbnailUrl })
        .eq('id', listing.id);
      console.log('  Thumbnail updated');
    }

    await sleep(500); // Rate limit between listings
  }

  console.log('\n' + '='.repeat(60));
  console.log('DONE');
  console.log('='.repeat(60));
}

run().catch(console.error);
