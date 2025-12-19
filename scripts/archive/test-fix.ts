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

async function testFix() {
  console.log('Testing Jurong East with 1km limit...\n');

  // Before: All outlets
  const { data: before } = await supabase
    .from('chain_outlets')
    .select('id, name, distance_to_station')
    .eq('nearest_station_id', 'jurong-east')
    .order('distance_to_station', { ascending: true });

  console.log(`BEFORE (no limit): ${before?.length || 0} outlets`);
  console.log(`  Furthest: ${before?.[before.length - 1]?.name} (${before?.[before.length - 1]?.distance_to_station}m)`);

  // After: Within 1km
  const { data: after } = await supabase
    .from('chain_outlets')
    .select('id, name, distance_to_station')
    .eq('nearest_station_id', 'jurong-east')
    .lte('distance_to_station', 1000)
    .order('distance_to_station', { ascending: true });

  console.log(`\nAFTER (1km limit): ${after?.length || 0} outlets`);
  console.log(`  Furthest: ${after?.[after.length - 1]?.name} (${after?.[after.length - 1]?.distance_to_station}m)`);

  console.log(`\n✅ Filtered out ${(before?.length || 0) - (after?.length || 0)} outlets beyond 1km`);
}

testFix();
