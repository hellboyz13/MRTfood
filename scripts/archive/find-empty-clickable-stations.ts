import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function findEmptyClickableStations() {
  console.log('Finding stations with SVG circles but no food...\n');

  // Step 1: Get all stations from database
  const { data: allStations, error: stationsError } = await supabase
    .from('stations')
    .select('id, name')
    .order('name');

  if (stationsError) {
    console.error('Error fetching stations:', stationsError);
    return;
  }

  console.log(`Total stations in database: ${allStations?.length || 0}\n`);

  // Step 2: For each station, check if it has food
  const stationsWithoutFood: { id: string; name: string }[] = [];

  for (const station of allStations || []) {
    // Check food listings
    const { data: listings } = await supabase
      .from('food_listings')
      .select('id')
      .eq('station_id', station.id)
      .eq('is_active', true);

    // Check chain outlets
    const { data: chains } = await supabase
      .from('chain_outlets')
      .select('id')
      .eq('nearest_station_id', station.id)
      .eq('is_active', true);

    const totalFood = (listings?.length || 0) + (chains?.length || 0);

    if (totalFood === 0) {
      stationsWithoutFood.push(station);
    }
  }

  console.log(`\n🎯 Found ${stationsWithoutFood.length} stations with NO food:\n`);
  stationsWithoutFood.forEach((s, i) => {
    console.log(`${(i + 1).toString().padStart(3)}. ${s.id.padEnd(25)} -> ${s.name}`);
  });

  console.log('\n\n📋 Station IDs only (for easy copying):');
  console.log(stationsWithoutFood.map(s => s.id).join(', '));
}

findEmptyClickableStations();
