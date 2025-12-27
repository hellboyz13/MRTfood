const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'sb_secret_J_vsb7RYUQ_0Dm2YTR_Fuw_O-ovCRlN'
);

// Haversine formula to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

async function fetchAllListings() {
  const allListings = [];
  const pageSize = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('food_listings')
      .select('id, name, station_id, lat, lng, address, distance_to_station')
      .not('lat', 'is', null)
      .not('lng', 'is', null)
      .not('station_id', 'is', null)
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('Error fetching listings:', error);
      break;
    }

    allListings.push(...data);
    console.log(`Fetched ${allListings.length} listings...`);

    if (data.length < pageSize) {
      hasMore = false;
    } else {
      offset += pageSize;
    }
  }

  return allListings;
}

async function main() {
  console.log('Fetching ALL food listings with coordinates (with pagination)...\n');

  const listings = await fetchAllListings();
  console.log(`\nTotal listings with coordinates: ${listings.length}\n`);

  // Get all stations with coordinates
  const { data: stations, error: stationsError } = await supabase
    .from('stations')
    .select('id, name, lat, lng');

  if (stationsError) {
    console.error('Error fetching stations:', stationsError);
    return;
  }

  console.log(`Found ${stations.length} stations\n`);

  // Create a map for quick station lookup
  const stationMap = {};
  stations.forEach(s => {
    stationMap[s.id] = s;
  });

  // Find listings > 1km from their assigned station
  const distantListings = [];

  for (const listing of listings) {
    const assignedStation = stationMap[listing.station_id];
    if (!assignedStation || !assignedStation.lat || !assignedStation.lng) {
      continue;
    }

    const distanceToAssigned = calculateDistance(
      listing.lat, listing.lng,
      assignedStation.lat, assignedStation.lng
    );

    if (distanceToAssigned > 1) {
      // Find the closest station
      let closestStation = null;
      let closestDistance = Infinity;

      for (const station of stations) {
        if (!station.lat || !station.lng) continue;

        const distance = calculateDistance(
          listing.lat, listing.lng,
          station.lat, station.lng
        );

        if (distance < closestDistance) {
          closestDistance = distance;
          closestStation = station;
        }
      }

      distantListings.push({
        id: listing.id,
        name: listing.name,
        address: listing.address,
        currentStation: assignedStation.name,
        currentStationId: listing.station_id,
        distanceToCurrentStation: distanceToAssigned.toFixed(2),
        distanceToCurrentStationDb: listing.distance_to_station,
        closestStation: closestStation?.name,
        closestStationId: closestStation?.id,
        distanceToClosestStation: closestDistance.toFixed(2),
        canRemap: closestStation && closestStation.id !== listing.station_id && closestDistance < distanceToAssigned
      });
    }
  }

  console.log('='.repeat(80));
  console.log(`LISTINGS > 1km FROM ASSIGNED STATION: ${distantListings.length}`);
  console.log('='.repeat(80));

  // Sort by distance to current station (furthest first)
  distantListings.sort((a, b) => parseFloat(b.distanceToCurrentStation) - parseFloat(a.distanceToCurrentStation));

  const canRemap = distantListings.filter(l => l.canRemap);
  const cannotRemap = distantListings.filter(l => !l.canRemap);

  // Check specifically for Bukit Panjang
  const bukitPanjangListings = distantListings.filter(l =>
    l.currentStationId === 'bukit-panjang' || l.currentStation === 'Bukit Panjang'
  );

  console.log(`\n*** BUKIT PANJANG LISTINGS > 1km: ${bukitPanjangListings.length} ***`);
  console.log('-'.repeat(80));
  for (const listing of bukitPanjangListings) {
    console.log(`\n${listing.name}`);
    console.log(`  Current: ${listing.currentStation} (${listing.distanceToCurrentStation} km)`);
    console.log(`  Closest: ${listing.closestStation} (${listing.distanceToClosestStation} km)`);
    console.log(`  Can remap: ${listing.canRemap ? 'YES' : 'NO'}`);
  }

  console.log(`\n\nCAN BE REMAPPED TO CLOSER STATION: ${canRemap.length}`);
  console.log('-'.repeat(80));

  for (const listing of canRemap) {
    console.log(`\n${listing.name}`);
    console.log(`  Current: ${listing.currentStation} (${listing.distanceToCurrentStation} km)`);
    console.log(`  Closer:  ${listing.closestStation} (${listing.distanceToClosestStation} km)`);
  }

  console.log(`\n\nCANNOT BE REMAPPED (already at closest): ${cannotRemap.length}`);
  console.log('-'.repeat(80));

  for (const listing of cannotRemap) {
    console.log(`\n${listing.name}`);
    console.log(`  Current: ${listing.currentStation} (${listing.distanceToCurrentStation} km)`);
    console.log(`  Closest: ${listing.closestStation} (${listing.distanceToClosestStation} km)`);
  }

  // Update station mappings for those that can be remapped
  if (canRemap.length > 0) {
    console.log('\n' + '='.repeat(80));
    console.log('UPDATING STATION MAPPINGS...');
    console.log('='.repeat(80));

    let updated = 0;
    for (const listing of canRemap) {
      const newDistanceMeters = Math.round(parseFloat(listing.distanceToClosestStation) * 1000);

      const { error } = await supabase
        .from('food_listings')
        .update({
          station_id: listing.closestStationId,
          distance_to_station: newDistanceMeters
        })
        .eq('id', listing.id);

      if (error) {
        console.error(`Failed to update ${listing.name}:`, error.message);
      } else {
        console.log(`✓ ${listing.name}: ${listing.currentStation} → ${listing.closestStation}`);
        updated++;
      }
    }

    console.log(`\nUpdated ${updated}/${canRemap.length} listings`);
  }

  // Save results
  const fs = require('fs');
  fs.writeFileSync(
    'scripts/distant-listings-results.json',
    JSON.stringify({ bukitPanjang: bukitPanjangListings, canRemap, cannotRemap, total: distantListings.length }, null, 2)
  );
  console.log('\nResults saved to scripts/distant-listings-results.json');
}

main().catch(console.error);
