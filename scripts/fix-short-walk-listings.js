const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

let ACCESS_TOKEN = null;

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
    return true;
  }
  return false;
}

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
      distance: data.route_summary.total_distance,
      time: Math.round(data.route_summary.total_time / 60)
    };
  }
  return null;
}

async function getCorrectCoordinates(name, stationName) {
  const searchQuery = `${name} ${stationName} Singapore restaurant`;

  const searchResponse = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.location'
    },
    body: JSON.stringify({
      textQuery: searchQuery,
      maxResultCount: 1
    })
  });

  const searchData = await searchResponse.json();

  if (!searchData.places || !searchData.places[0] || !searchData.places[0].location) {
    return null;
  }

  return {
    lat: searchData.places[0].location.latitude,
    lng: searchData.places[0].location.longitude,
    foundName: searchData.places[0].displayName?.text || 'Unknown'
  };
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log('=== FIXING LISTINGS WITH < 2 MIN WALK ===\n');

  if (!await getToken()) {
    console.error('Failed to get OneMap token');
    return;
  }

  // Get station coords
  const { data: stations } = await supabase
    .from('stations')
    .select('id, name, lat, lng');

  const stationMap = {};
  stations.forEach(s => stationMap[s.id] = { lat: s.lat, lng: s.lng, name: s.name });

  // Get all listings with < 2 min walk
  const { data: listings, error } = await supabase
    .from('food_listings')
    .select('id, name, station_id, lat, lng, distance_to_station, walking_time')
    .eq('is_active', true)
    .lt('walking_time', 2)
    .order('walking_time');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${listings.length} listings with < 2 min walk\n`);

  let fixed = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    const station = stationMap[listing.station_id];
    const stationName = station?.name || listing.station_id;
    const progress = `[${i + 1}/${listings.length}]`;

    console.log(`${progress} ${listing.name} @ ${stationName}`);

    try {
      const result = await getCorrectCoordinates(listing.name, stationName);

      if (!result) {
        console.log(`  ✗ No location found on Google`);
        failed++;
        continue;
      }

      // Check if new coords are significantly different
      const latDiff = Math.abs(result.lat - listing.lat);
      const lngDiff = Math.abs(result.lng - listing.lng);
      const isDifferent = latDiff > 0.0005 || lngDiff > 0.0005;

      if (!isDifferent) {
        console.log(`  ⊘ Coords unchanged - location is correct`);
        skipped++;
        continue;
      }

      // Calculate new walking distance
      const route = await getWalkingRoute(station.lat, station.lng, result.lat, result.lng);

      if (!route) {
        console.log(`  ✗ Could not calculate walking distance`);
        failed++;
        continue;
      }

      console.log(`  Found: ${result.foundName}`);
      console.log(`  Old: ${listing.lat}, ${listing.lng} (${listing.distance_to_station}m, ${listing.walking_time}min)`);
      console.log(`  New: ${result.lat}, ${result.lng} (${route.distance}m, ${route.time}min)`);

      // Update database
      const { error: updateError } = await supabase
        .from('food_listings')
        .update({
          lat: result.lat,
          lng: result.lng,
          distance_to_station: route.distance,
          walking_time: route.time
        })
        .eq('id', listing.id);

      if (updateError) {
        console.log(`  ✗ DB update failed: ${updateError.message}`);
        failed++;
      } else {
        console.log(`  ✓ Updated`);
        fixed++;
      }

      await delay(200);

    } catch (err) {
      console.log(`  ✗ Error: ${err.message}`);
      failed++;
    }
    console.log('');

    // Refresh token every 200 requests
    if (i > 0 && i % 200 === 0) {
      console.log('Refreshing OneMap token...\n');
      await getToken();
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Fixed: ${fixed}`);
  console.log(`Skipped (coords correct): ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${listings.length}`);
}

main().catch(console.error);
