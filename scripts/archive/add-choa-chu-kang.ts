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

async function addChoaChuKang() {
  console.log('Adding Choa Chu Kang station...\n');

  const cckLat = 1.385092;
  const cckLng = 103.744322;

  // Step 1: Insert the station
  console.log('Step 1: Creating station record...');
  const { error: insertError } = await supabase
    .from('stations')
    .insert({
      id: 'choa-chu-kang',
      name: 'Choa Chu Kang',
      lat: cckLat,
      lng: cckLng,
    });

  if (insertError) {
    console.error('Error inserting station:', insertError);
    return;
  }
  console.log('✅ Station created: choa-chu-kang\n');

  // Step 2: Find outlets near Lot One and reassign them
  console.log('Step 2: Finding outlets at Lot One...');
  const { data: lotOneOutlets } = await supabase
    .from('chain_outlets')
    .select('id, name, latitude, longitude, address, nearest_station_id, distance_to_station')
    .ilike('address', '%lot%one%');

  console.log(`Found ${lotOneOutlets?.length || 0} outlets\n`);

  if (lotOneOutlets && lotOneOutlets.length > 0) {
    console.log('Step 3: Reassigning outlets to Choa Chu Kang...\n');

    for (const outlet of lotOneOutlets) {
      const distance = calculateDistance(outlet.latitude, outlet.longitude, cckLat, cckLng);

      console.log(`  - ${outlet.name}`);
      console.log(`    Old: ${outlet.nearest_station_id} (${outlet.distance_to_station}m)`);
      console.log(`    New: choa-chu-kang (${Math.round(distance)}m)`);

      const { error } = await supabase
        .from('chain_outlets')
        .update({
          nearest_station_id: 'choa-chu-kang',
          distance_to_station: Math.round(distance),
        })
        .eq('id', outlet.id);

      if (error) {
        console.error(`    ❌ Error:`, error);
      } else {
        console.log(`    ✅ Updated\n`);
      }
    }
  }

  // Step 4: Verify
  console.log('Step 4: Verification...');
  const { data: verifyOutlets } = await supabase
    .from('chain_outlets')
    .select('id, name, distance_to_station')
    .eq('nearest_station_id', 'choa-chu-kang')
    .lte('distance_to_station', 1000)
    .order('distance_to_station', { ascending: true });

  console.log(`\n✅ Choa Chu Kang now has ${verifyOutlets?.length || 0} outlets within 1km:`);
  if (verifyOutlets && verifyOutlets.length > 0) {
    verifyOutlets.forEach((outlet: any) => {
      console.log(`  - ${outlet.name} (${outlet.distance_to_station}m)`);
    });
  }

  console.log('\n🎉 Done!');
}

addChoaChuKang();
