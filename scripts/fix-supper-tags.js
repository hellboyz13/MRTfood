/**
 * Fix Supper tags - Remove from places closing at 10pm or earlier
 * Supper should only be for places open past 11pm
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DRY_RUN = process.argv.includes('--dry-run');

// Get closing hour from opening_hours (returns 24h format, e.g., 2200 for 10pm)
function getLatestClosingHour(openingHours) {
  if (!openingHours) return null;

  // Handle Google Places format
  if (typeof openingHours === 'object' && openingHours.periods) {
    // Check for 24 hours (no close time means 24h)
    const has24h = openingHours.periods.some(p => p.open && !p.close);
    if (has24h) return 2400; // Treat 24h as closing at midnight (always valid)

    // Get latest closing time across all days
    let latestClose = 0;
    openingHours.periods.forEach(period => {
      if (period.close?.time) {
        const closeTime = parseInt(period.close.time);
        // Handle overnight (e.g., 0100 = 1am next day = 25:00)
        const adjustedClose = closeTime < 600 ? closeTime + 2400 : closeTime;
        if (adjustedClose > latestClose) latestClose = adjustedClose;
      }
    });
    return latestClose > 0 ? latestClose : null;
  }

  return null;
}

// Check if closing time qualifies for supper (11pm or later)
function isSupperTime(closingHour) {
  if (closingHour === null) return false; // Unknown hours - don't tag
  // 2300 = 11pm, anything >= 2300 qualifies (including overnight like 2500 = 1am)
  return closingHour >= 2300;
}

async function fixSupperTags() {
  console.log('='.repeat(60));
  console.log('FIX SUPPER TAGS - Remove from places closing at/before 10pm');
  console.log('='.repeat(60));

  if (DRY_RUN) {
    console.log('\n*** DRY RUN MODE - No changes will be made ***\n');
  }

  // ==================== FOOD LISTINGS ====================
  console.log('\n=== Processing food_listings ===');

  const { data: listings } = await supabase
    .from('food_listings')
    .select('id, name, tags, opening_hours')
    .contains('tags', ['Supper']);

  let listingsToFix = [];

  listings?.forEach(listing => {
    const closingHour = getLatestClosingHour(listing.opening_hours);

    // Keep Supper tag if:
    // 1. Has "Late Night" tag (manually tagged)
    // 2. Closes at 11pm or later
    const hasLateNightTag = listing.tags?.includes('Late Night');
    const closesLate = isSupperTime(closingHour);

    if (!hasLateNightTag && !closesLate) {
      listingsToFix.push({
        id: listing.id,
        name: listing.name,
        closingHour,
        newTags: listing.tags.filter(t => t !== 'Supper')
      });
    }
  });

  console.log(`Found ${listingsToFix.length} listings to remove Supper tag from:`);
  listingsToFix.slice(0, 20).forEach(l => {
    const time = l.closingHour ? `${Math.floor(l.closingHour / 100)}:${(l.closingHour % 100).toString().padStart(2, '0')}` : 'unknown';
    console.log(`  - ${l.name} (closes ${time})`);
  });
  if (listingsToFix.length > 20) console.log(`  ... and ${listingsToFix.length - 20} more`);

  // ==================== MALL OUTLETS ====================
  console.log('\n=== Processing mall_outlets ===');

  const { data: outlets } = await supabase
    .from('mall_outlets')
    .select('id, name, tags, opening_hours')
    .contains('tags', ['Supper']);

  let outletsToFix = [];

  outlets?.forEach(outlet => {
    const closingHour = getLatestClosingHour(outlet.opening_hours);
    const closesLate = isSupperTime(closingHour);

    if (!closesLate) {
      outletsToFix.push({
        id: outlet.id,
        name: outlet.name,
        closingHour,
        newTags: outlet.tags.filter(t => t !== 'Supper')
      });
    }
  });

  console.log(`Found ${outletsToFix.length} outlets to remove Supper tag from:`);
  outletsToFix.slice(0, 20).forEach(o => {
    const time = o.closingHour ? `${Math.floor(o.closingHour / 100)}:${(o.closingHour % 100).toString().padStart(2, '0')}` : 'unknown';
    console.log(`  - ${o.name} (closes ${time})`);
  });
  if (outletsToFix.length > 20) console.log(`  ... and ${outletsToFix.length - 20} more`);

  // ==================== APPLY FIXES ====================
  if (!DRY_RUN) {
    console.log('\n=== Applying fixes ===');

    // Fix listings
    for (const listing of listingsToFix) {
      const { error } = await supabase
        .from('food_listings')
        .update({ tags: listing.newTags })
        .eq('id', listing.id);
      if (error) console.error(`Error updating listing ${listing.id}:`, error);
    }
    console.log(`Updated ${listingsToFix.length} food_listings`);

    // Fix outlets
    for (const outlet of outletsToFix) {
      const { error } = await supabase
        .from('mall_outlets')
        .update({ tags: outlet.newTags })
        .eq('id', outlet.id);
      if (error) console.error(`Error updating outlet ${outlet.id}:`, error);
    }
    console.log(`Updated ${outletsToFix.length} mall_outlets`);
  }

  // ==================== SUMMARY ====================
  console.log('\n=== Summary ===');
  console.log(`food_listings: Removed Supper tag from ${listingsToFix.length} items`);
  console.log(`mall_outlets: Removed Supper tag from ${outletsToFix.length} items`);

  // Get new counts
  if (!DRY_RUN) {
    const { data: newListings } = await supabase
      .from('food_listings')
      .select('id')
      .contains('tags', ['Supper']);
    const { data: newOutlets } = await supabase
      .from('mall_outlets')
      .select('id')
      .contains('tags', ['Supper']);
    console.log(`\nNew counts:`);
    console.log(`  food_listings with Supper: ${newListings?.length}`);
    console.log(`  mall_outlets with Supper: ${newOutlets?.length}`);
  }
}

fixSupperTags();
