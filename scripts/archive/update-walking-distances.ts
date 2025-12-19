/**
 * Batch Update Walking Distances Script
 * Uses OneMap API to calculate accurate walking distances for all listings
 *
 * Usage: npx tsx scripts/update-walking-distances.ts
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { getWalkingDistance } from '../lib/onemap';

// Load environment variables from .env.local
config({ path: '.env.local' });

// Initialize Supabase client with service key for admin access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ListingWithStation {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  station_id: string;
  stations: {
    lat: number;
    lng: number;
    name: string;
  };
}

async function updateAllWalkingDistances() {
  console.log('🚶 Starting walking distance update...\n');

  // Get all listings that need walking distance calculated
  // Only get listings that have lat/lng and a station
  const { data: listings, error } = await supabase
    .from('food_listings')
    .select(`
      id, name, lat, lng, station_id,
      stations!inner(lat, lng, name)
    `)
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .not('station_id', 'is', null);

  if (error) {
    console.error('Error fetching listings:', error);
    process.exit(1);
  }

  if (!listings || listings.length === 0) {
    console.log('No listings to update');
    return;
  }

  console.log(`Found ${listings.length} listings to process\n`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i] as unknown as ListingWithStation;

    // Skip if no coordinates
    if (!listing.lat || !listing.lng) {
      console.log(`⏭️  Skipping ${listing.name}: No coordinates`);
      skipped++;
      continue;
    }

    const station = listing.stations;
    if (!station || !station.lat || !station.lng) {
      console.log(`⏭️  Skipping ${listing.name}: No station coordinates`);
      skipped++;
      continue;
    }

    try {
      const result = await getWalkingDistance(
        station.lat,
        station.lng,
        listing.lat,
        listing.lng
      );

      if (result.success) {
        // Update database with walking distance
        const { error: updateError } = await supabase
          .from('food_listings')
          .update({
            distance_to_station: result.distance,
            walking_time: result.duration * 60, // Store in seconds
          })
          .eq('id', listing.id);

        if (updateError) {
          console.log(`❌ ${listing.name}: Database update failed - ${updateError.message}`);
          failed++;
        } else {
          console.log(`✅ [${i + 1}/${listings.length}] ${listing.name}: ${result.distance}m (${result.duration} min walk) from ${station.name}`);
          updated++;
        }
      } else {
        // Still update with estimated distance
        const { error: updateError } = await supabase
          .from('food_listings')
          .update({
            distance_to_station: result.distance,
            walking_time: result.duration * 60,
          })
          .eq('id', listing.id);

        if (updateError) {
          console.log(`❌ ${listing.name}: Database update failed - ${updateError.message}`);
          failed++;
        } else {
          console.log(`⚠️  [${i + 1}/${listings.length}] ${listing.name}: ~${result.distance}m estimated (API: ${result.error})`);
          updated++;
        }
      }

      // Rate limiting - wait 200ms between requests to respect API limits
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (error) {
      console.error(`❌ Error updating ${listing.name}:`, error);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary:');
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log('='.repeat(50));
}

// Run the script
updateAllWalkingDistances()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
