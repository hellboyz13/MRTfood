import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local file
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStations() {
  console.log('🔍 Checking stations in database...\n');

  const { data: stations, error } = await supabase
    .from('stations')
    .select('id, name')
    .order('id');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${stations?.length || 0} stations:\n`);

  stations?.forEach(s => {
    console.log(`  ${s.id} → ${s.name}`);
  });
}

checkStations();
