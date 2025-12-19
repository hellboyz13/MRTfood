const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const adjacentStations = {
  'marina-bay': ['bayfront', 'raffles-place', 'downtown'],
  'one-north': ['buona-vista', 'holland-village'],
  'bartley': ['woodleigh', 'serangoon'],
};

async function testNearbyFallback() {
  console.log('Testing nearby station fallback logic...\n');

  for (const [emptyStation, nearbyStations] of Object.entries(adjacentStations)) {
    console.log('='.repeat(60));
    console.log(`Testing: ${emptyStation}`);
    console.log('Adjacent stations:', nearbyStations.join(', '));

    // Check if empty station has listings
    const { data: listings } = await supabase
      .from('food_listings')
      .select('id, name')
      .eq('station_id', emptyStation)
      .eq('is_active', true);

    console.log(`Direct listings at ${emptyStation}:`, listings?.length || 0);

    // Check nearby stations
    for (const nearbyId of nearbyStations) {
      const { data: nearbyListings } = await supabase
        .from('food_listings')
        .select('id, name')
        .eq('station_id', nearbyId)
        .eq('is_active', true);

      console.log(`  → ${nearbyId}: ${nearbyListings?.length || 0} listings`);

      if (nearbyListings && nearbyListings.length > 0) {
        console.log(`    ✓ Would use ${nearbyId} as fallback`);
        console.log(`    First 3:`, nearbyListings.slice(0, 3).map(l => l.name).join(', '));
        break; // Found fallback, stop looking
      }
    }

    console.log();
  }
}

testNearbyFallback();
