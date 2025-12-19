import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function testBangkitAPI() {
  console.log('Testing Bangkit station API calls...\n');

  // Test 1: Get station
  console.log('1. Testing getStation(bangkit):');
  const { data: station, error: stationError } = await supabase
    .from('stations')
    .select('*')
    .eq('id', 'bangkit')
    .single();

  if (stationError) {
    console.error('❌ Error:', stationError);
  } else {
    console.log('✅ Station found:', station?.name);
  }

  // Test 2: Get food listings
  console.log('\n2. Testing getFoodListingsByStation(bangkit):');
  const { data: listings, error: listingsError } = await supabase
    .from('food_listings')
    .select('*')
    .eq('station_id', 'bangkit')
    .eq('is_active', true);

  if (listingsError) {
    console.error('❌ Error:', listingsError);
  } else {
    console.log(`✅ Found ${listings?.length || 0} listings:`);
    listings?.forEach(l => console.log(`   - ${l.name}`));
  }

  // Test 3: Get sponsored listings
  console.log('\n3. Testing getSponsoredListing(bangkit):');
  const today = new Date().toISOString().split('T')[0];
  const { data: sponsored, error: sponsoredError } = await supabase
    .from('sponsored_listings')
    .select('*')
    .eq('station_id', 'bangkit')
    .eq('is_active', true)
    .lte('start_date', today)
    .gte('end_date', today)
    .limit(1);

  if (sponsoredError) {
    console.error('❌ Error:', sponsoredError);
  } else {
    console.log(`✅ Found ${sponsored?.length || 0} sponsored listing(s)`);
  }

  // Test 4: Get chain outlets
  console.log('\n4. Testing getChainOutletsByStation(bangkit):');
  const { data: outlets, error: outletsError } = await supabase
    .from('chain_outlets')
    .select('*')
    .eq('nearest_station_id', 'bangkit')
    .eq('is_active', true);

  if (outletsError) {
    console.error('❌ Error:', outletsError);
  } else {
    console.log(`✅ Found ${outlets?.length || 0} chain outlets`);
  }
}

testBangkitAPI().catch(console.error);
