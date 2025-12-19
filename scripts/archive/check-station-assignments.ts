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

async function checkStationAssignments() {
  console.log('Checking Choa Chu Kang and Lot One assignments...\n');

  // Check Choa Chu Kang station
  const { data: cckStation } = await supabase
    .from('stations')
    .select('id, name')
    .ilike('name', '%choa%chu%kang%');

  console.log('Choa Chu Kang station:', cckStation);

  // Check outlets assigned to choa-chu-kang
  const { data: cckOutlets } = await supabase
    .from('chain_outlets')
    .select('id, name, address, nearest_station_id, distance_to_station, brand_id')
    .eq('nearest_station_id', 'choa-chu-kang')
    .lte('distance_to_station', 1000)
    .order('distance_to_station', { ascending: true });

  console.log(`\nOutlets assigned to Choa Chu Kang (within 1km): ${cckOutlets?.length || 0}`);
  if (cckOutlets && cckOutlets.length > 0) {
    cckOutlets.forEach((outlet: any) => {
      console.log(`  - ${outlet.name} (${outlet.distance_to_station}m) - Brand: ${outlet.brand_id}`);
    });
  }

  // Check for Chicha San Chen at Lot One
  const { data: chichaLotOne } = await supabase
    .from('chain_outlets')
    .select('id, name, address, nearest_station_id, distance_to_station, brand_id')
    .ilike('address', '%lot%one%')
    .eq('brand_id', 'chicha-san-chen');

  console.log(`\n\nChicha San Chen at Lot One:`);
  if (chichaLotOne && chichaLotOne.length > 0) {
    chichaLotOne.forEach((outlet: any) => {
      console.log(`  - ${outlet.name}`);
      console.log(`    Address: ${outlet.address}`);
      console.log(`    Assigned to: ${outlet.nearest_station_id} (${outlet.distance_to_station}m)`);
    });
  } else {
    console.log('  NOT FOUND in database');
  }

  // Check ALL outlets near Lot One
  const { data: lotOneOutlets } = await supabase
    .from('chain_outlets')
    .select('id, name, address, nearest_station_id, distance_to_station, brand_id')
    .ilike('address', '%lot%one%');

  console.log(`\n\nAll outlets at Lot One: ${lotOneOutlets?.length || 0}`);
  if (lotOneOutlets && lotOneOutlets.length > 0) {
    lotOneOutlets.forEach((outlet: any) => {
      console.log(`  - ${outlet.name} (${outlet.brand_id})`);
      console.log(`    Assigned to: ${outlet.nearest_station_id} (${outlet.distance_to_station}m)`);
    });
  }

  // Check if Choa Chu Kang station has coordinates
  const { data: cckCoords } = await supabase
    .from('stations')
    .select('id, name, lat, lng')
    .eq('id', 'choa-chu-kang');

  console.log(`\n\nChoa Chu Kang station coordinates:`);
  if (cckCoords && cckCoords.length > 0) {
    console.log(`  ${cckCoords[0].name}: lat=${cckCoords[0].lat}, lng=${cckCoords[0].lng}`);
  } else {
    console.log('  NO COORDINATES - This is why outlets cannot be assigned!');
  }
}

checkStationAssignments();
