/**
 * Script to fix restaurant locations using Google Places API
 * - Gets real addresses and coordinates for all restaurants
 * - Calculates distance to all MRT stations using Haversine formula
 * - Updates station_id to the nearest station
 */

import * as fs from 'fs';
import * as path from 'path';

const GOOGLE_PLACES_API_KEY = 'AIzaSyB2nTAy0K17gdWwlwJ2CYs4kbO0SUxYJvs';

// MRT Station coordinates (lat, lng)
const stationCoordinates: { [key: string]: { lat: number; lng: number; name: string } } = {
  // North-South Line (Red)
  'jurong-east': { lat: 1.3329, lng: 103.7422, name: 'Jurong East' },
  'bukit-batok': { lat: 1.3490, lng: 103.7495, name: 'Bukit Batok' },
  'bukit-gombak': { lat: 1.3587, lng: 103.7516, name: 'Bukit Gombak' },
  'choa-chu-kang': { lat: 1.3854, lng: 103.7444, name: 'Choa Chu Kang' },
  'yew-tee': { lat: 1.3973, lng: 103.7474, name: 'Yew Tee' },
  'kranji': { lat: 1.4252, lng: 103.7620, name: 'Kranji' },
  'marsiling': { lat: 1.4325, lng: 103.7741, name: 'Marsiling' },
  'woodlands': { lat: 1.4369, lng: 103.7865, name: 'Woodlands' },
  'admiralty': { lat: 1.4405, lng: 103.8009, name: 'Admiralty' },
  'sembawang': { lat: 1.4491, lng: 103.8200, name: 'Sembawang' },
  'canberra': { lat: 1.4432, lng: 103.8296, name: 'Canberra' },
  'yishun': { lat: 1.4293, lng: 103.8354, name: 'Yishun' },
  'khatib': { lat: 1.4174, lng: 103.8329, name: 'Khatib' },
  'yio-chu-kang': { lat: 1.3817, lng: 103.8449, name: 'Yio Chu Kang' },
  'ang-mo-kio': { lat: 1.3700, lng: 103.8495, name: 'Ang Mo Kio' },
  'bishan': { lat: 1.3513, lng: 103.8492, name: 'Bishan' },
  'braddell': { lat: 1.3404, lng: 103.8467, name: 'Braddell' },
  'toa-payoh': { lat: 1.3327, lng: 103.8471, name: 'Toa Payoh' },
  'novena': { lat: 1.3204, lng: 103.8439, name: 'Novena' },
  'newton': { lat: 1.3138, lng: 103.8378, name: 'Newton' },
  'orchard': { lat: 1.3044, lng: 103.8318, name: 'Orchard' },
  'somerset': { lat: 1.3007, lng: 103.8387, name: 'Somerset' },
  'dhoby-ghaut': { lat: 1.2994, lng: 103.8456, name: 'Dhoby Ghaut' },
  'city-hall': { lat: 1.2931, lng: 103.8520, name: 'City Hall' },
  'raffles-place': { lat: 1.2840, lng: 103.8514, name: 'Raffles Place' },
  'marina-bay': { lat: 1.2765, lng: 103.8545, name: 'Marina Bay' },
  'marina-south-pier': { lat: 1.2714, lng: 103.8632, name: 'Marina South Pier' },

  // East-West Line (Green)
  'pasir-ris': { lat: 1.3730, lng: 103.9493, name: 'Pasir Ris' },
  'tampines': { lat: 1.3545, lng: 103.9453, name: 'Tampines' },
  'simei': { lat: 1.3432, lng: 103.9532, name: 'Simei' },
  'tanah-merah': { lat: 1.3272, lng: 103.9463, name: 'Tanah Merah' },
  'bedok': { lat: 1.3240, lng: 103.9301, name: 'Bedok' },
  'kembangan': { lat: 1.3210, lng: 103.9128, name: 'Kembangan' },
  'eunos': { lat: 1.3197, lng: 103.9030, name: 'Eunos' },
  'paya-lebar': { lat: 1.3176, lng: 103.8932, name: 'Paya Lebar' },
  'aljunied': { lat: 1.3165, lng: 103.8829, name: 'Aljunied' },
  'kallang': { lat: 1.3114, lng: 103.8714, name: 'Kallang' },
  'lavender': { lat: 1.3073, lng: 103.8631, name: 'Lavender' },
  'bugis': { lat: 1.3009, lng: 103.8560, name: 'Bugis' },
  'tanjong-pagar': { lat: 1.2764, lng: 103.8456, name: 'Tanjong Pagar' },
  'outram-park': { lat: 1.2803, lng: 103.8393, name: 'Outram Park' },
  'tiong-bahru': { lat: 1.2863, lng: 103.8270, name: 'Tiong Bahru' },
  'redhill': { lat: 1.2894, lng: 103.8167, name: 'Redhill' },
  'queenstown': { lat: 1.2944, lng: 103.8060, name: 'Queenstown' },
  'commonwealth': { lat: 1.3024, lng: 103.7984, name: 'Commonwealth' },
  'buona-vista': { lat: 1.3074, lng: 103.7903, name: 'Buona Vista' },
  'dover': { lat: 1.3114, lng: 103.7786, name: 'Dover' },
  'clementi': { lat: 1.3151, lng: 103.7652, name: 'Clementi' },
  'chinese-garden': { lat: 1.3424, lng: 103.7325, name: 'Chinese Garden' },
  'lakeside': { lat: 1.3443, lng: 103.7209, name: 'Lakeside' },
  'boon-lay': { lat: 1.3385, lng: 103.7060, name: 'Boon Lay' },
  'pioneer': { lat: 1.3375, lng: 103.6972, name: 'Pioneer' },
  'joo-koon': { lat: 1.3279, lng: 103.6787, name: 'Joo Koon' },
  'gul-circle': { lat: 1.3196, lng: 103.6606, name: 'Gul Circle' },
  'tuas-crescent': { lat: 1.3209, lng: 103.6491, name: 'Tuas Crescent' },
  'tuas-west-road': { lat: 1.3299, lng: 103.6397, name: 'Tuas West Road' },
  'tuas-link': { lat: 1.3406, lng: 103.6368, name: 'Tuas Link' },
  'expo': { lat: 1.3351, lng: 103.9617, name: 'Expo' },
  'changi-airport': { lat: 1.3574, lng: 103.9885, name: 'Changi Airport' },

  // North-East Line (Purple)
  'harbourfront': { lat: 1.2654, lng: 103.8209, name: 'HarbourFront' },
  'chinatown': { lat: 1.2847, lng: 103.8442, name: 'Chinatown' },
  'clarke-quay': { lat: 1.2887, lng: 103.8466, name: 'Clarke Quay' },
  'little-india': { lat: 1.3066, lng: 103.8494, name: 'Little India' },
  'farrer-park': { lat: 1.3124, lng: 103.8545, name: 'Farrer Park' },
  'boon-keng': { lat: 1.3194, lng: 103.8619, name: 'Boon Keng' },
  'potong-pasir': { lat: 1.3313, lng: 103.8687, name: 'Potong Pasir' },
  'woodleigh': { lat: 1.3392, lng: 103.8709, name: 'Woodleigh' },
  'serangoon': { lat: 1.3498, lng: 103.8736, name: 'Serangoon' },
  'kovan': { lat: 1.3600, lng: 103.8850, name: 'Kovan' },
  'hougang': { lat: 1.3712, lng: 103.8924, name: 'Hougang' },
  'buangkok': { lat: 1.3829, lng: 103.8929, name: 'Buangkok' },
  'sengkang': { lat: 1.3916, lng: 103.8954, name: 'Sengkang' },
  'punggol': { lat: 1.4052, lng: 103.9024, name: 'Punggol' },

  // Circle Line (Orange)
  'promenade': { lat: 1.2931, lng: 103.8610, name: 'Promenade' },
  'esplanade': { lat: 1.2937, lng: 103.8553, name: 'Esplanade' },
  'bras-basah': { lat: 1.2969, lng: 103.8507, name: 'Bras Basah' },
  'bayfront': { lat: 1.2818, lng: 103.8588, name: 'Bayfront' },
  'marymount': { lat: 1.3487, lng: 103.8394, name: 'Marymount' },
  'caldecott': { lat: 1.3374, lng: 103.8395, name: 'Caldecott' },
  'botanic-gardens': { lat: 1.3224, lng: 103.8155, name: 'Botanic Gardens' },
  'farrer-road': { lat: 1.3177, lng: 103.8073, name: 'Farrer Road' },
  'holland-village': { lat: 1.3117, lng: 103.7961, name: 'Holland Village' },
  'one-north': { lat: 1.2996, lng: 103.7872, name: 'one-north' },
  'kent-ridge': { lat: 1.2936, lng: 103.7846, name: 'Kent Ridge' },
  'haw-par-villa': { lat: 1.2825, lng: 103.7820, name: 'Haw Par Villa' },
  'pasir-panjang': { lat: 1.2760, lng: 103.7911, name: 'Pasir Panjang' },
  'labrador-park': { lat: 1.2721, lng: 103.8028, name: 'Labrador Park' },
  'telok-blangah': { lat: 1.2707, lng: 103.8098, name: 'Telok Blangah' },
  'nicoll-highway': { lat: 1.3004, lng: 103.8636, name: 'Nicoll Highway' },
  'stadium': { lat: 1.3028, lng: 103.8752, name: 'Stadium' },
  'mountbatten': { lat: 1.3064, lng: 103.8826, name: 'Mountbatten' },
  'dakota': { lat: 1.3084, lng: 103.8883, name: 'Dakota' },
  'macpherson': { lat: 1.3266, lng: 103.8900, name: 'MacPherson' },
  'tai-seng': { lat: 1.3356, lng: 103.8880, name: 'Tai Seng' },
  'bartley': { lat: 1.3423, lng: 103.8800, name: 'Bartley' },
  'lorong-chuan': { lat: 1.3516, lng: 103.8640, name: 'Lorong Chuan' },

  // Downtown Line (Blue)
  'bukit-panjang': { lat: 1.3785, lng: 103.7618, name: 'Bukit Panjang' },
  'cashew': { lat: 1.3694, lng: 103.7646, name: 'Cashew' },
  'hillview': { lat: 1.3626, lng: 103.7675, name: 'Hillview' },
  'beauty-world': { lat: 1.3413, lng: 103.7759, name: 'Beauty World' },
  'king-albert-park': { lat: 1.3355, lng: 103.7832, name: 'King Albert Park' },
  'sixth-avenue': { lat: 1.3307, lng: 103.7974, name: 'Sixth Avenue' },
  'tan-kah-kee': { lat: 1.3258, lng: 103.8076, name: 'Tan Kah Kee' },
  'stevens': { lat: 1.3200, lng: 103.8260, name: 'Stevens' },
  'rochor': { lat: 1.3037, lng: 103.8527, name: 'Rochor' },
  'downtown': { lat: 1.2794, lng: 103.8528, name: 'Downtown' },
  'telok-ayer': { lat: 1.2822, lng: 103.8486, name: 'Telok Ayer' },
  'fort-canning': { lat: 1.2923, lng: 103.8446, name: 'Fort Canning' },
  'bencoolen': { lat: 1.2985, lng: 103.8500, name: 'Bencoolen' },
  'jalan-besar': { lat: 1.3054, lng: 103.8553, name: 'Jalan Besar' },
  'bendemeer': { lat: 1.3138, lng: 103.8628, name: 'Bendemeer' },
  'geylang-bahru': { lat: 1.3214, lng: 103.8716, name: 'Geylang Bahru' },
  'mattar': { lat: 1.3271, lng: 103.8832, name: 'Mattar' },
  'ubi': { lat: 1.3299, lng: 103.8993, name: 'Ubi' },
  'kaki-bukit': { lat: 1.3349, lng: 103.9088, name: 'Kaki Bukit' },
  'bedok-north': { lat: 1.3346, lng: 103.9181, name: 'Bedok North' },
  'bedok-reservoir': { lat: 1.3368, lng: 103.9321, name: 'Bedok Reservoir' },
  'tampines-west': { lat: 1.3461, lng: 103.9384, name: 'Tampines West' },
  'tampines-east': { lat: 1.3563, lng: 103.9547, name: 'Tampines East' },
  'upper-changi': { lat: 1.3417, lng: 103.9613, name: 'Upper Changi' },
  'expo-dt': { lat: 1.3351, lng: 103.9617, name: 'Expo' },

  // Thomson-East Coast Line (Brown)
  'woodlands-north': { lat: 1.4488, lng: 103.7850, name: 'Woodlands North' },
  'woodlands-south': { lat: 1.4270, lng: 103.7934, name: 'Woodlands South' },
  'springleaf': { lat: 1.3974, lng: 103.8187, name: 'Springleaf' },
  'lentor': { lat: 1.3845, lng: 103.8362, name: 'Lentor' },
  'mayflower': { lat: 1.3714, lng: 103.8379, name: 'Mayflower' },
  'bright-hill': { lat: 1.3634, lng: 103.8334, name: 'Bright Hill' },
  'upper-thomson': { lat: 1.3540, lng: 103.8334, name: 'Upper Thomson' },
  'napier': { lat: 1.3067, lng: 103.8195, name: 'Napier' },
  'orchard-boulevard': { lat: 1.3023, lng: 103.8274, name: 'Orchard Boulevard' },
  'great-world': { lat: 1.2934, lng: 103.8359, name: 'Great World' },
  'havelock': { lat: 1.2877, lng: 103.8375, name: 'Havelock' },
  'maxwell': { lat: 1.2799, lng: 103.8450, name: 'Maxwell' },
  'shenton-way': { lat: 1.2762, lng: 103.8476, name: 'Shenton Way' },
  'gardens-by-the-bay': { lat: 1.2794, lng: 103.8697, name: 'Gardens by the Bay' },
  'tanjong-rhu': { lat: 1.2963, lng: 103.8757, name: 'Tanjong Rhu' },
  'katong-park': { lat: 1.3047, lng: 103.8857, name: 'Katong Park' },
  'tanjong-katong': { lat: 1.3065, lng: 103.8950, name: 'Tanjong Katong' },
  'marine-parade': { lat: 1.3024, lng: 103.9059, name: 'Marine Parade' },
  'marine-terrace': { lat: 1.3065, lng: 103.9133, name: 'Marine Terrace' },
  'siglap': { lat: 1.3113, lng: 103.9238, name: 'Siglap' },
  'bayshore': { lat: 1.3152, lng: 103.9396, name: 'Bayshore' },
};

