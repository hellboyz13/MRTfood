import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  },
});

async function showLRTFood() {
  // Get all stations
  const { data: allStations, error: stationsError } = await supabase
    .from('stations')
    .select('*')
    .order('name');

  if (stationsError) {
    console.error('Error fetching stations:', stationsError);
    return;
  }

  // LRT station names (since lines array is empty in DB)
  const lrtStationNames = [
    // Bukit Panjang LRT
    'Choa Chu Kang', 'South View', 'Keat Hong', 'Teck Whye', 'Phoenix',
    'Bukit Panjang', 'Petir', 'Pending', 'Bangkit', 'Fajar',
    'Segar', 'Jelapang', 'Senja', 'Ten Mile Junction',
    // Sengkang LRT
    'Sengkang', 'Compassvale', 'Rumbia', 'Bakau', 'Kangkar',
    'Ranggung', 'Cheng Lim', 'Farmway', 'Kupang', 'Thanggam',
    'Fernvale', 'Layar', 'Tongkang', 'Renjong',
    // Punggol LRT
    'Punggol', 'Cove', 'Meridian', 'Coral Edge', 'Riviera',
    'Kadaloor', 'Oasis', 'Damai', 'Sam Kee', 'Teck Lee',
    'Punggol Point', 'Samudera', 'Nibong', 'Sumang',
    'Soo Teck'
  ];

  const stations = (allStations as any[]).filter((station: any) =>
    lrtStationNames.includes(station.name)
  );

  if (!stations || stations.length === 0) {
    console.log('No LRT stations found');
    return;
  }

  console.log(`\n📍 Found ${stations.length} LRT stations\n`);
  console.log('='.repeat(80));

  for (const station of stations as any[]) {
    // Get food listings for this station
    const { data: listings, error: listingsError } = await supabase
      .from('food_listings')
      .select('id, name, description, tags')
      .eq('station_id', station.id)
      .eq('is_active', true);

    // Get chain outlets for this station
    const { data: chainOutlets, error: chainsError } = await supabase
      .from('chain_outlets')
      .select('id, name, brand_id')
      .eq('nearest_station_id', station.id)
      .eq('is_active', true);

    const curatedCount = listings?.length || 0;
    const chainCount = chainOutlets?.length || 0;
    const totalCount = curatedCount + chainCount;

    console.log(`\n📍 ${station.name.toUpperCase()}`);
    console.log(`   Total: ${totalCount} food places (${curatedCount} curated + ${chainCount} chains)`);

    if (curatedCount > 0) {
      console.log('\n   🍽️  CURATED LISTINGS:');
      (listings as any[])!.forEach((listing: any, index: number) => {
        console.log(`      ${index + 1}. ${listing.name}`);
        if (listing.tags && listing.tags.length > 0) {
          console.log(`         Tags: ${listing.tags.join(', ')}`);
        }
      });
    }

    if (chainCount > 0) {
      console.log('\n   🏪 CHAIN OUTLETS:');
      (chainOutlets as any[])!.forEach((outlet: any, index: number) => {
        console.log(`      ${index + 1}. ${outlet.name}`);
      });
    }

    if (totalCount === 0) {
      console.log('   ⚠️  No food places yet');
    }

    console.log('\n' + '-'.repeat(80));
  }

  console.log('\n✅ Done!\n');
}

showLRTFood();
