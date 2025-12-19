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

// Haversine formula to calculate distance between two GPS coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

async function fixChoaChuKang() {
  console.log('Fixing Choa Chu Kang station assignments...\n');

  // Step 1: Add GPS coordinates for Choa Chu Kang station
  // Choa Chu Kang MRT coordinates: 1.385092, 103.744322
  const cckLat = 1.385092;
  const cckLng = 103.744322;

  console.log('Step 1: Adding GPS coordinates to Choa Chu Kang station...');
  const { error: updateError } = await supabase
    .from('stations')
    .update({ lat: cckLat, lng: cckLng })
    .eq('id', 'choa-chu-kang');

  if (updateError) {
    console.error('Error updating station:', updateError);
    return;
  }
  console.log('✅ Coordinates added: lat=1.385092, lng=103.744322\n');

  // Step 2: Get all Lot One outlets (currently assigned to jurong-east)
  // Use latitude/longitude, not lat/lng
  const { data: lotOneOutlets, error: fetchError } = await supabase
    .from('chain_outlets')
    .select('id, name, latitude, longitude, address, nearest_station_id, distance_to_station')
    .ilike('address', '%lot%one%');

  if (fetchError) {
    console.error('Error fetching outlets:', fetchError);
  }

  console.log(`Step 2: Found ${lotOneOutlets?.length || 0} outlets at Lot One\n`);

  // Step 3: Recalculate distances and reassign to Choa Chu Kang
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
        console.error(`    ❌ Error updating outlet:`, error);
      } else {
        console.log(`    ✅ Updated successfully\n`);
      }
    }
  }

  // Step 4: Verify the fix
  console.log('\nStep 4: Verifying assignments...');
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

  console.log('\n🎉 Fix complete!');
}

fixChoaChuKang();
