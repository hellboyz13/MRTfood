import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkStationIDs() {
  console.log('Checking station IDs in database...\n');

  const { data: stations, error } = await supabase
    .from('stations')
    .select('id, name')
    .order('name');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Total stations in database: ${stations?.length || 0}\n`);
  console.log('Sample station IDs:');
  stations?.slice(0, 30).forEach(s => {
    console.log(`  ${s.id.padEnd(25)} -> ${s.name}`);
  });

  // Check if specific stations exist
  console.log('\n\nChecking specific stations:');
  const checkStations = ['kovan', 'kranji', 'admiralty', 'bangkit', 'punggol'];
  for (const stationId of checkStations) {
    const found = stations?.find(s => s.id === stationId);
    console.log(`  ${stationId.padEnd(15)} -> ${found ? '✅ EXISTS' : '❌ NOT FOUND'}`);
  }
}

checkStationIDs();
