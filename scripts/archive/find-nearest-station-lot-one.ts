import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

async function findNearestStation() {
  // Lot One Shopping Mall coordinates
  const lotOneLat = 1.385092;
  const lotOneLng = 103.744322;

  console.log('Finding nearest station to Lot One...\n');
  console.log(`Lot One coordinates: ${lotOneLat}, ${lotOneLng}\n`);

  // Get all stations with coordinates
  const { data: stations } = await supabase
    .from('stations')
    .select('id, name, lat, lng')
    .not('lat', 'is', null)
    .not('lng', 'is', null);

  console.log(`Found ${stations?.length || 0} stations with GPS coordinates\n`);

  // Calculate distances
  const distances = stations?.map(station => ({
    ...station,
    distance: calculateDistance(lotOneLat, lotOneLng, station.lat, station.lng),
  })).sort((a, b) => a.distance - b.distance);

  console.log('10 nearest stations to Lot One:');
  distances?.slice(0, 10).forEach((station, i) => {
    console.log(`  ${i+1}. ${station.name.padEnd(25)} (${station.id.padEnd(25)}) - ${Math.round(station.distance)}m`);
  });
}

findNearestStation();
