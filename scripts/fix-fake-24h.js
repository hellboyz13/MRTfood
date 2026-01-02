/**
 * Fix fake 24-hour entries by fetching correct opening hours from Google Places API
 *
 * Run with: node scripts/fix-fake-24h.js
 * Use --dry-run to preview changes without applying
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
const DRY_RUN = process.argv.includes('--dry-run');

// Check if hours indicate late closing (11pm or later)
function isLateClosing(periods) {
  if (!periods || periods.length === 0) return false;

  for (const period of periods) {
    // No close = 24 hours
    if (period.open && !period.close) return true;

    if (period.close?.time) {
      const closeTime = parseInt(period.close.time);
      // Handle overnight (e.g., 0100 = 1am = 25:00)
      const adjustedClose = closeTime < 600 ? closeTime + 2400 : closeTime;
      if (adjustedClose >= 2300) return true;
    }
  }
  return false;
}

// Fetch place details from Google Places API
async function fetchPlaceDetails(placeId) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,opening_hours&key=${GOOGLE_API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.result) {
      return data.result.opening_hours || null;
    }
    console.log(`  API status: ${data.status}`);
    return null;
  } catch (error) {
    console.error(`  Error fetching place details:`, error.message);
    return null;
  }
}

async function fixFake24hEntries() {
  console.log('='.repeat(60));
  console.log('FIX FAKE 24-HOUR ENTRIES');
  console.log('='.repeat(60));

  if (DRY_RUN) {
    console.log('\n*** DRY RUN MODE - No changes will be made ***\n');
  }

  if (!GOOGLE_API_KEY) {
    console.error('ERROR: GOOGLE_PLACES_API_KEY not found in environment');
    return;
  }

  // ==================== FOOD LISTINGS ====================
  console.log('\n=== Processing food_listings ===\n');

  const { data: listings } = await supabase
    .from('food_listings')
    .select('id, name, station_id, google_place_id, opening_hours, tags')
    .eq('is_active', true)
    .not('opening_hours', 'is', null);

  const suspiciousListings = listings?.filter(l => {
    const hours = l.opening_hours;
    return hours?.periods?.length === 1 &&
           hours.periods[0].open?.time === '0000' &&
           !hours.periods[0].close;
  }) || [];

  console.log(`Found ${suspiciousListings.length} suspicious listings\n`);

  let fixedCount = 0;
  let supperRemovedCount = 0;
  let apiCalls = 0;

  for (const listing of suspiciousListings) {
    console.log(`Processing: ${listing.name} @ ${listing.station_id}`);

    if (!listing.google_place_id) {
      console.log(`  SKIP: No google_place_id (needs manual fix)`);
      continue;
    }

    apiCalls++;
    const newHours = await fetchPlaceDetails(listing.google_place_id);

    if (!newHours) {
      console.log(`  SKIP: Could not fetch opening hours`);
      continue;
    }

    // Check if actually 24 hours
    const is24h = newHours.periods?.length === 1 &&
                  newHours.periods[0].open &&
                  !newHours.periods[0].close;

    if (is24h) {
      console.log(`  CONFIRMED: Actually 24 hours - no change needed`);
      continue;
    }

    // Check if closes late enough for Supper
    const closesLate = isLateClosing(newHours.periods);
    const hasSupperTag = listing.tags?.includes('Supper');

    // Prepare updates
    const updates = { opening_hours: newHours };
    let newTags = listing.tags || [];

    if (hasSupperTag && !closesLate) {
      newTags = newTags.filter(t => t !== 'Supper');
      updates.tags = newTags;
      supperRemovedCount++;
      console.log(`  REMOVE SUPPER TAG: Closes before 11pm`);
    }

    // Get latest closing time for display
    let latestClose = 'unknown';
    if (newHours.periods) {
      for (const p of newHours.periods) {
        if (p.close?.time) {
          const h = parseInt(p.close.time.slice(0, 2));
          const m = p.close.time.slice(2);
          latestClose = `${h > 12 ? h - 12 : h}:${m}${h >= 12 ? 'pm' : 'am'}`;
        }
      }
    }
    console.log(`  NEW HOURS: Closes at ${latestClose}`);

    if (!DRY_RUN) {
      const { error } = await supabase
        .from('food_listings')
        .update(updates)
        .eq('id', listing.id);

      if (error) {
        console.log(`  ERROR updating: ${error.message}`);
      } else {
        console.log(`  UPDATED successfully`);
        fixedCount++;
      }
    } else {
      console.log(`  Would update (dry run)`);
      fixedCount++;
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 200));
  }

  // ==================== MALL OUTLETS ====================
  console.log('\n=== Processing mall_outlets ===\n');

  const { data: outlets } = await supabase
    .from('mall_outlets')
    .select('id, name, mall_id, opening_hours, tags')
    .not('opening_hours', 'is', null);

  const suspiciousOutlets = outlets?.filter(o => {
    const hours = o.opening_hours;
    return hours?.periods?.length === 1 &&
           hours.periods[0].open?.time === '0000' &&
           !hours.periods[0].close;
  }) || [];

  console.log(`Found ${suspiciousOutlets.length} suspicious outlets\n`);

  // Mall outlets don't have google_place_id, so we'll need to handle them differently
  for (const outlet of suspiciousOutlets) {
    console.log(`${outlet.name} @ ${outlet.mall_id}`);
    console.log(`  NEEDS MANUAL FIX: No google_place_id available`);
  }

  // ==================== SUMMARY ====================
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`API calls made: ${apiCalls}`);
  console.log(`Listings fixed: ${fixedCount}`);
  console.log(`Supper tags removed: ${supperRemovedCount}`);
  console.log(`Outlets needing manual fix: ${suspiciousOutlets.length}`);

  if (DRY_RUN) {
    console.log('\nRun without --dry-run to apply changes');
  }
}

fixFake24hEntries();
