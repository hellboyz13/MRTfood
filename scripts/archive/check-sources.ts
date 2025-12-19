import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkSources() {
  const { data: sources } = await supabase
    .from('food_sources')
    .select('*')
    .order('id');

  console.log('📋 Current Food Sources:\n');
  sources?.forEach(s => {
    console.log(`${s.id.padEnd(25)} -> ${s.name} ${s.icon}`);
  });

  // Count listings per source
  const { data: listingSources } = await supabase
    .from('listing_sources')
    .select('source_id');

  const counts = new Map();
  listingSources?.forEach(ls => {
    counts.set(ls.source_id, (counts.get(ls.source_id) || 0) + 1);
  });

  console.log('\n📊 Listings per source:\n');
  for (const [sourceId, count] of counts.entries()) {
    console.log(`${sourceId.padEnd(25)} -> ${count} listings`);
  }
}

checkSources();
