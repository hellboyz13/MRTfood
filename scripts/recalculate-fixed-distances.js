const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

let ACCESS_TOKEN = null;

// Get fresh OneMap token
async function getToken() {
  const response = await fetch('https://www.onemap.gov.sg/api/auth/post/getToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.ONEMAP_EMAIL,
      password: process.env.ONEMAP_PASSWORD
    })
  });

  const data = await response.json();
  if (data.access_token) {
    ACCESS_TOKEN = data.access_token;
    console.log('Got fresh OneMap token');
    return true;
  }
  console.error('Failed to get token:', data);
  return false;
}

// Calculate walking route using OneMap
async function getWalkingRoute(startLat, startLng, endLat, endLng) {
  const url = 'https://www.onemap.gov.sg/api/public/routingsvc/route?' + new URLSearchParams({
    start: `${startLat},${startLng}`,
    end: `${endLat},${endLng}`,
    routeType: 'walk'
  });

  const response = await fetch(url, {
    headers: { 'Authorization': ACCESS_TOKEN }
  });

  const data = await response.json();

  if (data.status === 0 && data.route_summary) {
    return {
      distance: data.route_summary.total_distance, // meters
      time: Math.round(data.route_summary.total_time / 60) // convert to minutes
    };
  }

  return null;
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log('=== RECALCULATING WALKING DISTANCES FOR FIXED LISTINGS ===\n');

  // Get token
  if (!await getToken()) {
    console.error('Failed to get OneMap token');
    return;
  }

  // Get all MRT station coordinates
  const { data: stations } = await supabase
    .from('stations')
    .select('id, name, lat, lng');

  const stationMap = {};
  stations.forEach(s => {
    stationMap[s.id] = { lat: s.lat, lng: s.lng, name: s.name };
  });

  console.log(`Loaded ${stations.length} MRT stations\n`);

  // Get listings that were just fixed (distance <= 50m or just updated recently)
  // To be safe, let's recalculate ALL listings with distance <= 100m
  const { data: listings, error } = await supabase
    .from('food_listings')
    .select('id, name, station_id, lat, lng, distance_to_station, walking_time')
    .eq('is_active', true)
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .lte('distance_to_station', 100);

  if (error) {
    console.error('Error fetching listings:', error);
    return;
  }

  console.log(`Found ${listings.length} listings to recalculate\n`);

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    const progress = `[${i + 1}/${listings.length}]`;

    const station = stationMap[listing.station_id];
    if (!station) {
      console.log(`${progress} ✗ ${listing.name}: Station not found`);
      failed++;
      continue;
    }

    try {
      const route = await getWalkingRoute(station.lat, station.lng, listing.lat, listing.lng);

      if (!route) {
        console.log(`${progress} ✗ ${listing.name}: No route found`);
        failed++;
        continue;
      }

      const { error: updateError } = await supabase
        .from('food_listings')
        .update({
          distance_to_station: route.distance,
          walking_time: route.time
        })
        .eq('id', listing.id);

      if (updateError) {
        console.log(`${progress} ✗ ${listing.name}: DB error`);
        failed++;
      } else {
        const oldDist = listing.distance_to_station || 0;
        const oldTime = listing.walking_time || 0;
        console.log(`${progress} ✓ ${listing.name}: ${oldDist}m → ${route.distance}m, ${oldTime}min → ${route.time}min`);
        updated++;
      }

      await delay(100);

    } catch (err) {
      console.log(`${progress} ✗ ${listing.name}: ${err.message}`);
      failed++;
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Updated: ${updated}`);
  console.log(`Failed: ${failed}`);
}

main().catch(console.error);
