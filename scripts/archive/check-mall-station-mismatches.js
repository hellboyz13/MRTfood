const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkMallStationMismatches() {
  console.log('Checking for mall-station mismatches...\n');

  // Get all malls
  const { data: malls, error: mallsError } = await supabase
    .from('malls')
    .select('id, name, station_id, address')
    .order('name');

  if (mallsError) {
    console.error('Error fetching malls:', mallsError);
    return;
  }

  console.log(`Found ${malls.length} malls\n`);

  const mismatches = [];

  for (const mall of malls) {
    // Get outlets for this mall
    const { data: outlets } = await supabase
      .from('mall_outlets')
      .select('id, name, mall_id')
      .eq('mall_id', mall.id);

    // Get food listings at this mall (by address)
    const { data: listings } = await supabase
      .from('food_listings')
      .select('id, name, station_id, address')
      .or(`address.ilike.%${mall.name}%,address.ilike.%${mall.address}%`);

    if (listings && listings.length > 0) {
      // Check if any listings have different station_id
      const listingStations = [...new Set(listings.map(l => l.station_id))];

      if (listingStations.length > 0 && !listingStations.includes(mall.station_id)) {
        mismatches.push({
          mall: mall.name,
          mallStation: mall.station_id,
          listingStations: listingStations,
          listingsCount: listings.length,
          outletsCount: outlets?.length || 0,
          address: mall.address,
          listings: listings.map(l => ({ name: l.name, station: l.station_id }))
        });
      }
    }
  }

  console.log('='.repeat(80));
  console.log('MISMATCHES FOUND:');
  console.log('='.repeat(80));

  if (mismatches.length === 0) {
    console.log('✅ No mismatches found! All malls match their listings.');
  } else {
    mismatches.forEach((m, i) => {
      console.log(`\n${i + 1}. ${m.mall}`);
      console.log(`   Mall station: ${m.mallStation}`);
      console.log(`   Listings station(s): ${m.listingStations.join(', ')}`);
      console.log(`   Address: ${m.address}`);
      console.log(`   Listings count: ${m.listingsCount}`);
      console.log(`   Outlets count: ${m.outletsCount}`);
      console.log(`   Listings:`);
      m.listings.forEach(l => {
        console.log(`     - ${l.name} (${l.station})`);
      });
    });

    console.log(`\n${'='.repeat(80)}`);
    console.log(`Total mismatches: ${mismatches.length}`);
  }
}

checkMallStationMismatches().then(() => process.exit(0));
