/**
 * Remap Malls to Closest MRT/LRT Station
 * Uses OneMap API to geocode malls and find closest station
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Haversine formula to calculate distance between two points
function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Geocode address using OneMap API
async function geocodeAddress(searchTerm) {
  try {
    const searchQuery = encodeURIComponent(searchTerm);
    const url = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${searchQuery}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      }
    });

    const text = await response.text();
    const data = JSON.parse(text);

    if (data.found > 0 && data.results && data.results.length > 0) {
      const result = data.results[0];
      return {
        lat: parseFloat(result.LATITUDE),
        lng: parseFloat(result.LONGITUDE),
        address: result.ADDRESS
      };
    }
    return null;
  } catch (error) {
    console.error('Geocode error:', error.message);
    return null;
  }
}

async function remapMalls() {
  // Get all stations with coordinates
  const { data: stations, error: stationError } = await supabase
    .from('stations')
    .select('id, name, lat, lng')
    .not('lat', 'is', null)
    .not('lng', 'is', null);

  if (stationError) {
    console.error('Error fetching stations:', stationError);
    return;
  }

  console.log(`Loaded ${stations.length} stations with coordinates`);

  // Get all malls (unique by name)
  const { data: allMalls, error: mallError } = await supabase
    .from('malls')
    .select('id, name, address, station_id');

  if (mallError) {
    console.error('Error fetching malls:', mallError);
    return;
  }

  // Dedupe malls by name (keep first occurrence)
  const seenNames = new Set();
  const malls = [];
  const duplicateIds = [];

  for (const mall of allMalls) {
    if (seenNames.has(mall.name)) {
      duplicateIds.push(mall.id);
    } else {
      seenNames.add(mall.name);
      malls.push(mall);
    }
  }

  console.log(`Found ${allMalls.length} mall records, ${malls.length} unique, ${duplicateIds.length} duplicates to remove`);

  // Delete duplicate mall records first
  if (duplicateIds.length > 0) {
    // Delete outlets for duplicate malls
    const { error: delOutletErr } = await supabase
      .from('mall_outlets')
      .delete()
      .in('mall_id', duplicateIds);

    if (delOutletErr) console.error('Error deleting duplicate outlets:', delOutletErr);

    // Delete duplicate malls
    const { error: delMallErr } = await supabase
      .from('malls')
      .delete()
      .in('id', duplicateIds);

    if (delMallErr) console.error('Error deleting duplicate malls:', delMallErr);
    else console.log(`✓ Removed ${duplicateIds.length} duplicate mall records`);
  }

  console.log('\nGeocoding and remapping malls...\n');

  const results = [];

  for (let i = 0; i < malls.length; i++) {
    const mall = malls[i];
    console.log(`[${i + 1}/${malls.length}] ${mall.name}`);

    // Geocode the mall - try name first, then address
    let geo = await geocodeAddress(mall.name);
    if (!geo && mall.address) {
      geo = await geocodeAddress(mall.address);
    }

    if (!geo) {
      console.log(`  ✗ Could not geocode`);
      results.push({ mall: mall.name, status: 'geocode_failed' });
      await delay(200);
      continue;
    }

    console.log(`  Geocoded: ${geo.lat.toFixed(5)}, ${geo.lng.toFixed(5)}`);

    // Find closest station
    let closestStation = null;
    let minDistance = Infinity;

    for (const station of stations) {
      const dist = getDistanceKm(geo.lat, geo.lng, station.lat, station.lng);
      if (dist < minDistance) {
        minDistance = dist;
        closestStation = station;
      }
    }

    const distanceM = Math.round(minDistance * 1000);
    console.log(`  Closest: ${closestStation.name} (${distanceM}m)`);

    // Check if station changed
    const oldStation = mall.station_id;
    const newStation = closestStation.id;
    const changed = oldStation !== newStation;

    if (changed) {
      console.log(`  ✓ Remapping: ${oldStation} → ${newStation}`);

      // Update mall station_id
      const { error: updateError } = await supabase
        .from('malls')
        .update({ station_id: newStation })
        .eq('id', mall.id);

      if (updateError) {
        console.error(`  Error updating:`, updateError.message);
      }
    } else {
      console.log(`  (no change)`);
    }

    results.push({
      mall: mall.name,
      oldStation,
      newStation,
      distance: distanceM,
      changed
    });

    await delay(200); // Rate limit OneMap API
  }

  // Summary
  console.log('\n========================================');
  console.log('REMAPPING SUMMARY');
  console.log('========================================\n');

  const changedMalls = results.filter(r => r.changed);
  const failedMalls = results.filter(r => r.status === 'geocode_failed');

  console.log(`Total malls: ${malls.length}`);
  console.log(`Remapped: ${changedMalls.length}`);
  console.log(`Unchanged: ${results.length - changedMalls.length - failedMalls.length}`);
  console.log(`Failed to geocode: ${failedMalls.length}`);

  if (changedMalls.length > 0) {
    console.log('\nChanged mappings:');
    changedMalls.forEach(r => {
      console.log(`  ${r.mall}: ${r.oldStation} → ${r.newStation} (${r.distance}m)`);
    });
  }

  // Final CSV output
  console.log('\n\nFINAL MALL LIST (CSV):');
  console.log('name,station_id,distance_m');
  results
    .filter(r => r.distance)
    .sort((a, b) => a.mall.localeCompare(b.mall))
    .forEach(r => {
      console.log(`${r.mall.replace(/,/g, ';')},${r.newStation},${r.distance}`);
    });
}

remapMalls().catch(console.error);
