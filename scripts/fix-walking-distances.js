/**
 * Fix walking distances and times using OneMap API
 * Updates all listings with incorrect values
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// OneMap API functions
let cachedToken = null;
let tokenExpiry = 0;

async function getOneMapToken() {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const email = process.env.ONEMAP_EMAIL;
  const password = process.env.ONEMAP_PASSWORD;

  if (!email || !password) {
    throw new Error('OneMap credentials not configured');
  }

  const response = await fetch('https://www.onemap.gov.sg/api/auth/post/getToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(`Token request failed: ${response.status}`);
  }

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
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': token,
    },
  });

  if (!response.ok) {
    throw new Error(`OneMap API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.status !== 0 || !data.route_summary) {
    throw new Error(data.status_message || 'Route not found');
  }

  return {
    distance: Math.round(data.route_summary.total_distance),
    duration: Math.round(data.route_summary.total_time / 60),
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fixWalkingDistances() {
  console.log('Fetching listings that need fixing...\n');

  // Get all active listings with coordinates
  const { data: listings, error } = await supabase
    .from('food_listings')
    .select('id, name, station_id, lat, lng, distance_to_station, walking_time')
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching listings:', error);
    return;
  }

  // Get all stations
  const { data: stations, error: stationError } = await supabase
    .from('stations')
    .select('id, name, lat, lng');

  if (stationError) {
    console.error('Error fetching stations:', stationError);
    return;
  }

  const stationMap = new Map(stations.map(s => [s.id, s]));

  // Find listings that need fixing based on our criteria
  const needsFix = [];

  listings.forEach(listing => {
    const station = stationMap.get(listing.station_id);
    if (!station || !station.lat || !station.lng) return;

    const dist = listing.distance_to_station;
    const time = listing.walking_time;

    // Expected time based on distance (80m per minute)
    const expectedTime = dist ? dist / 80 : 0;

    // Flag if:
    // 1. Walking time way too high (short distance but >20 min)
    // 2. Walking time > 2x expected and diff > 3 min
    // 3. Missing time or distance
    let needsUpdate = false;

    if (!time || !dist) {
      needsUpdate = true;
    } else if (dist < 500 && time > 20) {
      needsUpdate = true;
    } else if (time > expectedTime * 2 && time - expectedTime > 3) {
      needsUpdate = true;
    }

    if (needsUpdate) {
      needsFix.push({ ...listing, station });
    }
  });

  console.log(`Found ${needsFix.length} listings that need fixing\n`);

  if (needsFix.length === 0) {
    console.log('Nothing to fix!');
    return;
  }

  // Fix each listing
  let fixed = 0;
  let errors = 0;

  for (let i = 0; i < needsFix.length; i++) {
    const listing = needsFix[i];
    const station = listing.station;

    console.log(`[${i + 1}/${needsFix.length}] Fixing: ${listing.name}`);
    console.log(`   Current: ${listing.distance_to_station}m / ${listing.walking_time} min`);

    try {
      const result = await getWalkingDistance(
        station.lat, station.lng,
        listing.lat, listing.lng
      );

      console.log(`   OneMap: ${result.distance}m / ${result.duration} min`);

      // Update database
      const { error: updateError } = await supabase
        .from('food_listings')
        .update({
          distance_to_station: result.distance,
          walking_time: result.duration,
        })
        .eq('id', listing.id);

      if (updateError) {
        console.log(`   ERROR updating: ${updateError.message}`);
        errors++;
      } else {
        console.log(`   FIXED!`);
        fixed++;
      }

      // Rate limiting
      await sleep(200);

    } catch (err) {
      console.log(`   ERROR: ${err.message}`);
      errors++;
      await sleep(500);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('FIX SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total needing fix: ${needsFix.length}`);
  console.log(`Successfully fixed: ${fixed}`);
  console.log(`Errors: ${errors}`);
  console.log('='.repeat(50));
}

fixWalkingDistances()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
