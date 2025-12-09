/**
 * Add test food listings for stations
 * Note: Database only has MRT lines (CCL, DTL, EWL, NEL, NSL, TEL), no LRT stations.
 * This script will add test listings to a sample of stations from each line.
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function addTestListings() {
  // Get all stations
  const { data: allStations, error } = await supabase
    .from('stations')
    .select('id, name, lat, lng, lines')
    .order('name');

  if (error) {
    console.error('Error fetching stations:', error);
    return;
  }

  console.log(`Total stations in database: ${allStations?.length || 0}`);

  // Group stations by line
  const stationsByLine: Record<string, typeof allStations> = {};
  allStations?.forEach(station => {
    station.lines?.forEach((line: string) => {
      if (!stationsByLine[line]) stationsByLine[line] = [];
      stationsByLine[line].push(station);
    });
  });

  console.log('\nStations per line:');
  Object.entries(stationsByLine).forEach(([line, stations]) => {
    console.log(`  ${line}: ${stations?.length || 0} stations`);
  });

  // Add one test listing for each station that doesn't have food listings yet
  console.log('\n--- Adding test listings for stations without food ---\n');

  // Get stations that have no food listings
  const { data: stationsWithFood } = await supabase
    .from('food_listings')
    .select('station_id')
    .not('station_id', 'is', null);

  const stationIdsWithFood = new Set(stationsWithFood?.map(f => f.station_id) || []);
  const stationsWithoutFood = allStations?.filter(s => !stationIdsWithFood.has(s.id)) || [];

  console.log(`Stations without food listings: ${stationsWithoutFood.length}`);

  for (const station of stationsWithoutFood) {
    await addTestListing(station);
  }

  console.log('\n✅ Done adding test listings!');
}

async function addTestListing(station: { id: string; name: string; lat: number; lng: number }) {
  // Check if test listing already exists
  const { data: existing } = await supabase
    .from('food_listings')
    .select('id')
    .eq('station_id', station.id)
    .ilike('name', '%LRT Test%')
    .single();

  if (existing) {
    console.log(`⏭️  ${station.name}: Test listing already exists`);
    return;
  }

  // Create test listing near the station (offset slightly)
  const testListing = {
    name: `LRT Test - ${station.name}`,
    address: `Near ${station.name} LRT Station`,
    description: 'Test listing for LRT station coverage',
    lat: station.lat + 0.001, // Offset slightly (~100m)
    lng: station.lng + 0.001,
    station_id: station.id,
    distance_to_station: 150, // Approximate
    walking_time: 120, // 2 minutes
    tags: ['Test', 'LRT'],
    rating: 4.0,
  };

  const { error } = await supabase
    .from('food_listings')
    .insert(testListing);

  if (error) {
    console.log(`❌ ${station.name}: Failed - ${error.message}`);
  } else {
    console.log(`✅ ${station.name}: Added test listing`);
  }
}

addTestListings();
