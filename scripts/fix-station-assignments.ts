import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Use service_role key to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4'
);

interface Station {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

interface FoodListing {
  id: string;
  name: string;
  station_id: string;
  lat: number | null;
  lng: number | null;
  address: string;
  distance_to_station: number | null;
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  // Haversine formula to calculate distance in meters
  const R = 6371000; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function findNearestStation(lat: number, lng: number, stations: Station[]): { station: Station; distance: number } {
  let nearestStation = stations[0];
  let minDistance = Infinity;

  for (const station of stations) {
    const distance = calculateDistance(lat, lng, station.lat, station.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearestStation = station;
    }
  }

  return { station: nearestStation, distance: minDistance };
}

async function fixStationAssignments() {
  console.log('🔍 Fetching all stations and food listings...\n');

  // Get all stations with coordinates
  const { data: stations, error: stationError } = await supabase
    .from('stations')
    .select('id, name, lat, lng')
    .not('lat', 'is', null)
    .not('lng', 'is', null);

  if (stationError || !stations) {
    console.error('Error fetching stations:', stationError);
    return;
  }

  console.log(`✅ Loaded ${stations.length} stations with coordinates\n`);

  // Get all food listings with coordinates
  const { data: listings, error: listingError } = await supabase
    .from('food_listings')
    .select('id, name, station_id, lat, lng, address, distance_to_station')
    .not('lat', 'is', null)
    .not('lng', 'is', null);

  if (listingError || !listings) {
    console.error('Error fetching listings:', listingError);
    return;
  }

  console.log(`✅ Loaded ${listings.length} food listings with coordinates\n`);

  // Analyze current assignments
  console.log('📊 ANALYZING CURRENT ASSIGNMENTS...\n');

  const wrongAssignments: Array<{
    listing: FoodListing;
    currentStation: Station | undefined;
    correctStation: Station;
    currentDistance: number;
    correctDistance: number;
  }> = [];

  const suspiciousListings: Array<{
    listing: FoodListing;
    station: Station;
    distance: number;
  }> = [];

  let correctCount = 0;
  let updatedCount = 0;

  for (const listing of listings) {
    if (!listing.lat || !listing.lng) continue;

    const { station: nearestStation, distance } = findNearestStation(
      listing.lat,
      listing.lng,
      stations as Station[]
    );

    const currentStation = stations.find(s => s.id === listing.station_id);

    // Check if assignment is wrong
    if (listing.station_id !== nearestStation.id) {
      const currentDistance = currentStation
        ? calculateDistance(listing.lat, listing.lng, currentStation.lat, currentStation.lng)
        : Infinity;

      wrongAssignments.push({
        listing,
        currentStation,
        correctStation: nearestStation,
        currentDistance,
        correctDistance: distance,
      });

      // Update the database
      const { error: updateError } = await supabase
        .from('food_listings')
        .update({
          station_id: nearestStation.id,
          distance_to_station: Math.round(distance),
        })
        .eq('id', listing.id);

      if (updateError) {
        console.error(`Failed to update ${listing.name}:`, updateError.message);
      } else {
        updatedCount++;
      }
    } else {
      correctCount++;
      // Update distance if needed
      if (!listing.distance_to_station || Math.abs(listing.distance_to_station - distance) > 10) {
        await supabase
          .from('food_listings')
          .update({ distance_to_station: Math.round(distance) })
          .eq('id', listing.id);
      }
    }

    // Flag suspicious listings (>1km from station)
    if (distance > 1000) {
      suspiciousListings.push({
        listing,
        station: nearestStation,
        distance,
      });
    }
  }

  // Print detailed report
  console.log('='.repeat(80));
  console.log('\n📋 STATION ASSIGNMENT REPORT\n');
  console.log(`Total listings analyzed: ${listings.length}`);
  console.log(`Correct assignments: ${correctCount} (${(correctCount / listings.length * 100).toFixed(1)}%)`);
  console.log(`Wrong assignments fixed: ${updatedCount} (${(updatedCount / listings.length * 100).toFixed(1)}%)`);

  if (wrongAssignments.length > 0) {
    console.log('\n❌ FIXED WRONG ASSIGNMENTS:\n');

    // Sort by distance difference
    wrongAssignments.sort((a, b) => (b.currentDistance - b.correctDistance) - (a.currentDistance - a.correctDistance));

    // Show top 20 worst cases
    const showCount = Math.min(20, wrongAssignments.length);
    for (let i = 0; i < showCount; i++) {
      const wa = wrongAssignments[i];
      console.log(`${(i + 1).toString().padStart(2)}. ${wa.listing.name}`);
      console.log(`    Address: ${wa.listing.address}`);
      console.log(`    ❌ WAS: ${wa.currentStation?.name || 'Unknown'} (${(wa.currentDistance / 1000).toFixed(1)}km away)`);
      console.log(`    ✅ NOW: ${wa.correctStation.name} (${(wa.correctDistance / 1000).toFixed(1)}km away)`);
      console.log(`    Saved: ${((wa.currentDistance - wa.correctDistance) / 1000).toFixed(1)}km\n`);
    }

    if (wrongAssignments.length > showCount) {
      console.log(`... and ${wrongAssignments.length - showCount} more\n`);
    }
  }

  if (suspiciousListings.length > 0) {
    console.log('\n⚠️  LISTINGS FAR FROM STATION (>1km):\n');
    suspiciousListings.sort((a, b) => b.distance - a.distance);

    const showSuspicious = Math.min(10, suspiciousListings.length);
    for (let i = 0; i < showSuspicious; i++) {
      const sl = suspiciousListings[i];
      console.log(`${(i + 1).toString().padStart(2)}. ${sl.listing.name}`);
      console.log(`    Station: ${sl.station.name}`);
      console.log(`    Distance: ${(sl.distance / 1000).toFixed(2)}km`);
      console.log(`    Address: ${sl.listing.address}\n`);
    }

    if (suspiciousListings.length > showSuspicious) {
      console.log(`... and ${suspiciousListings.length - showSuspicious} more\n`);
    }
  }

  // Verify specific examples
  console.log('\n✅ VERIFICATION OF KNOWN CASES:\n');

  const testCases = [
    { name: 'Selegie', expectedStations: ['rochor', 'dhoby-ghaut', 'bras-basah'] },
    { name: 'Lor Mambong', expectedStations: ['holland-village'] },
    { name: 'Scotts', expectedStations: ['orchard', 'newton'] },
    { name: 'Seng Poh', expectedStations: ['tiong-bahru'] },
    { name: 'Purvis', expectedStations: ['city-hall', 'bugis', 'esplanade'] },
  ];

  for (const testCase of testCases) {
    const relevantListings = listings.filter(l =>
      l.address && l.address.toLowerCase().includes(testCase.name.toLowerCase())
    );

    if (relevantListings.length > 0) {
      console.log(`${testCase.name} area (${relevantListings.length} listings):`);
      for (const listing of relevantListings) {
        const station = stations.find(s => s.id === listing.station_id);
        const isExpected = testCase.expectedStations.includes(listing.station_id);
        const icon = isExpected ? '✅' : '⚠️';
        console.log(`  ${icon} "${listing.name}" → ${station?.name} (${listing.station_id})`);
      }
      console.log('');
    }
  }

  console.log('='.repeat(80));
  console.log('\n🎉 Station assignment fix complete!');
}

fixStationAssignments();