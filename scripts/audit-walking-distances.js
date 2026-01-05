/**
 * Audit walking distances for all food listings
 * Compares stored values with OneMap API calculations
 * Does NOT modify any data - report only
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

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

async function auditAllListings() {
  console.log('Fetching all food listings with coordinates...\n');

  // Get all food listings with coordinates
  const { data: listings, error } = await supabase
    .from('food_listings')
    .select('id, name, address, station_id, lat, lng, distance_to_station, walking_time')
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching listings:', error);
    return;
  }

  console.log(`Found ${listings.length} listings with coordinates\n`);

  // Get all stations
  const { data: stations, error: stationError } = await supabase
    .from('stations')
    .select('id, name, lat, lng');

  if (stationError) {
    console.error('Error fetching stations:', stationError);
    return;
  }

  const stationMap = new Map(stations.map(s => [s.id, s]));

  // Results tracking
  const results = {
    total: listings.length,
    checked: 0,
    skipped: 0,
    errors: 0,
    correct: 0,
    incorrect: [],
    missingStored: [],
  };

  // Threshold for "incorrect" (more than 20% difference or 50m, whichever is larger)
  const PERCENT_THRESHOLD = 20;
  const MIN_DIFF_THRESHOLD = 50;

  console.log('Checking listings (this may take a while due to API rate limits)...\n');

  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    const station = stationMap.get(listing.station_id);

    if (!station || !station.lat || !station.lng) {
      results.skipped++;
      continue;
    }

    try {
      const result = await getWalkingDistance(station.lat, station.lng, listing.lat, listing.lng);
      results.checked++;

      const storedDist = listing.distance_to_station;
      const storedTime = listing.walking_time;
      const apiDist = result.distance;
      const apiTime = result.duration;

      // Check if stored values exist
      if (!storedDist && !storedTime) {
        results.missingStored.push({
          id: listing.id,
          name: listing.name,
          station: station.name,
          apiDistance: apiDist,
          apiTime: apiTime,
        });
        continue;
      }

      // Check if distance is incorrect
      if (storedDist) {
        const diff = Math.abs(apiDist - storedDist);
        const pctDiff = (diff / storedDist) * 100;

        if (diff > MIN_DIFF_THRESHOLD && pctDiff > PERCENT_THRESHOLD) {
          results.incorrect.push({
            id: listing.id,
            name: listing.name,
            address: listing.address,
            station: station.name,
            storedDistance: storedDist,
            apiDistance: apiDist,
            distanceDiff: apiDist - storedDist,
            pctDiff: pctDiff.toFixed(1),
            storedTime: storedTime,
            apiTime: apiTime,
          });
        } else {
          results.correct++;
        }
      }

      // Progress update every 10 listings
      if ((i + 1) % 10 === 0) {
        console.log(`Progress: ${i + 1}/${listings.length} checked...`);
      }

      // Rate limiting - 200ms between requests
      await sleep(200);

    } catch (err) {
      results.errors++;
      console.error(`Error checking ${listing.name}: ${err.message}`);
      await sleep(500); // Longer delay on error
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('WALKING DISTANCE AUDIT SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total listings with coordinates: ${results.total}`);
  console.log(`Successfully checked: ${results.checked}`);
  console.log(`Skipped (no station coords): ${results.skipped}`);
  console.log(`API errors: ${results.errors}`);
  console.log(`Correct distances: ${results.correct}`);
  console.log(`Incorrect distances: ${results.incorrect.length}`);
  console.log(`Missing stored values: ${results.missingStored.length}`);
  console.log('='.repeat(60));

  if (results.incorrect.length > 0) {
    console.log('\nINCORRECT DISTANCES (>20% or >50m difference):');
    console.log('-'.repeat(60));

    // Sort by largest difference
    results.incorrect.sort((a, b) => Math.abs(b.distanceDiff) - Math.abs(a.distanceDiff));

    results.incorrect.forEach((item, idx) => {
      console.log(`\n${idx + 1}. ${item.name}`);
      console.log(`   Station: ${item.station}`);
      console.log(`   Stored: ${item.storedDistance}m / ${item.storedTime} min`);
      console.log(`   OneMap: ${item.apiDistance}m / ${item.apiTime} min`);
      console.log(`   Diff: ${item.distanceDiff > 0 ? '+' : ''}${item.distanceDiff}m (${item.pctDiff}%)`);
    });
  }

  if (results.missingStored.length > 0) {
    console.log('\n\nLISTINGS MISSING STORED DISTANCE/TIME:');
    console.log('-'.repeat(60));
    results.missingStored.slice(0, 10).forEach((item, idx) => {
      console.log(`${idx + 1}. ${item.name} @ ${item.station} - API: ${item.apiDistance}m / ${item.apiTime} min`);
    });
    if (results.missingStored.length > 10) {
      console.log(`... and ${results.missingStored.length - 10} more`);
    }
  }

  // Save detailed report to CSV
  const csvRows = [
    ['ID', 'Name', 'Station', 'Stored Distance (m)', 'API Distance (m)', 'Difference (m)', 'Diff %', 'Stored Time (min)', 'API Time (min)'].join(',')
  ];

  results.incorrect.forEach(item => {
    csvRows.push([
      item.id,
      `"${item.name.replace(/"/g, '""')}"`,
      item.station,
      item.storedDistance,
      item.apiDistance,
      item.distanceDiff,
      item.pctDiff,
      item.storedTime || '',
      item.apiTime,
    ].join(','));
  });

  fs.writeFileSync('walking-distance-audit.csv', csvRows.join('\n'));
  console.log('\n\nDetailed report saved to: walking-distance-audit.csv');

  return results;
}

auditAllListings()
  .then(() => {
    console.log('\nAudit complete.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
