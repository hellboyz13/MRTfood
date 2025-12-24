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

async function searchGoogle(query) {
  const searchResponse = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'places.displayName,places.location,places.formattedAddress'
    },
    body: JSON.stringify({
      textQuery: query,
      maxResultCount: 5
    })
  });

  return await searchResponse.json();
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log('=== FIXING WRONG BRANCH LISTINGS V2 ===\n');

  await getToken();

  // Get station coords
  const { data: stations } = await supabase
    .from('stations')
    .select('id, name, lat, lng');

  const stationMap = {};
  stations.forEach(s => stationMap[s.id] = { lat: s.lat, lng: s.lng, name: s.name });

  // Specific fixes with better search queries
  const fixes = [
    { name: 'New Ubin Seafood', stationId: 'springleaf', query: 'New Ubin Seafood Springleaf Sin Ming Singapore' },
    { name: 'Kinsa Sushi', stationId: 'hillview', query: 'Kinsa Sushi Hillview Singapore' },
    { name: 'Xiao Di Hokkien Mee', stationId: 'maxwell', query: 'Xiao Di Hokkien Mee Maxwell Food Centre Singapore' },
    { name: 'Hokkien Man Hokkien Mee', stationId: 'maxwell', query: 'Hokkien Man Hokkien Mee Maxwell Food Centre Singapore' },
    { name: 'Denzy Gelato', stationId: 'bishan', query: 'Denzy Gelato Bishan Singapore' },
    { name: 'Keong Saik Bakery', stationId: 'outram-park', query: 'Keong Saik Bakery Keong Saik Road Singapore' },
    { name: 'Ramen Hitoyoshi', stationId: 'stevens', query: 'Ramen Hitoyoshi Stevens Road Singapore' },
    { name: 'Nakhon Kitchen', stationId: 'kovan', query: 'Nakhon Kitchen Kovan Singapore' },
    { name: '58 Minced Meat Noodle', stationId: 'jurong-east', query: '58 Minced Meat Noodle Jurong East Singapore' },
    { name: 'Siri House', stationId: 'queenstown', query: 'Siri House Dempsey Singapore' },
    { name: 'Kotuwa', stationId: 'jalan-besar', query: 'Kotuwa Jalan Besar Singapore' },
    { name: 'Nakhon Kitchen', stationId: 'pasir-ris', query: 'Nakhon Kitchen Pasir Ris Singapore' },
    { name: '99 Old Trees', stationId: 'somerset', query: '99 Old Trees Durian Orchard Singapore' },
  ];

  for (const fix of fixes) {
    console.log(`=== ${fix.name} @ ${fix.stationId} ===`);

    const { data: listing } = await supabase
      .from('food_listings')
      .select('id, name, station_id, lat, lng, distance_to_station')
      .eq('is_active', true)
      .eq('station_id', fix.stationId)
      .ilike('name', `%${fix.name}%`)
      .single();

    if (!listing) {
      console.log('Listing not found\n');
      continue;
    }

    console.log(`Current: ${listing.distance_to_station}m`);
    console.log(`Searching: "${fix.query}"`);

    const results = await searchGoogle(fix.query);

    if (!results.places || results.places.length === 0) {
      console.log('No results\n');
      continue;
    }

    // Show all results
    console.log('Results:');
    results.places.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.displayName?.text} - ${p.formattedAddress?.substring(0, 50)}`);
    });

    // Pick closest to station
    const station = stationMap[fix.stationId];
    let bestPlace = null;
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

    if (!bestPlace || !bestPlace.location) {
      console.log('No valid location\n');
      continue;
    }

    const newLat = bestPlace.location.latitude;
    const newLng = bestPlace.location.longitude;

    console.log(`Best: ${bestPlace.displayName?.text}`);

    const route = await getWalkingRoute(station.lat, station.lng, newLat, newLng);

    if (!route) {
      console.log('Could not calculate distance\n');
      continue;
    }

    console.log(`New distance: ${route.distance}m, ${route.time}min`);

    // Only update if it's closer than current
    if (route.distance < listing.distance_to_station) {
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
        console.log(`Error: ${error.message}\n`);
      } else {
        console.log('✓ Updated\n');
      }
    } else {
      console.log('⊘ New distance not better, skipping\n');
    }

    await delay(300);
  }

  console.log('=== DONE ===');
}

main().catch(console.error);
