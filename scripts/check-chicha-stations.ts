import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local file
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Station coordinates from MRTMap.tsx
const stationCoords = {
  'choa-chu-kang': { lat: 1.3854, lng: 103.7443 },
  'yew-tee': { lat: 1.3972, lng: 103.7470 },
};

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000; // Return in meters
}

async function checkChichaStations() {
  console.log('🔍 Checking CHICHA outlets and their correct stations...\n');

  const { data: outlets, error } = await supabase
    .from('chain_outlets')
    .select('id, name, nearest_station_id, latitude, longitude, address')
    .ilike('name', '%chicha%')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${outlets?.length || 0} CHICHA outlets with coordinates\n`);

  for (const outlet of outlets || []) {
    console.log(`📍 ${outlet.name}`);
    console.log(`   Address: ${outlet.address}`);
    console.log(`   Coords: ${outlet.latitude}, ${outlet.longitude}`);
    console.log(`   Database station: ${outlet.nearest_station_id}`);

    const distToCCK = calculateDistance(
      outlet.latitude,
      outlet.longitude,
      stationCoords['choa-chu-kang'].lat,
      stationCoords['choa-chu-kang'].lng
    );

    const distToYT = calculateDistance(
      outlet.latitude,
      outlet.longitude,
      stationCoords['yew-tee'].lat,
      stationCoords['yew-tee'].lng
    );

    console.log(`   Distance to Choa Chu Kang: ${distToCCK.toFixed(0)}m`);
    console.log(`   Distance to Yew Tee: ${distToYT.toFixed(0)}m`);

    const nearest = distToCCK < distToYT ? 'choa-chu-kang' : 'yew-tee';
    console.log(`   ✓ Actual nearest: ${nearest}`);

    if (outlet.nearest_station_id !== nearest) {
      console.log(`   ⚠️  MISMATCH! Database says ${outlet.nearest_station_id} but should be ${nearest}`);
    }

    console.log('');
  }
}

checkChichaStations();
