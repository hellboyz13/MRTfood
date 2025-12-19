import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkCoords() {
  const { data, error } = await supabase
    .from('stations')
    .select('id, name, lat, lng')
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Sample stations with lat/lng:');
  console.log(JSON.stringify(data, null, 2));

  // Count how many stations have coordinates
  const { data: allStations } = await supabase
    .from('stations')
    .select('id, lat, lng');

  const withCoords = allStations?.filter(s => s.lat && s.lng) || [];
  const withoutCoords = allStations?.filter(s => !s.lat || !s.lng) || [];

  console.log(`\n\nTotal stations: ${allStations?.length || 0}`);
  console.log(`With coordinates: ${withCoords.length}`);
  console.log(`Without coordinates: ${withoutCoords.length}`);
}

checkCoords();
