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

async function searchGooglePlaces(query) {
  const searchResponse = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.formattedAddress'
    },
    body: JSON.stringify({
      textQuery: query,
      maxResultCount: 3
    })
  });

  return await searchResponse.json();
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('=== FIXING OUTLIER LISTINGS ===\n');

  if (!await getToken()) {
    console.error('Failed to get OneMap token');
    return;
  }

  // Specific fixes for each outlier
  const outliers = [
    {
      name: 'Koung Wanton Noodle',
      stationId: 'tanjong-pagar',
      searchQuery: 'Koung Wantan Mee Hong Lim Food Centre Singapore',
      note: 'Should be at Hong Lim Food Centre near Tanjong Pagar'
    },
    {
      name: 'Kungfu JB Pau',
      stationId: 'kranji',
      searchQuery: 'Kung Fu JB Pau Kranji MRT Singapore',
      note: 'Should be near Kranji MRT'
    },
    {
      name: 'Mizzy Corner Nasi Lemak',
      stationId: 'changi-airport',
      searchQuery: 'Mizzy Corner Nasi Lemak Changi Singapore',
      note: 'Should be near Changi Airport'
    }
  ];

  // Get station coordinates
  const { data: stations } = await supabase
    .from('stations')
    .select('id, name, lat, lng');

  const stationMap = {};
  stations.forEach(s => {
    stationMap[s.id] = { lat: s.lat, lng: s.lng, name: s.name };
  });

  for (const outlier of outliers) {
    console.log(`\n=== ${outlier.name} ===`);
    console.log(`Note: ${outlier.note}`);
    console.log(`Searching: "${outlier.searchQuery}"`);

    const { data: listing } = await supabase
      .from('food_listings')
      .select('id, name, station_id, lat, lng, distance_to_station')
      .eq('is_active', true)
      .ilike('name', '%' + outlier.name + '%')
      .single();

    if (!listing) {
      console.log('Listing not found in database');
      continue;
    }

    console.log(`Current: ${listing.lat}, ${listing.lng} (${listing.distance_to_station}m)`);

    const results = await searchGooglePlaces(outlier.searchQuery);

    if (!results.places || results.places.length === 0) {
      console.log('No Google Places results');
      continue;
    }

    // Show all results
    console.log('\nGoogle Places results:');
    for (let i = 0; i < results.places.length; i++) {
      const place = results.places[i];
      console.log(`  ${i + 1}. ${place.displayName?.text}`);
      console.log(`     ${place.formattedAddress}`);
      console.log(`     Coords: ${place.location?.latitude}, ${place.location?.longitude}`);
    }

    // Pick the best result (first one for now, or closest to station)
    const station = stationMap[outlier.stationId];
    let bestPlace = results.places[0];
    let bestDist = Infinity;

    for (const place of results.places) {
      const lat = place.location?.latitude;
      const lng = place.location?.longitude;
      if (lat && lng && station) {
        const dist = Math.sqrt(Math.pow(lat - station.lat, 2) + Math.pow(lng - station.lng, 2));
        if (dist < bestDist) {
          bestDist = dist;
          bestPlace = place;
        }
      }
    }

    const newLat = bestPlace.location?.latitude;
    const newLng = bestPlace.location?.longitude;

    if (!newLat || !newLng) {
      console.log('No coordinates in best result');
      continue;
    }

    console.log(`\nBest match: ${bestPlace.displayName?.text}`);
    console.log(`New coords: ${newLat}, ${newLng}`);

    // Calculate walking distance
    const route = await getWalkingRoute(station.lat, station.lng, newLat, newLng);

    if (!route) {
      console.log('Could not calculate walking distance');
      continue;
    }

    console.log(`New distance: ${route.distance}m, ${route.time}min`);

    // Update database
    const { error } = await supabase
      .from('food_listings')
      .update({
        lat: newLat,
        lng: newLng,
        distance_to_station: route.distance,
        walking_time: route.time
      })
      .eq('id', listing.id);

    if (error) {
      console.log(`DB update failed: ${error.message}`);
    } else {
      console.log('✓ Updated successfully');
    }

    await delay(300);
  }

  console.log('\n=== DONE ===');
}

main().catch(console.error);
