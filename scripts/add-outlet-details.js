/**
 * Add Outlet Details (Closing Time & Tags)
 *
 * 1. Search for each outlet on Google Places API to get place_id
 * 2. Fetch opening_hours and types using Place Details
 * 3. Auto-tag based on API data:
 *    - "Supper" if closes > 21:00 OR is 24hr
 *    - "Dessert" if types contain: bakery, ice_cream_shop, dessert_shop, cafe
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// API Cost tracking
let apiCosts = { textSearch: 0, placeDetails: 0 };
let processedCount = 0;
let updatedCount = 0;
let errorCount = 0;

function trackCost(type) {
  const costs = { textSearch: 0.032, placeDetails: 0.017 };
  apiCosts[type] = (apiCosts[type] || 0) + (costs[type] || 0);
}

// Dessert-related types from Google Places API
const DESSERT_TYPES = [
  'bakery',
  'ice_cream_shop',
  'dessert_shop',
  'cafe',
  'confectionery',
  'pastry_shop',
  'chocolate_shop',
  'donut_shop',
  'sweet_shop'
];

// Search for outlet to get place_id
async function searchOutlet(outletName, mallName) {
  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googleApiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress'
      },
      body: JSON.stringify({
        textQuery: `${outletName} ${mallName} Singapore`,
        maxResultCount: 1
      })
    });

    trackCost('textSearch');
    const data = await response.json();

    if (data.places && data.places.length > 0) {
      return data.places[0].id; // This is the place_id
    }
    return null;
  } catch (error) {
    console.error(`  Error searching for ${outletName}:`, error.message);
    return null;
  }
}

// Get place details (opening_hours, types)
async function getPlaceDetails(placeId) {
  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googleApiKey,
        'X-Goog-FieldMask': 'id,regularOpeningHours,types'
      }
    });

    trackCost('placeDetails');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`  Error getting details for ${placeId}:`, error.message);
    return null;
  }
}

// Parse closing time from regularOpeningHours
function parseClosingTime(openingHours) {
  if (!openingHours || !openingHours.periods) return null;

  // Check if 24 hours (open all day, every day)
  const periods = openingHours.periods;
  if (periods.length === 1 &&
      periods[0].open &&
      periods[0].open.hour === 0 &&
      periods[0].open.minute === 0 &&
      !periods[0].close) {
    return '24hr';
  }

  // Find the latest closing time across all days
  let latestClose = null;
  for (const period of periods) {
    if (period.close) {
      const closeTime = `${String(period.close.hour).padStart(2, '0')}:${String(period.close.minute).padStart(2, '0')}`;
      if (!latestClose || closeTime > latestClose) {
        latestClose = closeTime;
      }
    }
  }

  return latestClose;
}

// Determine tags based on API data
function determineTags(closingTime, types) {
  const tags = [];

  // Supper tag: closes after 21:00 or is 24hr
  if (closingTime === '24hr') {
    tags.push('Supper');
  } else if (closingTime) {
    const hour = parseInt(closingTime.split(':')[0]);
    // After 21:00, or late night (00:00-05:00 means they close after midnight)
    if (hour >= 21 || (hour >= 0 && hour <= 5)) {
      tags.push('Supper');
    }
  }

  // Dessert tag: based on types from API
  if (types && types.some(t => DESSERT_TYPES.includes(t))) {
    tags.push('Dessert');
  }

  return tags;
}

async function main() {
  const args = process.argv.slice(2);
  const startFrom = args.includes('--start') ? parseInt(args[args.indexOf('--start') + 1]) || 0 : 0;
  const limit = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) || 100 : 100;
  const dryRun = args.includes('--dry-run');

  console.log('========================================');
  console.log('Add Outlet Details (Closing Time & Tags)');
  console.log('========================================\n');

  if (dryRun) {
    console.log('DRY RUN MODE - No changes will be saved\n');
  }

  // Get outlets with their mall names
  const { data: outlets, error } = await supabase
    .from('mall_outlets')
    .select('id, name, mall_id, closing_time, tags, malls!inner(name)')
    .is('closing_time', null)  // Only process outlets without closing_time
    .range(startFrom, startFrom + limit - 1);

  if (error) {
    console.error('Error fetching outlets:', error);
    return;
  }

  console.log(`Processing ${outlets.length} outlets (starting from ${startFrom})\n`);

  for (let i = 0; i < outlets.length; i++) {
    const outlet = outlets[i];
    const mallName = outlet.malls.name;
    processedCount++;

    console.log(`[${startFrom + i + 1}] ${outlet.name} @ ${mallName}`);

    // Step 1: Search for outlet to get place_id
    const placeId = await searchOutlet(outlet.name, mallName);

    if (!placeId) {
      console.log('  - No place found');
      errorCount++;
      await delay(100);
      continue;
    }

    // Step 2: Get place details
    const details = await getPlaceDetails(placeId);

    if (!details) {
      console.log('  - Could not get details');
      errorCount++;
      await delay(100);
      continue;
    }

    // Step 3: Parse closing time
    const closingTime = parseClosingTime(details.regularOpeningHours);

    // Step 4: Determine tags
    const tags = determineTags(closingTime, details.types);

    console.log(`  - Closing: ${closingTime || 'unknown'}, Tags: [${tags.join(', ')}]`);

    // Step 5: Update database
    if (!dryRun) {
      const updateData = {
        google_place_id: placeId
      };
      if (closingTime) updateData.closing_time = closingTime;
      if (tags.length > 0) updateData.tags = tags;

      const { error: updateError } = await supabase
        .from('mall_outlets')
        .update(updateData)
        .eq('id', outlet.id);

      if (updateError) {
        console.log(`  - Update error: ${updateError.message}`);
        errorCount++;
      } else {
        updatedCount++;
      }
    }

    await delay(150); // Rate limit
  }

  // Summary
  console.log('\n========================================');
  console.log('SUMMARY');
  console.log('========================================');
  console.log(`Processed: ${processedCount}`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`API Cost: $${(apiCosts.textSearch + apiCosts.placeDetails).toFixed(2)}`);
  console.log(`  - Text Search: $${apiCosts.textSearch.toFixed(2)}`);
  console.log(`  - Place Details: $${apiCosts.placeDetails.toFixed(2)}`);

  if (outlets.length === limit) {
    console.log(`\nTo continue, run: node scripts/add-outlet-details.js --start ${startFrom + limit}`);
  }
  console.log('========================================\n');
}

main().catch(console.error);
