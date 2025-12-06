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

async function listStations() {
  const { data } = await supabase
    .from('stations')
    .select('id, name, line_color, lat, lng')
    .order('id');

  console.log('Total stations:', data?.length);
  console.log('\nAll stations:');
  data?.forEach(s => {
    console.log(`  ${s.id.padEnd(25)} | ${s.name.padEnd(25)} | coords: ${s.lat ? 'YES' : 'NO '}`);
  });
}

listStations();
