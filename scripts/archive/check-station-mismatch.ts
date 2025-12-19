import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local file
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStationMismatch() {
  console.log('🔍 Checking station data...\n');

  // Get station info for Choa Chu Kang and Yewtee
  const { data: stations, error: stationsError } = await supabase
    .from('stations')
    .select('*')
    .in('id', ['NS4', 'NS5', 'BP1']);

  if (stationsError) {
    console.error('Error fetching stations:', stationsError);
    return;
  }

  console.log('📍 Stations found:');
  stations?.forEach(s => {
    console.log(`  - ${s.id}: ${s.name}`);
  });
  console.log('');

  // Search for food with "chicha" to see what comes up
  const searchQuery = 'chicha';

  // Check food listings
  const { data: foodListings, error: foodError } = await supabase
    .from('food_listings')
    .select('id, name, address, station_id')
    .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);

  console.log(`🍽️ Food listings matching "${searchQuery}":`);
  if (foodListings && foodListings.length > 0) {
    foodListings.forEach(f => {
      console.log(`  - ${f.name} (Station: ${f.station_id})`);
      console.log(`    Address: ${f.address}`);
    });
  } else {
    console.log('  None found');
  }
  console.log('');

  // Check chain outlets
  const { data: chainOutlets, error: outletError } = await supabase
    .from('chain_outlets')
    .select('id, name, nearest_station_id, food_tags, address')
    .ilike('name', `%${searchQuery}%`);

  console.log(`🏪 Chain outlets matching "${searchQuery}" (by name):`);
  if (chainOutlets && chainOutlets.length > 0) {
    chainOutlets.forEach(o => {
      console.log(`  - ${o.name} (Station: ${o.nearest_station_id})`);
      console.log(`    Address: ${o.address}`);
      console.log(`    Tags: ${o.food_tags?.join(', ') || 'none'}`);
    });
  } else {
    console.log('  None found');
  }
  console.log('');

  // Check all chain outlets at Choa Chu Kang
  const { data: cckOutlets, error: cckError } = await supabase
    .from('chain_outlets')
    .select('id, name, nearest_station_id, food_tags')
    .eq('nearest_station_id', 'NS4')
    .limit(5);

  console.log('🏪 Sample chain outlets at Choa Chu Kang (NS4):');
  if (cckOutlets && cckOutlets.length > 0) {
    cckOutlets.forEach(o => {
      console.log(`  - ${o.name}`);
      console.log(`    Tags: ${o.food_tags?.join(', ') || 'none'}`);
    });
  } else {
    console.log('  None found');
  }
  console.log('');

  // Check all chain outlets at Yewtee
  const { data: yewteeOutlets, error: yewteeError } = await supabase
    .from('chain_outlets')
    .select('id, name, nearest_station_id, food_tags')
    .eq('nearest_station_id', 'NS5')
    .limit(5);

  console.log('🏪 Sample chain outlets at Yewtee (NS5):');
  if (yewteeOutlets && yewteeOutlets.length > 0) {
    yewteeOutlets.forEach(o => {
      console.log(`  - ${o.name}`);
      console.log(`    Tags: ${o.food_tags?.join(', ') || 'none'}`);
    });
  } else {
    console.log('  None found');
  }
}

checkStationMismatch();
