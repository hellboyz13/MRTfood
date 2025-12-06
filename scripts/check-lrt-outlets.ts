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

const lrtStations = [
  // Bukit Panjang LRT
  'south-view', 'keat-hong', 'teck-whye', 'phoenix', 'petir', 'pending', 'bangkit',
  'fajar', 'segar', 'jelapang', 'senja',
  // Sengkang LRT
  'compassvale', 'rumbia', 'bakau', 'kangkar', 'ranggung', 'cheng-lim', 'farmway',
  'kupang', 'thanggam', 'fernvale', 'layar', 'tongkang', 'renjong',
  // Punggol LRT
  'cove', 'meridian', 'coral-edge', 'riviera', 'kadaloor', 'oasis', 'damai',
  'sam-kee', 'teck-lee', 'punggol-point', 'samudera', 'nibong', 'sumang', 'soo-teck'
];

async function checkLRTOutlets() {
  console.log('🚇 Checking if any chain outlets are assigned to LRT stations...\n');

  let totalOutlets = 0;

  for (const stationId of lrtStations) {
    const { data } = await supabase
      .from('chain_outlets')
      .select('id, name, nearest_station_id, distance_to_station')
      .eq('nearest_station_id', stationId)
      .lte('distance_to_station', 1000);

    if (data && data.length > 0) {
      totalOutlets += data.length;
      console.log(`${stationId.padEnd(20)} → ${data.length} outlets`);
      data.forEach(o => console.log(`  - ${o.name} (${o.distance_to_station}m)`));
      console.log();
    }
  }

  if (totalOutlets === 0) {
    console.log('✅ NO chain outlets assigned to LRT stations.');
    console.log('   LRT stations serve small residential areas.');
    console.log('   Chain restaurants are at major MRT stations only.\n');
  } else {
    console.log(`\n⚠️  Total: ${totalOutlets} outlets at LRT stations`);
  }
}

checkLRTOutlets();