// Haversine formula to calculate distance between two points
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}

// Find nearest station
function findNearestStation(lat: number, lng: number): { stationId: string; distance: number; name: string } {
  let nearest = { stationId: '', distance: Infinity, name: '' };

  for (const [stationId, coords] of Object.entries(stationCoordinates)) {
    const distance = haversineDistance(lat, lng, coords.lat, coords.lng);
    if (distance < nearest.distance) {
      nearest = { stationId, distance, name: coords.name };
    }
  }

  return nearest;
}

// Google Places API (New) - Text Search
async function searchPlace(restaurantName: string): Promise<{ address: string; lat: number; lng: number } | null> {
  const url = 'https://places.googleapis.com/v1/places:searchText';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location',
      },
      body: JSON.stringify({
        textQuery: `${restaurantName} Singapore restaurant`,
      }),
    });

    const data = await response.json();

    if (data.places && data.places.length > 0) {
      const place = data.places[0];
      return {
        address: place.formattedAddress,
        lat: place.location.latitude,
        lng: place.location.longitude,
      };
    }
    return null;
  } catch (error) {
    console.error(`Error searching for ${restaurantName}:`, error);
    return null;
  }
}

// Sleep function for rate limiting
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main function
async function fixLocations() {
  // Read the listings file
  const listingsPath = path.join(__dirname, '../data/listings.ts');
  let listingsContent = fs.readFileSync(listingsPath, 'utf-8');

  // Extract all listings
  const listingRegex = /\{\s*id:\s*'([^']+)'[\s\S]*?name:\s*'([^']+)'[\s\S]*?address:\s*'([^']*)'[\s\S]*?nearestMRT:\s*'([^']*)'/g;

  interface ListingInfo {
    id: string;
    name: string;
    currentAddress: string;
    currentMRT: string;
  }

  const listings: ListingInfo[] = [];
  let match;

  while ((match = listingRegex.exec(listingsContent)) !== null) {
    listings.push({
      id: match[1],
      name: match[2],
      currentAddress: match[3],
      currentMRT: match[4],
    });
  }

  console.log(`\n========== GOOGLE PLACES API LOCATION FIX ==========\n`);
  console.log(`Found ${listings.length} restaurants to process\n`);

  let updatedCount = 0;
  let stationChangeCount = 0;
  let addressAddedCount = 0;
  let notFoundCount = 0;

  const changes: string[] = [];

  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    console.log(`[${i + 1}/${listings.length}] Searching: ${listing.name}...`);

    const placeInfo = await searchPlace(listing.name);

    if (placeInfo) {
      const nearest = findNearestStation(placeInfo.lat, placeInfo.lng);

      // Clean the address (remove ", Singapore" suffix if present)
      let cleanAddress = placeInfo.address
        .replace(/, Singapore \d{6}$/, '')
        .replace(/, Singapore$/, '');

      // Escape single quotes for TypeScript
      cleanAddress = cleanAddress.replace(/'/g, "\\'");

      const stationChanged = nearest.stationId !== listing.currentMRT;
      const addressChanged = cleanAddress !== listing.currentAddress && cleanAddress.length > 0;

      if (stationChanged || addressChanged) {
        // Update the address in the content
        if (addressChanged) {
          const addressRegex = new RegExp(
            `(id:\\s*'${listing.id}'[\\s\\S]*?address:\\s*)'[^']*'`,
            'g'
          );
          const newContent = listingsContent.replace(addressRegex, `$1'${cleanAddress}'`);
          if (newContent !== listingsContent) {
            listingsContent = newContent;
            addressAddedCount++;
          }
        }

        // Update the station in the content
        if (stationChanged) {
          const stationRegex = new RegExp(
            `(id:\\s*'${listing.id}'[\\s\\S]*?nearestMRT:\\s*)'[^']*'`,
            'g'
          );
          const newContent = listingsContent.replace(stationRegex, `$1'${nearest.stationId}'`);
          if (newContent !== listingsContent) {
            listingsContent = newContent;
            stationChangeCount++;
          }
        }

        updatedCount++;

        // Format the change message
        const distanceStr = `${Math.round(nearest.distance)}m`;
        if (stationChanged) {
          const oldStationName = stationCoordinates[listing.currentMRT]?.name || listing.currentMRT;
          changes.push(`${listing.name}: ${oldStationName} → ${nearest.name} (${distanceStr}) - ${cleanAddress.replace(/\\'/g, "'")}`);
        } else {
          changes.push(`${listing.name}: Added address - ${cleanAddress.replace(/\\'/g, "'")}`);
        }
      }
    } else {
      console.log(`  ⚠️  Not found on Google Places`);
      notFoundCount++;
    }

    // Rate limiting - 200ms between requests
    await sleep(200);
  }

  // Write the updated content back
  fs.writeFileSync(listingsPath, listingsContent, 'utf-8');

  console.log(`\n========== SUMMARY ==========\n`);
  console.log(`Total restaurants: ${listings.length}`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`Station changes: ${stationChangeCount}`);
  console.log(`Addresses added: ${addressAddedCount}`);
  console.log(`Not found on Google: ${notFoundCount}`);

  if (changes.length > 0) {
    console.log(`\n========== CHANGES ==========\n`);
    changes.forEach(change => console.log(change));
  }

  console.log(`\n========== COMPLETE ==========\n`);
}

fixLocations().catch(console.error);
