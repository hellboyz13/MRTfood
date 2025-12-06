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

async function debugStations() {
  console.log('Checking Jurong East station data...\n');

  // Check if jurong-east station exists
  const { data: station } = await supabase
    .from('stations')
    .select('id, name')
    .ilike('name', '%jurong%east%');

  console.log('Jurong East station:', station);

  // Check outlets assigned to jurong-east
  const { data: outlets } = await supabase
    .from('chain_outlets')
    .select('id, name, address, nearest_station_id, distance_to_station, brand_id')
    .eq('nearest_station_id', 'jurong-east')
    .order('distance_to_station', { ascending: true });

  console.log(`\nOutlets assigned to jurong-east: ${outlets?.length || 0}`);

  if (outlets && outlets.length > 0) {
    console.log('\nFirst 10 outlets:');
    outlets.slice(0, 10).forEach((outlet: any) => {
      console.log(`  - ${outlet.name} (${outlet.distance_to_station}m) - Brand: ${outlet.brand_id}`);
    });
  }

  // Check for outlets near Jurong but assigned to other stations
  const { data: allJurong } = await supabase
    .from('chain_outlets')
    .select('id, name, address, nearest_station_id, distance_to_station')
    .ilike('address', '%jurong%')
    .limit(20);

  console.log(`\n\nAll outlets with "Jurong" in address: ${allJurong?.length || 0}`);
  if (allJurong && allJurong.length > 0) {
    allJurong.forEach((outlet: any) => {
      console.log(`  - ${outlet.name} -> assigned to: ${outlet.nearest_station_id} (${outlet.distance_to_station}m)`);
    });
  }
}

debugStations();
