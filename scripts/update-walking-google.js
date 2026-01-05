/**
 * Update all food listings with walking distance using Google Routes API
 * More accurate than OneMap for actual walking paths
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getGoogleWalkingDistance(stationLat, stationLng, foodLat, foodLng) {
  const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';

  const body = {
    origin: {
      location: {
        latLng: { latitude: stationLat, longitude: stationLng }
      }
    },
    destination: {
      location: {
        latLng: { latitude: foodLat, longitude: foodLng }
      }
    },
    travelMode: 'WALK'
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters'
    },
    body: JSON.stringify(body)
  });

  const data = await res.json();

  if (data.routes && data.routes.length > 0) {
    const route = data.routes[0];
    const distanceM = route.distanceMeters;
    const durationSec = parseInt(route.duration.replace('s', ''));
    const durationMin = Math.round(durationSec / 60);

    return { distance: distanceM, duration: durationMin, success: true };
  }

  return { success: false, error: data.error?.message || 'No route found' };
}

async function updateAllListings() {
  console.log('Fetching all food listings and stations...\n');

  const { data: listings } = await supabase
    .from('food_listings')
    .select('id, name, station_id, lat, lng, distance_to_station, walking_time')
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .eq('is_active', true);

  const { data: stations } = await supabase
    .from('stations')
    .select('id, name, lat, lng');

  const stationMap = new Map(stations.map(s => [s.id, s]));

  console.log(`Total listings to update: ${listings.length}`);
  console.log(`Estimated cost: ~$${(listings.length / 1000 * 5).toFixed(2)}\n`);
  console.log('Starting updates...\n');

  let updated = 0;
  let errors = 0;
  let skipped = 0;

  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    const station = stationMap.get(listing.station_id);

    if (!station || !station.lat || !station.lng) {
      skipped++;
      continue;
    }

    try {
      const result = await getGoogleWalkingDistance(
        station.lat, station.lng,
        listing.lat, listing.lng
      );

      if (result.success) {
        // Update database
        const { error } = await supabase
          .from('food_listings')
          .update({
            distance_to_station: result.distance,
            walking_time: result.duration,
          })
          .eq('id', listing.id);

        if (error) {
          console.log(`[${i + 1}/${listings.length}] ERROR ${listing.name}: ${error.message}`);
          errors++;
        } else {
          updated++;
        }
      } else {
        console.log(`[${i + 1}/${listings.length}] API ERROR ${listing.name}: ${result.error}`);
        errors++;
      }

      // Progress update every 50
      if ((i + 1) % 50 === 0) {
        console.log(`Progress: ${i + 1}/${listings.length} (updated: ${updated}, errors: ${errors})`);
      }

      // Rate limiting - 100ms between requests
      await sleep(100);

    } catch (err) {
      console.log(`[${i + 1}/${listings.length}] ERROR ${listing.name}: ${err.message}`);
      errors++;
      await sleep(500);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('UPDATE SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total listings: ${listings.length}`);
  console.log(`Updated: ${updated}`);
  console.log(`Errors: ${errors}`);
  console.log(`Skipped: ${skipped}`);
  console.log('='.repeat(50));
}

updateAllListings()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
