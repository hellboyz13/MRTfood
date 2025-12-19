/**
 * Fix walking distances for all food listings using OneMap API
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { getWalkingDistance } from '../lib/onemap';

// Force reload env vars
config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function updateWalkingDistances() {
  // Get all listings with coordinates
  const { data: listings, error } = await supabase
    .from('food_listings')
    .select('id, name, lat, lng, station_id, distance_to_station, walking_time')
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .not('station_id', 'is', null);

  if (error) {
    console.error('Error fetching listings:', error);
    return;
  }

  // Get all stations
  const { data: stations, error: stationError } = await supabase
    .from('stations')
    .select('id, lat, lng');

  if (stationError) {
    console.error('Error fetching stations:', stationError);
    return;
  }

  const stationMap = new Map(stations.map(s => [s.id, { lat: s.lat, lng: s.lng }]));

  console.log(`📋 Total listings to process: ${listings.length}\n`);

  let updated = 0;
  let failed = 0;
  let skipped = 0;

  for (const listing of listings) {
    const station = stationMap.get(listing.station_id);
    if (!station || !station.lat || !station.lng) {
      console.log(`⏭️ Skip (no station coords): ${listing.name}`);
      skipped++;
      continue;
    }

    try {
      const result = await getWalkingDistance(
        station.lat, station.lng,
        listing.lat!, listing.lng!
      );

      if (result.success) {
        const walkingTime = Math.max(1, result.duration);

        const { error: updateError } = await supabase
          .from('food_listings')
          .update({
            distance_to_station: result.distance,
            walking_time: walkingTime
          })
          .eq('id', listing.id);

        if (updateError) {
          console.log(`❌ Update failed: ${listing.name} - ${updateError.message}`);
          failed++;
        } else {
          console.log(`✅ ${listing.name}: ${result.distance}m, ${walkingTime} min`);
          updated++;
        }
      } else {
        // Use fallback from the function
        const walkingTime = Math.max(1, result.duration);

        await supabase
          .from('food_listings')
          .update({
            distance_to_station: result.distance,
            walking_time: walkingTime
          })
          .eq('id', listing.id);

        console.log(`⚠️ ${listing.name}: ${result.distance}m, ${walkingTime} min (fallback)`);
        updated++;
      }

      // Rate limit - 150ms between calls
      await new Promise(r => setTimeout(r, 150));
    } catch (err) {
      console.log(`❌ Error: ${listing.name} - ${err}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`📊 Summary:`);
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ⏭️ Skipped: ${skipped}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log('='.repeat(50));
}

updateWalkingDistances();
