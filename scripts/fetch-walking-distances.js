/**
 * Fetch walking distances from Google Maps API for listings missing this data
 *
 * Process:
 * 1. Find listings missing distance_to_station and walking_time
 * 2. For each listing, get coordinates from Google Places (via place_id or text search)
 * 3. Calculate distance to their assigned station
 * 4. Update the database with distance_to_station (meters)
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Use service role key for write operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// Station coordinates (from MRTMap.tsx)
const stationCoordinates = {
  'newton': { lat: 1.3138, lng: 103.8380 },
  'orchard': { lat: 1.3044, lng: 103.8318 },
  'dhoby-ghaut': { lat: 1.2993, lng: 103.8458 },
  'city-hall': { lat: 1.2931, lng: 103.8520 },
  'raffles-place': { lat: 1.2840, lng: 103.8514 },
  'marina-bay': { lat: 1.2765, lng: 103.8545 },
  'bayfront': { lat: 1.2815, lng: 103.8591 },
  'promenade': { lat: 1.2932, lng: 103.8610 },
  'bugis': { lat: 1.3008, lng: 103.8558 },
  'little-india': { lat: 1.3066, lng: 103.8494 },
  'chinatown': { lat: 1.2846, lng: 103.8442 },
  'outram-park': { lat: 1.2803, lng: 103.8395 },
  'harbourfront': { lat: 1.2653, lng: 103.8209 },
  'bishan': { lat: 1.3513, lng: 103.8491 },
  'serangoon': { lat: 1.3497, lng: 103.8734 },
  'paya-lebar': { lat: 1.3176, lng: 103.8932 },
  'macpherson': { lat: 1.3267, lng: 103.8900 },
  'jurong-east': { lat: 1.3331, lng: 103.7422 },
  'tampines': { lat: 1.3545, lng: 103.9453 },
  'expo': { lat: 1.3351, lng: 103.9617 },
  'tanah-merah': { lat: 1.3272, lng: 103.9463 },
  'buona-vista': { lat: 1.3074, lng: 103.7900 },
  'botanic-gardens': { lat: 1.3224, lng: 103.8150 },
  'stevens': { lat: 1.3200, lng: 103.8260 },
  'caldecott': { lat: 1.3376, lng: 103.8395 },
  'toa-payoh': { lat: 1.3327, lng: 103.8471 },
  'boon-keng': { lat: 1.3194, lng: 103.8618 },
  'farrer-park': { lat: 1.3118, lng: 103.8544 },
  'rochor': { lat: 1.3035, lng: 103.8525 },
  'lavender': { lat: 1.3072, lng: 103.8630 },
  'kallang': { lat: 1.3115, lng: 103.8714 },
  'aljunied': { lat: 1.3165, lng: 103.8829 },
  'eunos': { lat: 1.3198, lng: 103.9030 },
  'kembangan': { lat: 1.3209, lng: 103.9129 },
  'bedok': { lat: 1.3240, lng: 103.9300 },
  'simei': { lat: 1.3432, lng: 103.9533 },
  'pasir-ris': { lat: 1.3731, lng: 103.9493 },
  'yishun': { lat: 1.4295, lng: 103.8352 },
  'khatib': { lat: 1.4175, lng: 103.8329 },
  'sembawang': { lat: 1.4491, lng: 103.8200 },
  'admiralty': { lat: 1.4406, lng: 103.8009 },
  'woodlands': { lat: 1.4370, lng: 103.7865 },
  'marsiling': { lat: 1.4326, lng: 103.7743 },
  'kranji': { lat: 1.4251, lng: 103.7620 },
  'yew-tee': { lat: 1.3976, lng: 103.7475 },
  'choa-chu-kang': { lat: 1.3854, lng: 103.7443 },
  'bukit-gombak': { lat: 1.3588, lng: 103.7518 },
  'bukit-batok': { lat: 1.3490, lng: 103.7496 },
  'clementi': { lat: 1.3151, lng: 103.7652 },
  'dover': { lat: 1.3115, lng: 103.7788 },
  'holland-village': { lat: 1.3117, lng: 103.7960 },
  'commonwealth': { lat: 1.3025, lng: 103.7984 },
  'queenstown': { lat: 1.2945, lng: 103.8058 },
  'redhill': { lat: 1.2895, lng: 103.8168 },
  'tiong-bahru': { lat: 1.2863, lng: 103.8270 },
  'tanjong-pagar': { lat: 1.2767, lng: 103.8462 },
  'telok-ayer': { lat: 1.2822, lng: 103.8488 },
  'downtown': { lat: 1.2795, lng: 103.8527 },
  'fort-canning': { lat: 1.2925, lng: 103.8445 },
  'clarke-quay': { lat: 1.2889, lng: 103.8468 },
  'bras-basah': { lat: 1.2970, lng: 103.8508 },
  'esplanade': { lat: 1.2937, lng: 103.8553 },
  'nicoll-highway': { lat: 1.2997, lng: 103.8637 },
  'stadium': { lat: 1.3029, lng: 103.8752 },
  'mountbatten': { lat: 1.3064, lng: 103.8825 },
  'dakota': { lat: 1.3084, lng: 103.8885 },
  'tai-seng': { lat: 1.3359, lng: 103.8878 },
  'bartley': { lat: 1.3422, lng: 103.8799 },
  'lorong-chuan': { lat: 1.3517, lng: 103.8640 },
  'potong-pasir': { lat: 1.3313, lng: 103.8688 },
  'woodleigh': { lat: 1.3392, lng: 103.8707 },
  'kovan': { lat: 1.3601, lng: 103.8851 },
  'hougang': { lat: 1.3713, lng: 103.8924 },
  'buangkok': { lat: 1.3831, lng: 103.8930 },
  'sengkang': { lat: 1.3915, lng: 103.8954 },
  'punggol': { lat: 1.4052, lng: 103.9023 },
  'ang-mo-kio': { lat: 1.3700, lng: 103.8498 },
  'braddell': { lat: 1.3404, lng: 103.8466 },
  'marymount': { lat: 1.3489, lng: 103.8393 },
  'upper-thomson': { lat: 1.3547, lng: 103.8330 },
  'lentor': { lat: 1.3845, lng: 103.8363 },
  'mayflower': { lat: 1.3724, lng: 103.8381 },
  'bright-hill': { lat: 1.3634, lng: 103.8335 },
  'napier': { lat: 1.3068, lng: 103.8184 },
  'haw-par-villa': { lat: 1.2829, lng: 103.7818 },
  'pasir-panjang': { lat: 1.2761, lng: 103.7919 },
  'labrador-park': { lat: 1.2721, lng: 103.8025 },
  'telok-blangah': { lat: 1.2706, lng: 103.8097 },
  'kent-ridge': { lat: 1.2934, lng: 103.7847 },
  'one-north': { lat: 1.2996, lng: 103.7872 },
  'bukit-panjang': { lat: 1.3784, lng: 103.7620 },
  'cashew': { lat: 1.3690, lng: 103.7642 },
  'hillview': { lat: 1.3626, lng: 103.7676 },
  'beauty-world': { lat: 1.3411, lng: 103.7759 },
  'king-albert-park': { lat: 1.3355, lng: 103.7832 },
  'sixth-avenue': { lat: 1.3308, lng: 103.7973 },
  'tan-kah-kee': { lat: 1.3256, lng: 103.8074 },
  'farrer-road': { lat: 1.3175, lng: 103.8072 },
  'lakeside': { lat: 1.3441, lng: 103.7209 },
  'boon-lay': { lat: 1.3386, lng: 103.7063 },
  'pioneer': { lat: 1.3376, lng: 103.6972 },
  'joo-koon': { lat: 1.3278, lng: 103.6781 },
  'tuas-crescent': { lat: 1.3211, lng: 103.6492 },
  'tuas-west-road': { lat: 1.3299, lng: 103.6396 },
  'tuas-link': { lat: 1.3407, lng: 103.6369 },
  'kaki-bukit': { lat: 1.3349, lng: 103.9088 },
  'bedok-north': { lat: 1.3346, lng: 103.9181 },
  'bedok-reservoir': { lat: 1.3368, lng: 103.9323 },
  'upper-changi': { lat: 1.3417, lng: 103.9615 },
  'changi-airport': { lat: 1.3575, lng: 103.9884 },
  // Add more stations as needed
};

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c);
}

// Search for a place using Google Places API (New) - with station bias
async function searchPlace(name, stationId) {
  const stationCoord = stationCoordinates[stationId];
  if (!stationCoord) {
    console.log(`  ⚠️ Unknown station: ${stationId}`);
    return null;
  }

  const url = 'https://places.googleapis.com/v1/places:searchText';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location',
      },
      body: JSON.stringify({
        textQuery: `${name} Singapore`,
        locationBias: {
          circle: {
            center: { latitude: stationCoord.lat, longitude: stationCoord.lng },
            radius: 2000.0, // 2km radius around station
          },
        },
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.log(`  API Error: ${data.error.message}`);
      return null;
    }

    if (data.places && data.places.length > 0) {
      const place = data.places[0];
      return {
        lat: place.location.latitude,
        lng: place.location.longitude,
        placeId: place.id,
        formattedAddress: place.formattedAddress,
      };
    }
    return null;
  } catch (error) {
    console.error(`  Error searching for ${name}:`, error.message);
    return null;
  }
}

// Get place details using place_id - Places API (New)
async function getPlaceDetails(placeId) {
  // New API uses places/{place_id} format, but the place_id format differs
  // Legacy place_ids start with ChIJ, new API uses places/ prefix
  const placeName = placeId.startsWith('places/') ? placeId : `places/${placeId}`;
  const url = `https://places.googleapis.com/v1/${placeName}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': 'id,displayName,formattedAddress,location',
      },
    });

    const data = await response.json();

    if (data.error) {
      // Legacy place_id may not work with new API, return null to trigger text search
      console.log(`  Place details not available, will use text search`);
      return null;
    }

    if (data.location) {
      return {
        lat: data.location.latitude,
        lng: data.location.longitude,
        formattedAddress: data.formattedAddress,
      };
    }
    return null;
  } catch (error) {
    console.error(`  Error getting place details:`, error.message);
    return null;
  }
}

// Find the nearest station to a given coordinate
function findNearestStation(lat, lng) {
  let nearestStation = null;
  let nearestDistance = Infinity;

  for (const [stationId, coords] of Object.entries(stationCoordinates)) {
    const distance = calculateDistance(lat, lng, coords.lat, coords.lng);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestStation = stationId;
    }
  }

  return { stationId: nearestStation, distance: nearestDistance };
}

// Search for a place using Google Places API (New) - Text Search
async function searchPlaceGeneral(name) {
  const url = 'https://places.googleapis.com/v1/places:searchText';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location',
      },
      body: JSON.stringify({
        textQuery: `${name} Singapore restaurant`,
        locationBias: {
          circle: {
            center: { latitude: 1.3521, longitude: 103.8198 }, // Singapore center
            radius: 30000.0, // 30km radius covers Singapore
          },
        },
      }),
    });

    const data = await response.json();

    // Debug: Log API response
    if (data.error) {
      console.log(`  API Error: ${data.error.message}`);
      return null;
    }

    if (data.places && data.places.length > 0) {
      const place = data.places[0];
      return {
        lat: place.location.latitude,
        lng: place.location.longitude,
        placeId: place.id,
        formattedAddress: place.formattedAddress,
      };
    }

    console.log(`  No results found`);
    return null;
  } catch (error) {
    console.error(`  Error searching for ${name}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('=== Fetching Walking Distances ===\n');

  // Get listings missing distance data (including those without station_id)
  const { data: listings, error } = await supabase
    .from('food_listings')
    .select('id, name, station_id, address, google_place_id')
    .eq('is_active', true)
    .is('distance_to_station', null)
    .is('walking_time', null);

  if (error) {
    console.error('Error fetching listings:', error);
    return;
  }

  // Filter out those with generic addresses that won't geocode well
  const processable = listings.filter(l => {
    const addr = (l.address || '').toLowerCase();
    // Skip if address is too generic
    if (addr === 'singapore' || addr.includes('multiple outlets')) {
      return false;
    }
    return true;
  });

  const skipped = listings.length - processable.length;
  console.log(`Found ${listings.length} listings missing distance data`);
  console.log(`Skipping ${skipped} with generic addresses`);
  console.log(`Processing ${processable.length} listings\n`);

  let updated = 0;
  let failed = 0;

  for (const listing of processable) {
    console.log(`Processing: ${listing.name}`);
    if (listing.address) {
      console.log(`  Address: ${listing.address}`);
    }

    let location = null;

    // Try to get location from google_place_id first
    if (listing.google_place_id) {
      location = await getPlaceDetails(listing.google_place_id);
    }

    // If no place_id or it failed, try text search
    if (!location) {
      // If has station_id, use station-biased search
      if (listing.station_id) {
        location = await searchPlace(listing.name, listing.station_id);
      } else {
        // Otherwise, do general search
        location = await searchPlaceGeneral(listing.name);
      }
    }

    if (!location) {
      console.log(`  ❌ Could not find location`);
      failed++;
      continue;
    }

    // Find nearest station and calculate distance
    let stationId = listing.station_id;
    let distance;

    if (stationId) {
      // Calculate distance to assigned station
      const stationCoord = stationCoordinates[stationId];
      if (!stationCoord) {
        console.log(`  ❌ Unknown station: ${stationId}`);
        failed++;
        continue;
      }
      distance = calculateDistance(
        location.lat, location.lng,
        stationCoord.lat, stationCoord.lng
      );
    } else {
      // Find nearest station
      const nearest = findNearestStation(location.lat, location.lng);
      stationId = nearest.stationId;
      distance = nearest.distance;
    }

    console.log(`  📍 ${location.formattedAddress}`);
    console.log(`  🚇 Station: ${stationId}`);
    console.log(`  📏 Distance: ${distance}m`);

    // Update the database
    const updateData = {
      distance_to_station: distance,
    };

    // Also update station_id if it was missing
    if (!listing.station_id) {
      updateData.station_id = stationId;
    }

    // Also update google_place_id and address if we got them
    if (location.placeId && !listing.google_place_id) {
      updateData.google_place_id = location.placeId;
    }
    if (location.formattedAddress && (!listing.address || listing.address === 'Singapore')) {
      updateData.address = location.formattedAddress;
    }

    const { error: updateError } = await supabase
      .from('food_listings')
      .update(updateData)
      .eq('id', listing.id);

    if (updateError) {
      console.log(`  ❌ Update failed:`, updateError.message);
      failed++;
    } else {
      console.log(`  ✅ Updated`);
      updated++;
    }

    // Rate limiting - 100ms between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n=== Summary ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Failed: ${failed}`);
  console.log(`Skipped (generic address): ${skipped}`);
}

main().catch(console.error);
