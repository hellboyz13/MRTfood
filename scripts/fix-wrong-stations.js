/**
 * Fix listings assigned to wrong stations
 * Finds the nearest station based on coordinates
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// OneMap API
let cachedToken = null;
let tokenExpiry = 0;

async function getOneMapToken() {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const response = await fetch('https://www.onemap.gov.sg/api/auth/post/getToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.ONEMAP_EMAIL,
      password: process.env.ONEMAP_PASSWORD
    }),
  });

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiry = parseInt(data.expiry_timestamp) * 1000 - (60 * 60 * 1000);
  return cachedToken;
}

async function getWalkingDistance(startLat, startLng, endLat, endLng) {
  const token = await getOneMapToken();

  const url = new URL('https://www.onemap.gov.sg/api/public/routingsvc/route');
  url.searchParams.append('start', `${startLat},${startLng}`);
  url.searchParams.append('end', `${endLat},${endLng}`);
  url.searchParams.append('routeType', 'walk');

  const response = await fetch(url.toString(), {
    headers: { 'Authorization': token },
  });

  const data = await response.json();

  if (data.status !== 0) {
    throw new Error('Route not found');
  }

  return {
    distance: Math.round(data.route_summary.total_distance),
    duration: Math.round(data.route_summary.total_time / 60),
  };
}

// Haversine for quick distance check
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

  const a = Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fixWrongStations() {
  // Get all stations
  const { data: stations } = await supabase
    .from('stations')
    .select('id, name, lat, lng');

  console.log(`Loaded ${stations.length} stations\n`);

  // Find listings that are too far from their station (>1km walking)
  const { data: listings } = await supabase
    .from('food_listings')
    .select('id, name, station_id, lat, lng, distance_to_station, walking_time')
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .eq('is_active', true)
    .gt('distance_to_station', 1000); // More than 1km

  console.log(`Found ${listings.length} listings with >1km distance\n`);

  for (const listing of listings) {
    console.log(`\nChecking: ${listing.name}`);
    console.log(`  Current station: ${listing.station_id} (${listing.distance_to_station}m)`);

    // Find nearest station by straight-line distance
    let nearestStation = null;
    let nearestDist = Infinity;

    for (const station of stations) {
      if (!station.lat || !station.lng) continue;
      const dist = haversine(listing.lat, listing.lng, station.lat, station.lng);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestStation = station;
      }
    }

    if (!nearestStation) {
      console.log(`  No station found!`);
      continue;
    }

    console.log(`  Nearest station: ${nearestStation.name} (~${Math.round(nearestDist)}m straight-line)`);

    // Check if it's a different station
    if (nearestStation.id === listing.station_id) {
      console.log(`  Already at nearest station, skipping`);
      continue;
    }

    // Get actual walking distance to nearest station
    try {
      const walkResult = await getWalkingDistance(
        nearestStation.lat, nearestStation.lng,
        listing.lat, listing.lng
      );

      console.log(`  Walking distance to ${nearestStation.name}: ${walkResult.distance}m / ${walkResult.duration} min`);

      // Only update if new station is significantly closer
      if (walkResult.distance < listing.distance_to_station - 100) {
        const { error } = await supabase
          .from('food_listings')
          .update({
            station_id: nearestStation.id,
            distance_to_station: walkResult.distance,
            walking_time: walkResult.duration,
          })
          .eq('id', listing.id);

        if (error) {
          console.log(`  ERROR: ${error.message}`);
        } else {
          console.log(`  UPDATED: ${listing.station_id} -> ${nearestStation.id}`);
        }
      } else {
        console.log(`  Not significantly closer, skipping`);
      }

      await sleep(200);
    } catch (err) {
      console.log(`  ERROR: ${err.message}`);
    }
  }

  console.log('\nDone!');
}

fixWrongStations()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
