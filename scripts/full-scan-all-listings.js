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
  const searchQuery = `${name} ${stationName} Singapore`;

  try {
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
  } catch (err) {
    return null;
  }
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log('=== FULL SCAN OF ALL FOOD LISTINGS ===\n');

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

  // Fetch ALL listings with pagination
  let allListings = [];
  let offset = 0;
  const batchSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('food_listings')
      .select('id, name, station_id, lat, lng, distance_to_station, walking_time')
      .eq('is_active', true)
      .not('lat', 'is', null)
      .not('lng', 'is', null)
      .range(offset, offset + batchSize - 1);

    if (error) {
      console.error('Error:', error);
      break;
    }
    if (!data || data.length === 0) break;
    allListings = allListings.concat(data);
    if (data.length < batchSize) break;
    offset += batchSize;
  }

  console.log(`Total listings with coordinates: ${allListings.length}\n`);

  let fixed = 0;
  let skipped = 0;
  let failed = 0;
  let alreadyCorrect = 0;

  for (let i = 0; i < allListings.length; i++) {
    const listing = allListings[i];
    const station = stationMap[listing.station_id];
    const stationName = station?.name || listing.station_id;
    const progress = `[${i + 1}/${allListings.length}]`;

    if (!station) {
      console.log(`${progress} ✗ ${listing.name}: Station not found`);
      failed++;
      continue;
    }

    // Check if coords are suspiciously close to station (within ~100m)
    const latDiff = Math.abs(listing.lat - station.lat);
    const lngDiff = Math.abs(listing.lng - station.lng);
    const isSuspicious = latDiff < 0.001 && lngDiff < 0.001;

    // Also check if walking time seems too short for the distance
    const expectedTime = Math.round(listing.distance_to_station / 80); // ~80m per minute
    const timeMismatch = listing.walking_time < 2 && listing.distance_to_station > 150;

    if (!isSuspicious && !timeMismatch) {
      // Looks fine, skip
      alreadyCorrect++;
      continue;
    }

    console.log(`${progress} Checking: ${listing.name} @ ${stationName}`);
    console.log(`  Current: ${listing.lat}, ${listing.lng} (${listing.distance_to_station}m, ${listing.walking_time}min)`);

    try {
      const result = await getCorrectCoordinates(listing.name, stationName);

      if (!result) {
        console.log(`  ✗ No Google result`);
        failed++;
        continue;
      }

      // Check if new coords are significantly different
      const newLatDiff = Math.abs(result.lat - listing.lat);
      const newLngDiff = Math.abs(result.lng - listing.lng);
      const isDifferent = newLatDiff > 0.0003 || newLngDiff > 0.0003;

      if (!isDifferent) {
        console.log(`  ⊘ Coords unchanged`);
        skipped++;
        continue;
      }

      // Calculate new walking distance
      const route = await getWalkingRoute(station.lat, station.lng, result.lat, result.lng);

      if (!route) {
        console.log(`  ✗ Could not calculate route`);
        failed++;
        continue;
      }

      console.log(`  Found: ${result.foundName}`);
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
        console.log(`  ✗ DB error: ${updateError.message}`);
        failed++;
      } else {
        console.log(`  ✓ Updated`);
        fixed++;
      }

      await delay(150);

    } catch (err) {
      console.log(`  ✗ Error: ${err.message}`);
      failed++;
    }

    // Refresh token every 300 requests
    if (i > 0 && i % 300 === 0) {
      console.log('\nRefreshing OneMap token...\n');
      await getToken();
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Total scanned: ${allListings.length}`);
  console.log(`Already correct: ${alreadyCorrect}`);
  console.log(`Fixed: ${fixed}`);
  console.log(`Skipped (coords same): ${skipped}`);
  console.log(`Failed: ${failed}`);
}

main().catch(console.error);
