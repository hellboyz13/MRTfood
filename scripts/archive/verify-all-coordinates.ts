import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface OneMapResult {
  SEARCHVAL: string;
  LATITUDE: string;
  LONGITUDE: string;
}

interface OneMapResponse {
  found: number;
  results: OneMapResult[];
}

async function fetchOneMapCoordinates(stationName: string): Promise<{ lat: number; lng: number } | null> {
  const searchQuery = encodeURIComponent(`${stationName} MRT`);
  const url = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${searchQuery}&returnGeom=Y&getAddrDetails=N`;

  try {
    const response = await fetch(url);
    const data: OneMapResponse = await response.json();

    if (data.found > 0 && data.results.length > 0) {
      const result = data.results[0];
      return {
        lat: parseFloat(result.LATITUDE),
        lng: parseFloat(result.LONGITUDE),
      };
    }

    return null;
  } catch (error) {
    console.error(`Error fetching coordinates for ${stationName}:`, error);
    return null;
  }
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

async function verifyAllCoordinates() {
  console.log('🔍 Verifying all station coordinates against OneMap...\n');

  const { data: stations } = await supabase
    .from('stations')
    .select('id, name, lat, lng')
    .order('name');

  if (!stations) {
    console.error('Failed to fetch stations');
    return;
  }

  console.log(`Checking ${stations.length} stations...\n`);

  const discrepancies: Array<{
    name: string;
    id: string;
    dbLat: number;
    dbLng: number;
    oneMapLat: number;
    oneMapLng: number;
    distance: number;
  }> = [];

  let checked = 0;
  let failed = 0;

  for (const station of stations) {
    if (!station.lat || !station.lng) {
      console.log(`⚠️  ${station.name}: Missing coordinates in DB`);
      failed++;
      continue;
    }

    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));

    const oneMapCoords = await fetchOneMapCoordinates(station.name);

    if (oneMapCoords) {
      const distance = calculateDistance(
        station.lat,
        station.lng,
        oneMapCoords.lat,
        oneMapCoords.lng
      );

      checked++;

      // Flag if difference is more than 100 meters
      if (distance > 100) {
        discrepancies.push({
          name: station.name,
          id: station.id,
          dbLat: station.lat,
          dbLng: station.lng,
          oneMapLat: oneMapCoords.lat,
          oneMapLng: oneMapCoords.lng,
          distance: Math.round(distance),
        });
        console.log(`⚠️  ${station.name}: ${Math.round(distance)}m difference`);
      } else {
        console.log(`✓ ${station.name}: ${Math.round(distance)}m (OK)`);
      }
    } else {
      console.log(`❌ ${station.name}: Could not verify with OneMap`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📊 VERIFICATION SUMMARY:\n');
  console.log(`Total stations: ${stations.length}`);
  console.log(`Successfully verified: ${checked}`);
  console.log(`Failed to verify: ${failed}`);
  console.log(`Significant discrepancies (>100m): ${discrepancies.length}`);

  if (discrepancies.length > 0) {
    console.log('\n⚠️  STATIONS WITH SIGNIFICANT COORDINATE DIFFERENCES:\n');
    discrepancies.forEach((d, i) => {
      console.log(`${(i + 1).toString().padStart(2)}. ${d.name} (${d.id})`);
      console.log(`    Database:  ${d.dbLat}, ${d.dbLng}`);
      console.log(`    OneMap:    ${d.oneMapLat}, ${d.oneMapLng}`);
      console.log(`    Difference: ${d.distance}m\n`);
    });

    console.log('💡 TIP: Run update-coordinates.ts to fix these discrepancies');
  } else {
    console.log('\n✅ All coordinates match OneMap data (within 100m tolerance)!');
  }
}

verifyAllCoordinates();
