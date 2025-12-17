/**
 * Remove Duplicate Listings Script
 *
 * Rules:
 * 1. If a POPULAR food listing exists in a mall → remove from food_listings (keep in mall)
 * 2. If a CURATED food listing exists in a mall → remove from mall_outlets (keep curated)
 *
 * Run with: node scripts/remove-duplicates.js [--save]
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Curated source IDs (recommended, food-king)
const CURATED_SOURCE_IDS = ['recommended', 'food-king'];
// Popular source ID
const POPULAR_SOURCE_ID = 'popular';

// Normalize name for comparison
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[''`]/g, "'")
    .replace(/[@#&]/g, '')
    .replace(/\s*\([^)]*\)\s*/g, ' ') // Remove parentheses content
    .replace(/\s*-\s*[^-]*$/g, '')    // Remove suffix after dash (e.g., "- Orchard")
    .replace(/[^\w\s']/g, ' ')        // Replace special chars with space
    .replace(/\s+/g, ' ')
    .trim();
}

// Get core name (first significant words, removing location suffixes)
function getCoreName(name) {
  const normalized = normalizeName(name);
  // Remove common location suffixes
  const locations = ['singapore', 'orchard', 'bugis', 'tampines', 'jurong', 'woodlands',
    'amk', 'hub', 'mall', 'plaza', 'point', 'square', 'centre', 'center', 'vivocity',
    'junction', 'nex', 'northpoint', 'hougang', 'sengkang', 'punggol', 'bedok'];

  let words = normalized.split(' ').filter(w => w.length > 1);
  // Remove location words from end
  while (words.length > 1 && locations.includes(words[words.length - 1])) {
    words.pop();
  }
  return words.join(' ');
}

// Check if two names match (strict matching)
function namesMatch(name1, name2) {
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);

  // Exact normalized match
  if (n1 === n2) return true;

  // Get core names
  const core1 = getCoreName(name1);
  const core2 = getCoreName(name2);

  // Core names must be at least 3 chars
  if (core1.length < 3 || core2.length < 3) return false;

  // Exact core match
  if (core1 === core2) return true;

  // One core contains the other completely (for chains)
  // But require minimum 60% overlap to avoid false positives
  if (core1.includes(core2) && core2.length >= core1.length * 0.6) return true;
  if (core2.includes(core1) && core1.length >= core2.length * 0.6) return true;

  return false;
}

async function main() {
  const args = process.argv.slice(2);
  const saveMode = args.includes('--save');

  console.log('========================================');
  console.log('Remove Duplicate Listings Script');
  console.log('========================================');
  console.log(`Mode: ${saveMode ? 'SAVE' : 'DRY RUN'}\n`);

  // Fetch all food listings with their sources
  console.log('Fetching food listings...');
  const { data: listings, error: listingsError } = await supabase
    .from('food_listings')
    .select('id, name, source_id, station_id')
    .eq('is_active', true);

  if (listingsError) {
    console.error('Error fetching listings:', listingsError);
    process.exit(1);
  }

  // Separate curated and popular listings
  const curatedListings = listings.filter(l => CURATED_SOURCE_IDS.includes(l.source_id));
  const popularListings = listings.filter(l => l.source_id === POPULAR_SOURCE_ID || !CURATED_SOURCE_IDS.includes(l.source_id));

  console.log(`  Curated listings: ${curatedListings.length}`);
  console.log(`  Popular listings: ${popularListings.length}`);

  // Fetch all mall outlets
  console.log('\nFetching mall outlets...');
  const { data: outlets, error: outletsError } = await supabase
    .from('mall_outlets')
    .select('id, name, mall_id');

  if (outletsError) {
    console.error('Error fetching outlets:', outletsError);
    process.exit(1);
  }

  console.log(`  Mall outlets: ${outlets.length}`);

  // Fetch malls to get station mapping
  const { data: malls } = await supabase
    .from('malls')
    .select('id, name, station_id');

  const mallStationMap = new Map((malls || []).map(m => [m.id, m.station_id]));

  // Track duplicates to remove
  const popularToRemove = []; // food_listings IDs to deactivate
  const outletsToRemove = []; // mall_outlets IDs to delete

  console.log('\n========================================');
  console.log('Checking for duplicates...');
  console.log('========================================\n');

  // Rule 1: Popular listings that exist in mall → remove from food_listings
  console.log('Rule 1: Popular listings duplicated in malls');
  console.log('--------------------------------------------');

  for (const listing of popularListings) {
    for (const outlet of outlets) {
      if (namesMatch(listing.name, outlet.name)) {
        // Check if same station
        const outletStation = mallStationMap.get(outlet.mall_id);
        if (outletStation === listing.station_id) {
          console.log(`  REMOVE from food_listings: "${listing.name}" (exists in mall as "${outlet.name}")`);
          popularToRemove.push({ id: listing.id, name: listing.name, matchedOutlet: outlet.name });
          break;
        }
      }
    }
  }

  console.log(`\n  Total popular listings to remove: ${popularToRemove.length}`);

  // Rule 2: Curated listings that exist in mall → remove from mall_outlets
  console.log('\nRule 2: Curated listings duplicated in malls');
  console.log('--------------------------------------------');

  for (const listing of curatedListings) {
    for (const outlet of outlets) {
      if (namesMatch(listing.name, outlet.name)) {
        // Check if same station
        const outletStation = mallStationMap.get(outlet.mall_id);
        if (outletStation === listing.station_id) {
          console.log(`  REMOVE from mall_outlets: "${outlet.name}" (curated as "${listing.name}")`);
          outletsToRemove.push({ id: outlet.id, name: outlet.name, matchedListing: listing.name });
          break;
        }
      }
    }
  }

  console.log(`\n  Total mall outlets to remove: ${outletsToRemove.length}`);

  // Summary
  console.log('\n========================================');
  console.log('SUMMARY');
  console.log('========================================');
  console.log(`Popular listings to deactivate: ${popularToRemove.length}`);
  console.log(`Mall outlets to delete: ${outletsToRemove.length}`);

  if (!saveMode) {
    console.log('\n========================================');
    console.log('DRY RUN - No changes made');
    console.log('Run with --save to apply changes');
    console.log('========================================');
    return;
  }

  // Apply changes
  console.log('\n========================================');
  console.log('APPLYING CHANGES');
  console.log('========================================');

  // Deactivate popular listings
  if (popularToRemove.length > 0) {
    console.log('\nDeactivating popular listings...');
    for (const item of popularToRemove) {
      const { error } = await supabase
        .from('food_listings')
        .update({ is_active: false })
        .eq('id', item.id);

      if (error) {
        console.error(`  ✗ Failed to deactivate "${item.name}": ${error.message}`);
      } else {
        console.log(`  ✓ Deactivated: ${item.name}`);
      }
    }
  }

  // Delete mall outlets
  if (outletsToRemove.length > 0) {
    console.log('\nDeleting mall outlets...');
    for (const item of outletsToRemove) {
      const { error } = await supabase
        .from('mall_outlets')
        .delete()
        .eq('id', item.id);

      if (error) {
        console.error(`  ✗ Failed to delete "${item.name}": ${error.message}`);
      } else {
        console.log(`  ✓ Deleted: ${item.name}`);
      }
    }
  }

  console.log('\nDone!');
}

main().catch(console.error);
