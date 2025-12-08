import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const EMPTY_STATIONS = [
  'senja', 'jelapang', 'pending', 'petir', 'bangkit', 'fajar', 'segar',
  'kranji', 'marsiling', 'admiralty', 'sembawang', 'canberra', 'khatib',
  'yio-chu-kang', 'kovan', 'pasir-ris', 'expo', 'changi-airport',
  'boon-lay', 'pioneer', 'joo-koon'
];

async function checkEmptyStations() {
  console.log('Checking food listings for previously empty stations...\n');

  for (const stationId of EMPTY_STATIONS) {
    const { data, error, count } = await supabase
      .from('food_listings')
      .select('*', { count: 'exact', head: false })
      .eq('station_id', stationId);

    if (error) {
      console.error(`❌ Error checking ${stationId}:`, error.message);
    } else {
      if (count && count > 0) {
        console.log(`✅ ${stationId}: ${count} listings`);
      } else {
        console.log(`❌ ${stationId}: 0 listings (still empty)`);
      }
    }
  }
}

checkEmptyStations().catch(console.error);
