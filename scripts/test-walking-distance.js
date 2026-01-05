/**
 * Test script for OneMap walking distance API
 * Tests one food listing to verify the API works correctly
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
    throw new Error('OneMap credentials not configured (ONEMAP_EMAIL, ONEMAP_PASSWORD)');
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
    const text = await response.text();
    throw new Error(`OneMap API error: ${response.status} - ${text}`);
  }

  const data = await response.json();

  if (data.status !== 0 || !data.route_summary) {
    throw new Error(data.status_message || 'Route not found');
  }

  return {
    distance: Math.round(data.route_summary.total_distance),
    duration: Math.round(data.route_summary.total_time / 60),
    success: true,
  };
}

// Haversine distance for comparison
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

async function testOneListing() {
  console.log('Fetching a food listing with coordinates...\n');

  // Get a food listing that has coordinates
  const { data: listing, error } = await supabase
    .from('food_listings')
    .select('id, name, address, station_id, lat, lng, distance_to_station, walking_time')
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .limit(1)
    .single();

  if (error || !listing) {
    console.error('Error fetching listing:', error);
    return;
  }

  console.log('Food Listing:');
  console.log(`   Name: ${listing.name}`);
  console.log(`   Address: ${listing.address}`);
  console.log(`   Station: ${listing.station_id}`);
  console.log(`   Food coordinates: ${listing.lat}, ${listing.lng}`);
  console.log(`   Current stored distance: ${listing.distance_to_station}m`);
  console.log(`   Current stored walk time: ${listing.walking_time} min\n`);

  // Get station coordinates
  const { data: station, error: stationError } = await supabase
    .from('stations')
    .select('id, name, lat, lng')
    .eq('id', listing.station_id)
    .single();

  if (stationError || !station) {
    console.error('Error fetching station:', stationError);
    return;
  }

  console.log('Station:');
  console.log(`   Name: ${station.name}`);
  console.log(`   Coordinates: ${station.lat}, ${station.lng}\n`);

  // Calculate straight-line distance
  const straightLine = haversineDistance(station.lat, station.lng, listing.lat, listing.lng);
  console.log(`Straight-line distance: ${straightLine}m\n`);

  // Get walking distance from OneMap
  console.log('Calling OneMap API...\n');

  try {
    const result = await getWalkingDistance(station.lat, station.lng, listing.lat, listing.lng);

    console.log('OneMap API Result:');
    console.log(`   Walking distance: ${result.distance}m`);
    console.log(`   Walking time: ${result.duration} min`);
    console.log(`   Success: ${result.success}\n`);

    // Compare with stored values
    console.log('Comparison:');
    if (listing.distance_to_station) {
      const distDiff = Math.abs(result.distance - listing.distance_to_station);
      const distPct = ((distDiff / listing.distance_to_station) * 100).toFixed(1);
      console.log(`   Distance difference: ${distDiff}m (${distPct}% ${result.distance > listing.distance_to_station ? 'more' : 'less'})`);
    } else {
      console.log(`   Distance: No stored value to compare`);
    }

    if (listing.walking_time) {
      const timeDiff = Math.abs(result.duration - listing.walking_time);
      console.log(`   Time difference: ${timeDiff} min (${result.duration > listing.walking_time ? 'more' : 'less'})`);
    } else {
      console.log(`   Walking time: No stored value to compare`);
    }

    return { success: true, listing, station, result };
  } catch (err) {
    console.error('OneMap API Error:', err.message);
    return { success: false, error: err.message };
  }
}

testOneListing()
  .then(result => {
    if (result?.success) {
      console.log('\nTest completed successfully! OneMap API is working.');
    } else {
      console.log('\nTest failed.');
    }
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
