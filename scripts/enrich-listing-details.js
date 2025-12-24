const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchPlaceDetails(name, address) {
  const query = `${name} ${address || ''} Singapore`;

  const searchResponse = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.formattedAddress,places.regularOpeningHours,places.priceLevel,places.types,places.photos'
    },
    body: JSON.stringify({
      textQuery: query,
      maxResultCount: 1
    })
  });

  const data = await searchResponse.json();

  if (!data.places || !data.places[0]) {
    return null;
  }

  return data.places[0];
}

async function downloadAndUploadPhoto(listingId, photoName) {
  const photoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=400&maxWidthPx=400&key=${API_KEY}`;

  try {
    const response = await fetch(photoUrl);
    if (!response.ok) return null;

    const imageBuffer = await response.arrayBuffer();
    const fileName = `${listingId}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('restaurant-photos')
      .upload(fileName, imageBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (uploadError) {
      console.log(`    Photo upload error: ${uploadError.message}`);
      return null;
    }

    const { data: urlData } = supabase.storage.from('restaurant-photos').getPublicUrl(fileName);
    return urlData.publicUrl;
  } catch (e) {
    console.log(`    Photo download error: ${e.message}`);
    return null;
  }
}

function convertPriceLevel(priceLevel) {
  switch (priceLevel) {
    case 'PRICE_LEVEL_FREE': return '$';
    case 'PRICE_LEVEL_INEXPENSIVE': return '$';
    case 'PRICE_LEVEL_MODERATE': return '$$';
    case 'PRICE_LEVEL_EXPENSIVE': return '$$$';
    case 'PRICE_LEVEL_VERY_EXPENSIVE': return '$$$$';
    default: return null;
  }
}

function extractCategory(types) {
  if (!types) return null;

  const categoryMap = {
    'japanese_restaurant': 'Japanese',
    'chinese_restaurant': 'Chinese',
    'korean_restaurant': 'Korean',
    'thai_restaurant': 'Thai',
    'vietnamese_restaurant': 'Vietnamese',
    'indian_restaurant': 'Indian',
    'italian_restaurant': 'Italian',
    'american_restaurant': 'Western',
    'french_restaurant': 'French',
    'mexican_restaurant': 'Mexican',
    'seafood_restaurant': 'Seafood',
    'steak_house': 'Steakhouse',
    'vegetarian_restaurant': 'Vegetarian',
    'cafe': 'Cafe',
    'bakery': 'Bakery',
    'dessert_shop': 'Desserts',
    'ice_cream_shop': 'Desserts',
    'coffee_shop': 'Cafe',
    'ramen_restaurant': 'Japanese',
    'sushi_restaurant': 'Japanese',
    'noodle_restaurant': 'Noodles',
    'dim_sum_restaurant': 'Chinese',
    'hawker_stall': 'Hawker',
    'food_court': 'Food Court',
    'bar': 'Bar',
    'fast_food_restaurant': 'Fast Food',
  };

  for (const type of types) {
    if (categoryMap[type]) {
      return categoryMap[type];
    }
  }

  return 'Restaurant';
}

async function main() {
  console.log('=== ENRICHING LISTING DETAILS ===\n');

  // Get all listings that are missing key details
  const { data: listings, error } = await supabase
    .from('food_listings')
    .select('id, name, address, lat, lng, image_url, opening_hours, tags, phone, website, google_place_id')
    .eq('is_active', true)
    .not('lat', 'is', null)
    .or('image_url.is.null,opening_hours.is.null');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${listings.length} listings missing details\n`);

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    const progress = `[${i + 1}/${listings.length}]`;

    console.log(`${progress} ${listing.name}`);

    try {
      const place = await fetchPlaceDetails(listing.name, listing.address);

      if (!place) {
        console.log(`  ✗ Not found on Google`);
        failed++;
        continue;
      }

      const updates = {};

      // Opening hours
      if (!listing.opening_hours && place.regularOpeningHours) {
        updates.opening_hours = place.regularOpeningHours;
        console.log(`  + Opening hours`);
      }

      // Address
      if (!listing.address && place.formattedAddress) {
        updates.address = place.formattedAddress;
        console.log(`  + Address`);
      }

      // Tags/Category
      if (!listing.tags && place.types) {
        const category = extractCategory(place.types);
        if (category) {
          updates.tags = [category];
          console.log(`  + Tags: ${category}`);
        }
      }

      // Google Place ID
      if (!listing.google_place_id && place.id) {
        updates.google_place_id = place.id;
        console.log(`  + Google Place ID`);
      }

      // Photo
      if (!listing.image_url && place.photos && place.photos[0]) {
        const photoUrl = await downloadAndUploadPhoto(listing.id, place.photos[0].name);
        if (photoUrl) {
          updates.image_url = photoUrl;
          console.log(`  + Photo uploaded`);
        }
      }

      // Update if we have changes
      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('food_listings')
          .update(updates)
          .eq('id', listing.id);

        if (updateError) {
          console.log(`  ✗ DB error: ${updateError.message}`);
          failed++;
        } else {
          console.log(`  ✓ Updated`);
          updated++;
        }
      } else {
        console.log(`  ⊘ No new details`);
      }

      await delay(200);

    } catch (err) {
      console.log(`  ✗ Error: ${err.message}`);
      failed++;
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Updated: ${updated}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${listings.length}`);
}

main().catch(console.error);
