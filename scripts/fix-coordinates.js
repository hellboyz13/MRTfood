/**
 * Fix food listing coordinates and recalculate walking distances
 * Uses OneMap geocoding to get correct coordinates from addresses
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
    return null;
  }

  return {
    distance: Math.round(data.route_summary.total_distance),
    duration: Math.round(data.route_summary.total_time / 60),
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

async function geocodeAddress(address) {
  try {
    const cleanAddress = address
      .replace(/#\d+-\d+,?\s*/g, '')
      .replace(/Singapore\s*\d+/gi, '')
      .trim();

    const url = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(cleanAddress)}&returnGeom=Y&getAddrDetails=Y`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.results && data.results.length > 0) {
      return {
        lat: parseFloat(data.results[0].LATITUDE),
        lng: parseFloat(data.results[0].LONGITUDE),
      };
    }
    return null;
  } catch (err) {
    return null;
  }
}

async function fixCoordinates() {
  console.log('Fetching listings and stations...\n');

  const { data: listings } = await supabase
    .from('food_listings')
    .select('id, name, address, lat, lng, station_id')
    .not('lat', 'is', null)
    .not('address', 'is', null)
    .eq('is_active', true);

  const { data: stations } = await supabase
    .from('stations')
    .select('id, name, lat, lng');

  const stationMap = new Map(stations.map(s => [s.id, s]));

  console.log(`Found ${listings.length} listings to check\n`);

  let fixed = 0;
  let checked = 0;
  let skipped = 0;

  for (const listing of listings) {
    checked++;

    if (checked % 50 === 0) {
      console.log(`Progress: ${checked}/${listings.length} (fixed: ${fixed})...`);
    }

    // Skip if address is just "Singapore" or too vague
    if (!listing.address || listing.address.length < 10 || listing.address.toLowerCase() === 'singapore') {
      skipped++;
      continue;
    }

    const geocoded = await geocodeAddress(listing.address);
    await sleep(300);

    if (!geocoded) {
      continue;
    }

    const distance = haversine(listing.lat, listing.lng, geocoded.lat, geocoded.lng);

    // Only fix if coordinates are more than 200m apart
    if (distance <= 200) {
      continue;
    }

    console.log(`\nFixing: ${listing.name}`);
    console.log(`  Address: ${listing.address}`);
    console.log(`  Old coords: ${listing.lat}, ${listing.lng}`);
    console.log(`  New coords: ${geocoded.lat}, ${geocoded.lng}`);
    console.log(`  Difference: ${distance}m`);

    // Get station for walking distance
    const station = stationMap.get(listing.station_id);
    let walkingData = null;

    if (station && station.lat) {
      walkingData = await getWalkingDistance(station.lat, station.lng, geocoded.lat, geocoded.lng);
      await sleep(200);
    }

    // Update database
    const updateData = {
      lat: geocoded.lat,
      lng: geocoded.lng,
    };

    if (walkingData) {
      updateData.distance_to_station = walkingData.distance;
      updateData.walking_time = walkingData.duration;
      console.log(`  New walking: ${walkingData.distance}m / ${walkingData.duration} min`);
    }

    const { error } = await supabase
      .from('food_listings')
      .update(updateData)
      .eq('id', listing.id);

    if (error) {
      console.log(`  ERROR: ${error.message}`);
    } else {
      console.log(`  FIXED!`);
      fixed++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('FIX SUMMARY');
  console.log('='.repeat(50));
  console.log(`Checked: ${checked}`);
  console.log(`Skipped (vague address): ${skipped}`);
  console.log(`Fixed: ${fixed}`);
  console.log('='.repeat(50));
}

fixCoordinates()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
