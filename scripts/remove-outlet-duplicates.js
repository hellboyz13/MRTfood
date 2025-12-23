/**
 * Remove mall_outlets that also exist in food_listings AT THE SAME STATION
 *
 * Priority:
 * - Guide (food_listings) > Mall (mall_outlets)
 * - If a restaurant exists in both tables AT THE SAME STATION, remove from mall_outlets
 * - Chain restaurants can exist at multiple stations - only remove duplicates at same station
 *
 * Example:
 * - Genki Sushi in Guide at Orchard + Genki Sushi in Mall at Orchard = REMOVE mall outlet
 * - Genki Sushi in Guide at Orchard + Genki Sushi in Mall at Chinatown = KEEP mall outlet
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Run with --dry-run to preview without deleting
const DRY_RUN = process.argv.includes('--dry-run');

// Normalize name for comparison
function normalizeName(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/['']/g, "'")  // Normalize apostrophes
    .replace(/singapore$/i, '')  // Remove "Singapore" suffix
    .replace(/\s*\([^)]*\)\s*$/g, '')  // Remove parenthetical suffixes like "(Marina Bay)"
    .trim();
}

async function findAndRemoveDuplicates() {
  console.log('=== Finding Mall Outlets that exist in Food Listings (SAME STATION ONLY) ===');
  if (DRY_RUN) {
    console.log('>>> DRY RUN MODE - No deletions will be made <<<');
  }
  console.log('');

  // Get all active food_listings (paginate to avoid 1000 row limit)
  let allListings = [];
  let listingsOffset = 0;
  const pageSize = 1000;

  while (true) {
    const { data: listings, error: listingsError } = await supabase
      .from('food_listings')
      .select('id, name, station_id')
      .eq('is_active', true)
      .range(listingsOffset, listingsOffset + pageSize - 1);

    if (listingsError) {
      console.error('Error fetching listings:', listingsError);
      return;
    }

    allListings = allListings.concat(listings);
    if (listings.length < pageSize) break;
    listingsOffset += pageSize;
  }

  const listings = allListings;

  // Get all mall_outlets (paginate to avoid 1000 row limit)
  let allOutlets = [];
  let outletsOffset = 0;

  while (true) {
    const { data: outlets, error: outletsError } = await supabase
      .from('mall_outlets')
      .select('id, name, mall_id')
      .range(outletsOffset, outletsOffset + pageSize - 1);

    if (outletsError) {
      console.error('Error fetching outlets:', outletsError);
      return;
    }

    allOutlets = allOutlets.concat(outlets);
    if (outlets.length < pageSize) break;
    outletsOffset += pageSize;
  }

  const outlets = allOutlets;

  // Get malls to find their stations
  const { data: malls } = await supabase
    .from('malls')
    .select('id, station_id');

  const mallStationMap = new Map();
  malls.forEach(m => mallStationMap.set(m.id, m.station_id));

  // Build map of normalized listing names by station (ONLY by station, no cross-station matching)
  const listingsByStation = new Map();
  listings.forEach(l => {
    const normalized = normalizeName(l.name);
    const key = normalized + '|' + (l.station_id || '');
    listingsByStation.set(key, l);
  });

  // Find outlets that match listings
  const toRemove = [];

  outlets.forEach(outlet => {
    const normalized = normalizeName(outlet.name);
    const stationId = mallStationMap.get(outlet.mall_id);
    const stationKey = normalized + '|' + (stationId || '');

    // ONLY check for exact station match - no cross-station matching!
    const match = listingsByStation.get(stationKey);

    if (match) {
      toRemove.push({
        outlet,
        matchedListing: match,
        stationId,
        reason: 'Exists in food_listings at same station'
      });
    }
  });

  console.log(`Food listings: ${listings.length}`);
  console.log(`Mall outlets: ${outlets.length}`);
  console.log(`Duplicates found: ${toRemove.length}\n`);

  if (toRemove.length === 0) {
    console.log('No duplicates to remove!');
    return;
  }

  // Show what will be removed
  console.log('=== Outlets to Remove (same station only) ===\n');
  toRemove.forEach(item => {
    console.log(`REMOVE outlet: "${item.outlet.name}" at station ${item.stationId}`);
    console.log(`  KEEP listing: "${item.matchedListing.name}" at station ${item.matchedListing.station_id}`);
    console.log('');
  });

  if (DRY_RUN) {
    console.log('--- DRY RUN: Would remove these duplicates ---\n');
    console.log(`Would remove: ${toRemove.length} mall outlets`);
    console.log('\nRun without --dry-run to actually delete.');
    return;
  }

  // Remove the duplicates
  console.log('--- Removing duplicates ---\n');

  let removed = 0;
  for (const item of toRemove) {
    const { error } = await supabase
      .from('mall_outlets')
      .delete()
      .eq('id', item.outlet.id);

    if (error) {
      console.log(`❌ Failed to remove ${item.outlet.name}: ${error.message}`);
    } else {
      console.log(`✅ Removed: ${item.outlet.name}`);
      removed++;
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Removed: ${removed} mall outlets`);
}

findAndRemoveDuplicates().catch(console.error);
