import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkListings() {
  const testStations = ['senja', 'jelapang', 'bangkit', 'fajar'];

  console.log('Checking where food listings appear (Curated vs Popular):\n');

  for (const stationId of testStations) {
    console.log(`\n📍 ${stationId.toUpperCase()}:`);

    // Check Curated tab (food_listings)
    const { data: curated, count: curatedCount } = await supabase
      .from('food_listings')
      .select('id, name', { count: 'exact' })
      .eq('station_id', stationId)
      .eq('is_active', true);

    console.log(`  Curated (food_listings): ${curatedCount || 0} items`);
    if (curated && curated.length > 0) {
      curated.forEach(item => console.log(`    - ${item.name}`));
    }

    // Check Popular tab (chain_outlets)
    const { data: popular, count: popularCount } = await supabase
      .from('chain_outlets')
      .select('id, name', { count: 'exact' })
      .eq('station_id', stationId);

    console.log(`  Popular (chain_outlets): ${popularCount || 0} items`);
    if (popular && popular.length > 0) {
      popular.slice(0, 3).forEach(item => console.log(`    - ${item.name}`));
      if ((popularCount || 0) > 3) {
        console.log(`    ... and ${popularCount! - 3} more`);
      }
    }
  }
}

checkListings().catch(console.error);
