/**
 * Fetch outlets for empty malls using Google Places API
 *
 * Run with: node scripts/fetch-empty-mall-outlets.js [--save]
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;

if (!supabaseUrl || !supabaseKey || !googleApiKey) {
  console.error('Missing environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const slugify = (str) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// API Cost tracking
let apiCosts = { textSearch: 0, placeDetails: 0 };

function trackCost(type) {
  const costs = { textSearch: 0.032, placeDetails: 0.017 };
  apiCosts[type] = (apiCosts[type] || 0) + (costs[type] || 0);
}

// Extract floor/unit from address
function extractFloorUnit(addressComponents) {
  if (!addressComponents || !Array.isArray(addressComponents)) return null;

  const subpremise = addressComponents.find(c => c.types && c.types.includes('subpremise'));
  const floor = addressComponents.find(c => c.types && c.types.includes('floor'));

  if (subpremise) {
    const unit = subpremise.longText || subpremise.shortText;
    if (unit && unit.startsWith('#')) return unit;
    if (unit) {
      const match = unit.match(/#?\d+-\d+/);
      if (match) return match[0].startsWith('#') ? match[0] : `#${match[0]}`;
      return unit;
    }
  }

  if (floor) {
    const floorText = floor.longText || floor.shortText;
    return floorText ? `Level ${floorText}` : null;
  }

  return null;
}

// Find food outlets using Text Search - more aggressive search
async function findOutletsInMall(mallName, mallAddress) {
  const outlets = [];

  // Multiple search queries to catch more results
  const searchQueries = [
    `restaurant ${mallName} Singapore`,
    `food ${mallName} Singapore`,
    `cafe ${mallName} Singapore`,
    `food court ${mallName} Singapore`,
  ];

  const seenPlaceIds = new Set();

  for (const query of searchQueries) {
    try {
      const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': googleApiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.types,places.rating,places.userRatingCount'
        },
        body: JSON.stringify({
          textQuery: query,
          maxResultCount: 20,
        })
      });

      trackCost('textSearch');
      const data = await response.json();

      if (data.places) {
        for (const place of data.places) {
          // Skip duplicates
          if (seenPlaceIds.has(place.id)) continue;

          // Filter: must be food-related
          const foodTypes = ['restaurant', 'cafe', 'bakery', 'food', 'meal_takeaway', 'meal_delivery', 'coffee_shop', 'fast_food_restaurant'];
          const isFood = place.types?.some(t => foodTypes.includes(t));
          if (!isFood) continue;

          // Check if address contains mall identifiers
          const addressLower = (place.formattedAddress || '').toLowerCase();
          const mallNameLower = mallName.toLowerCase();
          const mallAddressLower = mallAddress.toLowerCase();

          // Extract key identifiers from mall address
          const addressMatch = mallAddressLower.match(/(\d+)\s+(\w+)/);
          const streetNumber = addressMatch ? addressMatch[1] : '';
          const streetName = addressMatch ? addressMatch[2] : '';

          // Mall name words (excluding common words)
          const excludeWords = ['shopping', 'centre', 'center', 'mall', 'plaza', 'the', 'and', 'hub', 'hdb', 'point', 'square'];
          const mallWords = mallNameLower.split(' ').filter(w => w.length > 2 && !excludeWords.includes(w));

          // Check if outlet is in this mall - more lenient matching
          const hasStreetNumber = streetNumber && addressLower.includes(streetNumber);
          const hasStreetName = streetName && addressLower.includes(streetName);
          const hasMallName = mallWords.some(word => addressLower.includes(word));

          // Accept if street matches OR mall name word matches with street number
          const inMall = (hasStreetNumber && hasStreetName) ||
                        (hasMallName && hasStreetNumber) ||
                        (mallWords.length > 0 && mallWords.every(w => addressLower.includes(w)));

          if (!inMall) continue;

          seenPlaceIds.add(place.id);
          outlets.push({
            name: place.displayName.text,
            google_place_id: place.id,
            category: place.types?.find(t => foodTypes.includes(t)) || 'restaurant',
            rating: place.rating || null,
          });
        }
      }

      await delay(200);
    } catch (error) {
      console.error(`  Error searching for ${query}:`, error.message);
    }
  }

  return outlets;
}

// Fetch details for an outlet
async function fetchOutletDetails(placeId) {
  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googleApiKey,
        'X-Goog-FieldMask': 'currentOpeningHours,regularOpeningHours,addressComponents,photos'
      }
    });

    trackCost('placeDetails');
    const data = await response.json();

    if (response.ok && data) {
      const openingHours = data.regularOpeningHours || data.currentOpeningHours;
      let formattedHours = null;

      if (openingHours) {
        formattedHours = {
          open_now: openingHours.openNow,
          periods: openingHours.periods?.map(p => ({
            open: {
              day: p.open?.day,
              time: p.open ? `${String(p.open.hour || 0).padStart(2, '0')}${String(p.open.minute || 0).padStart(2, '0')}` : null
            },
            close: p.close ? {
              day: p.close.day,
              time: `${String(p.close.hour || 0).padStart(2, '0')}${String(p.close.minute || 0).padStart(2, '0')}`
            } : undefined
          })),
          weekday_text: openingHours.weekdayDescriptions || []
        };
      }

      let thumbnailUrl = null;
      if (data.photos && data.photos.length > 0) {
        const photoName = data.photos[0].name;
        thumbnailUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=400&key=${googleApiKey}`;
      }

      return {
        opening_hours: formattedHours,
        level: extractFloorUnit(data.addressComponents),
        thumbnail_url: thumbnailUrl,
      };
    }

    return null;
  } catch (error) {
    console.error(`  Error fetching details for ${placeId}:`, error.message);
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const saveMode = args.includes('--save');

  console.log('========================================');
  console.log('Fetch Outlets for Empty Malls');
  console.log('========================================');
  console.log(`Mode: ${saveMode ? 'SAVE' : 'DRY RUN'}\n`);

  // Get all malls with outlet counts
  const { data: malls } = await supabase
    .from('malls')
    .select('id, name, address, station_id');

  const { data: outlets } = await supabase
    .from('mall_outlets')
    .select('mall_id');

  // Count outlets per mall
  const outletCounts = {};
  (outlets || []).forEach(o => {
    outletCounts[o.mall_id] = (outletCounts[o.mall_id] || 0) + 1;
  });

  // Find empty malls from the imported batches
  const targetMallNames = [
    'Greenridge Shopping Centre',
    'Yew Tee Square',
    'Sunshine Place',
    'Vista Point',
    'Toa Payoh HDB Hub',
    'Sun Plaza',
    'Thomson Plaza',
  ];

  const emptyMalls = malls.filter(m =>
    targetMallNames.some(name => m.name.toLowerCase() === name.toLowerCase()) &&
    (!outletCounts[m.id] || outletCounts[m.id] === 0)
  );

  console.log(`Found ${emptyMalls.length} empty malls to process:\n`);
  emptyMalls.forEach(m => console.log(`  - ${m.name}`));

  const results = { outlets: [] };

  // Process each empty mall
  for (let i = 0; i < emptyMalls.length; i++) {
    const mall = emptyMalls[i];
    console.log(`\n[${i + 1}/${emptyMalls.length}] ${mall.name}`);
    console.log(`  Address: ${mall.address}`);

    // Find outlets
    console.log('  Searching for food outlets...');
    const foundOutlets = await findOutletsInMall(mall.name, mall.address);
    console.log(`  Found ${foundOutlets.length} potential outlets`);

    // Fetch details for each outlet
    for (let j = 0; j < foundOutlets.length; j++) {
      const outlet = foundOutlets[j];
      console.log(`    [${j + 1}/${foundOutlets.length}] ${outlet.name}`);

      const details = await fetchOutletDetails(outlet.google_place_id);

      const outletRecord = {
        id: slugify(outlet.name) + '-' + mall.id,
        name: outlet.name,
        mall_id: mall.id,
        level: details?.level || null,
        category: outlet.category,
        thumbnail_url: details?.thumbnail_url || null,
        google_place_id: outlet.google_place_id,
        opening_hours: details?.opening_hours || null,
      };

      results.outlets.push(outletRecord);

      if (details?.level) {
        console.log(`      Unit: ${details.level}`);
      }

      await delay(100);
    }

    await delay(200);
  }

  // Summary
  console.log('\n\n========================================');
  console.log('SUMMARY');
  console.log('========================================');
  console.log(`Malls processed: ${emptyMalls.length}`);
  console.log(`Outlets found: ${results.outlets.length}`);
  console.log('');
  console.log('API COSTS (estimated):');
  console.log(`  Text Search: $${apiCosts.textSearch.toFixed(3)}`);
  console.log(`  Place Details: $${apiCosts.placeDetails.toFixed(3)}`);
  console.log(`  Total: $${(apiCosts.textSearch + apiCosts.placeDetails).toFixed(3)}`);

  // Preview
  console.log('\n========================================');
  console.log('OUTLETS FOUND');
  console.log('========================================');

  const byMall = {};
  results.outlets.forEach(o => {
    if (!byMall[o.mall_id]) byMall[o.mall_id] = [];
    byMall[o.mall_id].push(o);
  });

  for (const [mallId, mallOutlets] of Object.entries(byMall)) {
    const mall = emptyMalls.find(m => m.id === mallId);
    console.log(`\n${mall?.name || mallId} (${mallOutlets.length} outlets):`);
    mallOutlets.slice(0, 5).forEach(o => {
      console.log(`  - ${o.name} ${o.level || ''}`);
    });
    if (mallOutlets.length > 5) {
      console.log(`  ... and ${mallOutlets.length - 5} more`);
    }
  }

  // Save to database
  if (saveMode && results.outlets.length > 0) {
    console.log('\n========================================');
    console.log('SAVING TO DATABASE');
    console.log('========================================');

    let success = 0;
    let failed = 0;

    for (const outlet of results.outlets) {
      const { error } = await supabase
        .from('mall_outlets')
        .upsert(outlet, { onConflict: 'id' });

      if (error) {
        console.error(`  ✗ ${outlet.name}: ${error.message}`);
        failed++;
      } else {
        success++;
      }
    }

    console.log(`\nSaved: ${success}, Failed: ${failed}`);
  } else if (!saveMode) {
    console.log('\n========================================');
    console.log('DRY RUN - Run with --save to apply');
    console.log('========================================');
  }
}

main().catch(console.error);
