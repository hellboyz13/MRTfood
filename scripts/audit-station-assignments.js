/**
 * Audit all food listings to check if they're assigned to the correct station
 * Compares current station_id with the actual nearest station
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

async function auditStationAssignments() {
  console.log('Fetching all stations...\n');

  const { data: stations } = await supabase
    .from('stations')
    .select('id, name, lat, lng');

  console.log(`Loaded ${stations.length} stations\n`);

  console.log('Fetching all food listings with coordinates...\n');

  const { data: listings } = await supabase
    .from('food_listings')
    .select('id, name, address, station_id, lat, lng, distance_to_station')
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .eq('is_active', true);

  console.log(`Found ${listings.length} listings with coordinates\n`);

  const stationMap = new Map(stations.map(s => [s.id, s]));

  const wrongStation = [];
  const missingStation = [];

  for (const listing of listings) {
    if (!listing.station_id) {
      missingStation.push(listing);
      continue;
    }

    const currentStation = stationMap.get(listing.station_id);
    if (!currentStation || !currentStation.lat) continue;

    // Find nearest station
    let nearestStation = null;
    let nearestDist = Infinity;

    for (const station of stations) {
      if (!station.lat || !station.lng) continue;
      const dist = haversine(listing.lat, listing.lng, station.lat, station.lng);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestStation = station;
      }
    }

    if (!nearestStation) continue;

    // Check if assigned to wrong station
    if (nearestStation.id !== listing.station_id) {
      const currentDist = haversine(listing.lat, listing.lng, currentStation.lat, currentStation.lng);
      const savings = currentDist - nearestDist;

      // Only flag if significantly closer (>100m savings)
      if (savings > 100) {
        wrongStation.push({
          id: listing.id,
          name: listing.name,
          address: listing.address,
          currentStation: currentStation.name,
          currentStationId: listing.station_id,
          currentDist,
          nearestStation: nearestStation.name,
          nearestStationId: nearestStation.id,
          nearestDist,
          savings,
        });
      }
    }
  }

  // Sort by largest savings
  wrongStation.sort((a, b) => b.savings - a.savings);

  console.log('='.repeat(60));
  console.log('STATION ASSIGNMENT AUDIT');
  console.log('='.repeat(60));
  console.log(`Total listings checked: ${listings.length}`);
  console.log(`Listings at wrong station: ${wrongStation.length}`);
  console.log(`Listings missing station: ${missingStation.length}`);
  console.log('='.repeat(60));

  if (wrongStation.length > 0) {
    console.log('\nLISTINGS AT WRONG STATION (sorted by distance savings):');
    console.log('-'.repeat(60));

    wrongStation.forEach((item, idx) => {
      console.log(`\n${idx + 1}. ${item.name}`);
      console.log(`   Address: ${item.address || 'N/A'}`);
      console.log(`   Current: ${item.currentStation} (${item.currentDist}m)`);
      console.log(`   Nearest: ${item.nearestStation} (${item.nearestDist}m)`);
      console.log(`   Savings: ${item.savings}m closer`);
    });

    // Save to CSV
    const csvRows = [
      ['ID', 'Name', 'Address', 'Current Station', 'Current Dist (m)', 'Nearest Station', 'Nearest Dist (m)', 'Savings (m)'].join(',')
    ];

    wrongStation.forEach(item => {
      csvRows.push([
        item.id,
        `"${item.name.replace(/"/g, '""')}"`,
        `"${(item.address || '').replace(/"/g, '""')}"`,
        item.currentStation,
        item.currentDist,
        item.nearestStation,
        item.nearestDist,
        item.savings,
      ].join(','));
    });

    fs.writeFileSync('wrong-station-audit.csv', csvRows.join('\n'));
    console.log('\n\nDetailed report saved to: wrong-station-audit.csv');
  } else {
    console.log('\nAll listings are at their nearest station!');
  }

  return { wrongStation, missingStation };
}

auditStationAssignments()
  .then(() => {
    console.log('\nAudit complete.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
