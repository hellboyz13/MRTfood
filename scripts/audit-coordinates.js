/**
 * Audit food listing coordinates by comparing with address geocoding
 * Finds listings where stored coordinates don't match the address
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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

async function geocodeAddress(address) {
  try {
    // Clean up address for search
    const cleanAddress = address
      .replace(/#\d+-\d+,?\s*/g, '') // Remove unit numbers
      .replace(/Singapore\s*\d+/gi, '') // Remove postal code
      .trim();

    const url = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(cleanAddress)}&returnGeom=Y&getAddrDetails=Y`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.results && data.results.length > 0) {
      return {
        lat: parseFloat(data.results[0].LATITUDE),
        lng: parseFloat(data.results[0].LONGITUDE),
        matchedAddress: data.results[0].SEARCHVAL,
      };
    }
    return null;
  } catch (err) {
    return null;
  }
}

async function auditCoordinates() {
  console.log('Fetching food listings...\n');

  const { data: listings } = await supabase
    .from('food_listings')
    .select('id, name, address, lat, lng, station_id, distance_to_station')
    .not('lat', 'is', null)
    .not('address', 'is', null)
    .eq('is_active', true)
    .order('name');

  console.log(`Found ${listings.length} listings with coordinates and addresses\n`);

  const issues = [];
  let checked = 0;

  // Check a sample (first 100 for speed)
  const sample = listings.slice(0, 100);

  for (const listing of sample) {
    checked++;

    if (checked % 10 === 0) {
      console.log(`Progress: ${checked}/${sample.length}...`);
    }

    const geocoded = await geocodeAddress(listing.address);

    if (!geocoded) {
      continue;
    }

    const distance = haversine(listing.lat, listing.lng, geocoded.lat, geocoded.lng);

    // Flag if coordinates are more than 200m apart
    if (distance > 200) {
      issues.push({
        id: listing.id,
        name: listing.name,
        address: listing.address,
        storedLat: listing.lat,
        storedLng: listing.lng,
        geocodedLat: geocoded.lat,
        geocodedLng: geocoded.lng,
        matchedAddress: geocoded.matchedAddress,
        coordDiff: distance,
        station: listing.station_id,
      });
    }

    await sleep(300); // Rate limiting
  }

  console.log('\n' + '='.repeat(60));
  console.log('COORDINATE AUDIT SUMMARY');
  console.log('='.repeat(60));
  console.log(`Checked: ${checked} listings`);
  console.log(`Coordinate issues (>200m off): ${issues.length}`);
  console.log('='.repeat(60));

  if (issues.length > 0) {
    console.log('\nLISTINGS WITH WRONG COORDINATES:');
    console.log('-'.repeat(60));

    issues.sort((a, b) => b.coordDiff - a.coordDiff);

    issues.forEach((item, idx) => {
      console.log(`\n${idx + 1}. ${item.name}`);
      console.log(`   Address: ${item.address}`);
      console.log(`   Stored: ${item.storedLat}, ${item.storedLng}`);
      console.log(`   Geocoded: ${item.geocodedLat}, ${item.geocodedLng}`);
      console.log(`   Difference: ${item.coordDiff}m`);
    });

    // Save to CSV
    const csvRows = [
      ['ID', 'Name', 'Address', 'Stored Lat', 'Stored Lng', 'Geocoded Lat', 'Geocoded Lng', 'Diff (m)'].join(',')
    ];

    issues.forEach(item => {
      csvRows.push([
        item.id,
        `"${item.name.replace(/"/g, '""')}"`,
        `"${item.address.replace(/"/g, '""')}"`,
        item.storedLat,
        item.storedLng,
        item.geocodedLat,
        item.geocodedLng,
        item.coordDiff,
      ].join(','));
    });

    fs.writeFileSync('coordinate-audit.csv', csvRows.join('\n'));
    console.log('\n\nReport saved to: coordinate-audit.csv');
  }

  return issues;
}

auditCoordinates()
  .then(() => {
    console.log('\nAudit complete.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
