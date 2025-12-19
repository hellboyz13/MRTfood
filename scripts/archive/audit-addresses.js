const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bkzfrgrxfnqounyeqvvn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1Nzk5MzAsImV4cCI6MjA4MDE1NTkzMH0.wOYifcpHN4rxtg_gcDYPzzpAeXoOykBfP_jWLMMfdP4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function auditAddresses() {
  console.log('=== FOOD LISTINGS ADDRESS AUDIT ===\n');

  // Get all active listings with their station info
  const { data: listings, error } = await supabase
    .from('food_listings')
    .select(`
      id,
      name,
      address,
      lat,
      lng,
      station_id,
      distance_to_station,
      is_active
    `)
    .eq('is_active', true)
    .order('station_id');

  if (error) {
    console.error('Error fetching listings:', error);
    return;
  }

  // Get all stations for reference
  const { data: stations } = await supabase
    .from('stations')
    .select('id, name, lat, lng');

  const stationMap = {};
  stations.forEach(s => stationMap[s.id] = s);

  console.log(`Total active listings: ${listings.length}\n`);

  // Categories of issues
  const issues = {
    missingAddress: [],
    missingCoordinates: [],
    suspiciousDistance: [],
    possibleWrongStation: [],
    duplicateAddresses: [],
    genericAddresses: [],
    wrongFormat: []
  };

  // Track addresses for duplicates
  const addressMap = {};

  for (const listing of listings) {
    const station = stationMap[listing.station_id];

    // Check for missing address
    if (!listing.address || listing.address.trim() === '') {
      issues.missingAddress.push({
        name: listing.name,
        station: listing.station_id,
        id: listing.id
      });
    } else {
      // Check for duplicate addresses
      const normalizedAddr = listing.address.toLowerCase().trim();
      if (addressMap[normalizedAddr]) {
        issues.duplicateAddresses.push({
          name: listing.name,
          address: listing.address,
          station: listing.station_id,
          duplicateOf: addressMap[normalizedAddr].name
        });
      } else {
        addressMap[normalizedAddr] = listing;
      }

      // Check for generic/placeholder addresses
      const genericPatterns = [
        /^singapore$/i,
        /^sg$/i,
        /^n\/a$/i,
        /^-$/,
        /^\.$/,
        /^address$/i,
        /^tba$/i,
        /^tbc$/i
      ];
      if (genericPatterns.some(p => p.test(listing.address.trim()))) {
        issues.genericAddresses.push({
          name: listing.name,
          address: listing.address,
          station: listing.station_id
        });
      }

      // Check for wrong format (missing Singapore or postal code)
      const hasPostalCode = /\d{6}/.test(listing.address);
      const hasSingapore = /singapore/i.test(listing.address);
      if (!hasPostalCode && !hasSingapore && listing.address.length < 20) {
        issues.wrongFormat.push({
          name: listing.name,
          address: listing.address,
          station: listing.station_id
        });
      }
    }

    // Check for missing coordinates
    if (!listing.lat || !listing.lng) {
      issues.missingCoordinates.push({
        name: listing.name,
        address: listing.address,
        station: listing.station_id
      });
    }

    // Check for suspicious distance (too far from station - >2km)
    if (listing.distance_to_station && listing.distance_to_station > 2000) {
      issues.suspiciousDistance.push({
        name: listing.name,
        address: listing.address,
        station: listing.station_id,
        distance: listing.distance_to_station
      });
    }

    // Check if listing coordinates are way off from station
    if (listing.lat && listing.lng && station && station.lat && station.lng) {
      const distance = haversineDistance(
        listing.lat, listing.lng,
        station.lat, station.lng
      );

      // If calculated distance differs significantly from stored distance
      if (listing.distance_to_station &&
          Math.abs(distance - listing.distance_to_station) > 500) {
        issues.possibleWrongStation.push({
          name: listing.name,
          address: listing.address,
          station: listing.station_id,
          storedDistance: listing.distance_to_station,
          calculatedDistance: Math.round(distance)
        });
      }
    }
  }

  // Print results
  console.log('=== ISSUES FOUND ===\n');

  if (issues.missingAddress.length > 0) {
    console.log(`\n--- MISSING ADDRESS (${issues.missingAddress.length}) ---`);
    issues.missingAddress.forEach(i => {
      console.log(`  - ${i.name} (${i.station})`);
    });
  }

  if (issues.genericAddresses.length > 0) {
    console.log(`\n--- GENERIC/PLACEHOLDER ADDRESSES (${issues.genericAddresses.length}) ---`);
    issues.genericAddresses.forEach(i => {
      console.log(`  - ${i.name}: "${i.address}" (${i.station})`);
    });
  }

  if (issues.wrongFormat.length > 0) {
    console.log(`\n--- POTENTIALLY INCOMPLETE ADDRESSES (${issues.wrongFormat.length}) ---`);
    issues.wrongFormat.forEach(i => {
      console.log(`  - ${i.name}: "${i.address}" (${i.station})`);
    });
  }

  if (issues.missingCoordinates.length > 0) {
    console.log(`\n--- MISSING COORDINATES (${issues.missingCoordinates.length}) ---`);
    issues.missingCoordinates.forEach(i => {
      console.log(`  - ${i.name} (${i.station})`);
    });
  }

  if (issues.suspiciousDistance.length > 0) {
    console.log(`\n--- SUSPICIOUS DISTANCE >2km (${issues.suspiciousDistance.length}) ---`);
    issues.suspiciousDistance.forEach(i => {
      console.log(`  - ${i.name}: ${i.distance}m from ${i.station}`);
      console.log(`    Address: ${i.address}`);
    });
  }

  if (issues.possibleWrongStation.length > 0) {
    console.log(`\n--- POSSIBLE WRONG STATION ASSIGNMENT (${issues.possibleWrongStation.length}) ---`);
    issues.possibleWrongStation.forEach(i => {
      console.log(`  - ${i.name} @ ${i.station}`);
      console.log(`    Stored: ${i.storedDistance}m, Calculated: ${i.calculatedDistance}m`);
    });
  }

  if (issues.duplicateAddresses.length > 0) {
    console.log(`\n--- DUPLICATE ADDRESSES (${issues.duplicateAddresses.length}) ---`);
    issues.duplicateAddresses.forEach(i => {
      console.log(`  - ${i.name} has same address as ${i.duplicateOf}`);
      console.log(`    Address: ${i.address}`);
    });
  }

  // Summary
  const totalIssues = Object.values(issues).reduce((sum, arr) => sum + arr.length, 0);
  console.log(`\n=== SUMMARY ===`);
  console.log(`Total issues found: ${totalIssues}`);
  console.log(`  - Missing address: ${issues.missingAddress.length}`);
  console.log(`  - Generic addresses: ${issues.genericAddresses.length}`);
  console.log(`  - Incomplete addresses: ${issues.wrongFormat.length}`);
  console.log(`  - Missing coordinates: ${issues.missingCoordinates.length}`);
  console.log(`  - Suspicious distance: ${issues.suspiciousDistance.length}`);
  console.log(`  - Wrong station: ${issues.possibleWrongStation.length}`);
  console.log(`  - Duplicate addresses: ${issues.duplicateAddresses.length}`);
}

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function toRad(deg) {
  return deg * Math.PI / 180;
}

auditAddresses().catch(console.error);
