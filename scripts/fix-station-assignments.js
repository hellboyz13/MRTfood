/**
 * Fix listings assigned to wrong stations
 * Updates station_id and recalculates walking distance using OneMap
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

// Haversine distance
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

  const a = Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fixStationAssignments() {
  console.log('Fetching stations and listings...\n');

  const { data: stations } = await supabase
    .from('stations')
    .select('id, name, lat, lng');

  const stationMap = new Map(stations.map(s => [s.id, s]));

  const { data: listings } = await supabase
    .from('food_listings')
    .select('id, name, station_id, lat, lng')
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .eq('is_active', true);

  console.log(`Checking ${listings.length} listings...\n`);

  let fixed = 0;
  let errors = 0;

  for (const listing of listings) {
    if (!listing.station_id) continue;

    const currentStation = stationMap.get(listing.station_id);
    if (!currentStation || !currentStation.lat) continue;

    // Find nearest station
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

    if (!nearestStation || nearestStation.id === listing.station_id) continue;

    const currentDist = haversine(listing.lat, listing.lng, currentStation.lat, currentStation.lng);
    const savings = currentDist - nearestDist;

    // Only fix if >100m savings
    if (savings <= 100) continue;

    console.log(`Fixing: ${listing.name}`);
    console.log(`  ${currentStation.name} -> ${nearestStation.name}`);

    try {
      // Get walking distance to new station
      const walkResult = await getWalkingDistance(
        nearestStation.lat, nearestStation.lng,
        listing.lat, listing.lng
      );

      console.log(`  Walking: ${walkResult.distance}m / ${walkResult.duration} min`);

      // Update database
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
        errors++;
      } else {
        console.log(`  FIXED!`);
        fixed++;
      }

      await sleep(200);
    } catch (err) {
      console.log(`  ERROR: ${err.message}`);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('FIX SUMMARY');
  console.log('='.repeat(50));
  console.log(`Fixed: ${fixed}`);
  console.log(`Errors: ${errors}`);
  console.log('='.repeat(50));
}

fixStationAssignments()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
