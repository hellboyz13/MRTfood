const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAllMalls() {
  // Get all malls with outlet count
  const { data: malls } = await supabase
    .from('malls')
    .select('id, name, station_id')
    .order('name');

  console.log('Checking', malls.length, 'malls...\n');

  // For each mall, get outlet count
  const mallsWithCounts = await Promise.all(
    malls.map(async (mall) => {
      const { data: outlets } = await supabase
        .from('mall_outlets')
        .select('id')
        .eq('mall_id', mall.id);
      return {
        ...mall,
        outletCount: outlets?.length || 0
      };
    })
  );

  // Filter malls with outlets
  const mallsWithOutlets = mallsWithCounts.filter(m => m.outletCount > 0);
  const mallsWithoutOutlets = mallsWithCounts.filter(m => m.outletCount === 0);

  console.log('='.repeat(60));
  console.log('MALLS OVERVIEW');
  console.log('='.repeat(60));
  console.log('Total malls:', malls.length);
  console.log('Malls with outlets:', mallsWithOutlets.length);
  console.log('Malls without outlets:', mallsWithoutOutlets.length);
  console.log();

  // Now check which stations have NO curated listings
  const { data: allListings } = await supabase
    .from('food_listings')
    .select('station_id')
    .eq('is_active', true)
    .not('station_id', 'is', null);

  const stationsWithListings = new Set(allListings.map(l => l.station_id));

  // Check which malls are at stations with NO curated listings
  const mallsAtEmptyStations = mallsWithOutlets.filter(m =>
    !stationsWithListings.has(m.station_id)
  );

  console.log('='.repeat(60));
  console.log('MALLS AT STATIONS WITH NO CURATED LISTINGS');
  console.log('(These stations show ONLY malls in the malls tab)');
  console.log('='.repeat(60));
  if (mallsAtEmptyStations.length === 0) {
    console.log('None - all mall stations have at least 1 curated listing');
  } else {
    console.log('Count:', mallsAtEmptyStations.length);
    console.log();
    mallsAtEmptyStations.forEach(m => {
      console.log('  -', m.name, '(' + m.outletCount + ' outlets) at station:', m.station_id);
    });
  }

  // Now check for the HillV2-like issue: stations with listings but NO sources
  console.log();
  console.log('='.repeat(60));
  console.log('STATIONS WITH LISTINGS BUT NO SOURCES (like HillV2)');
  console.log('='.repeat(60));

  const uniqueStations = [...new Set(allListings.map(l => l.station_id))];
  console.log('Checking', uniqueStations.length, 'stations...\n');

  const stationsWithNoSourceIssue = [];

  for (const stationId of uniqueStations) {
    // Get all listing IDs for this station
    const { data: listingsWithDetails } = await supabase
      .from('food_listings')
      .select('id, name')
      .eq('station_id', stationId)
      .eq('is_active', true);

    if (!listingsWithDetails || listingsWithDetails.length === 0) continue;

    const listingIds = listingsWithDetails.map(l => l.id);

    // Check if ANY have sources
    const { data: sources } = await supabase
      .from('listing_sources')
      .select('listing_id')
      .in('listing_id', listingIds);

    if (!sources || sources.length === 0) {
      // ALL listings at this station have no sources
      stationsWithNoSourceIssue.push({
        stationId,
        listingCount: listingsWithDetails.length,
        listings: listingsWithDetails.map(l => l.name)
      });
    }
  }

  if (stationsWithNoSourceIssue.length === 0) {
    console.log('None found - all stations have at least 1 listing with sources');
  } else {
    console.log('Found', stationsWithNoSourceIssue.length, 'stations with NO sources on ANY listing:');
    stationsWithNoSourceIssue.forEach(s => {
      console.log('\n  Station:', s.stationId);
      console.log('  Listings:', s.listingCount);
      s.listings.forEach(name => console.log('    -', name));
    });
  }

  console.log();
  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log('Stations with ONLY malls (no curated listings):', mallsAtEmptyStations.length);
  console.log('Stations with listings but NO sources:', stationsWithNoSourceIssue.length);
}

checkAllMalls();
