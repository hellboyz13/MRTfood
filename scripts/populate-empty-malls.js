/**
 * Populate Empty Malls Script
 * Finds food outlets for malls that have 0 outlets
 *
 * Run with: node scripts/populate-empty-malls.js [options]
 *
 * Options:
 *   --test       Test mode: only process 1 mall
 *   --save       Save data to database
 *   --mall NAME  Process only the specified mall name
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;

if (!supabaseUrl || !supabaseKey || !googleApiKey) {
  console.error('Missing environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const slugify = (str) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Cache for chain thumbnails
let chainThumbnails = {};

let apiCosts = { textSearch: 0, placeDetails: 0 };

function trackCost(type) {
  const costs = { textSearch: 0.032, placeDetails: 0.017 };
  apiCosts[type] = (apiCosts[type] || 0) + (costs[type] || 0);
}

// Find food outlets in a mall using Text Search
async function findOutletsInMall(mallName, mallAddress) {
  const outlets = [];
  let pageToken = null;
  let pageCount = 0;

  try {
    do {
      const requestBody = {
        textQuery: `food restaurant cafe ${mallName} Singapore`,
        maxResultCount: 20,
      };

      if (pageToken) {
        requestBody.pageToken = pageToken;
      }

      const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': googleApiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.types,places.rating,places.userRatingCount,nextPageToken'
        },
        body: JSON.stringify(requestBody)
      });

      trackCost('textSearch');
      const data = await response.json();

      if (data.places) {
        for (const place of data.places) {
          const foodTypes = ['restaurant', 'cafe', 'bakery', 'food', 'meal_takeaway', 'meal_delivery', 'coffee_shop', 'fast_food_restaurant'];
          const isFood = place.types?.some(t => foodTypes.includes(t));
          if (!isFood) continue;

          const addressLower = (place.formattedAddress || '').toLowerCase();
          const mallNameLower = mallName.toLowerCase();

          // Extract key words from mall name
          const excludeWords = ['shopping', 'centre', 'center', 'mall', 'plaza', 'the', 'and', '@'];
          const mallWords = mallNameLower.split(/[\s@]+/).filter(w => w.length > 2 && !excludeWords.includes(w));

          // Check if outlet is in this mall
          const hasMallName = mallWords.some(word => addressLower.includes(word));
          if (!hasMallName) continue;

          outlets.push({
            name: place.displayName.text,
            google_place_id: place.id,
            category: place.types?.find(t => foodTypes.includes(t)) || 'restaurant',
          });
        }
      }

      pageToken = data.nextPageToken;
      pageCount++;

      if (pageToken) await delay(200);
    } while (pageToken && pageCount < 3);

    return outlets;
  } catch (error) {
    console.error(`  Error finding outlets in ${mallName}:`, error.message);
    return [];
  }
}

// Fetch details for an outlet (opening hours, floor/unit - NO photos)
async function fetchOutletDetails(placeId) {
  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googleApiKey,
        'X-Goog-FieldMask': 'currentOpeningHours,regularOpeningHours,addressComponents'
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

      // Extract floor/unit
      let level = null;
      if (data.addressComponents) {
        const subpremise = data.addressComponents.find(c => c.types?.includes('subpremise'));
        const floor = data.addressComponents.find(c => c.types?.includes('floor'));
        if (subpremise) {
          const unit = subpremise.longText || subpremise.shortText;
          if (unit && unit.startsWith('#')) level = unit;
          else if (unit) level = unit;
        } else if (floor) {
          level = `Level ${floor.longText || floor.shortText}`;
        }
      }

      return { opening_hours: formattedHours, level };
    }
    return null;
  } catch (error) {
    console.error(`  Error fetching details for ${placeId}:`, error.message);
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const testMode = args.includes('--test');
  const saveMode = args.includes('--save');
  const mallNameArg = args.includes('--mall') ? args[args.indexOf('--mall') + 1] : null;

  console.log('========================================');
  console.log('Populate Empty Malls Script');
  console.log('========================================');
  console.log(`Mode: ${testMode ? 'TEST' : 'FULL'} | Save: ${saveMode ? 'YES' : 'NO'}`);
  console.log('');

  // Get all malls
  const { data: allMalls } = await supabase.from('malls').select('id, name, address');

  // Get outlet counts per mall
  const { data: outlets } = await supabase.from('mall_outlets').select('mall_id');
  const outletCounts = {};
  outlets?.forEach(o => { outletCounts[o.mall_id] = (outletCounts[o.mall_id] || 0) + 1; });

  // Filter to empty malls
  let emptyMalls = allMalls?.filter(m => !outletCounts[m.id]) || [];

  console.log(`Found ${emptyMalls.length} malls with 0 outlets\n`);

  if (mallNameArg) {
    emptyMalls = emptyMalls.filter(m => m.name.toLowerCase().includes(mallNameArg.toLowerCase()));
    console.log(`Filtering to malls matching: "${mallNameArg}"`);
  }
  if (testMode) {
    emptyMalls = emptyMalls.slice(0, 1);
  }

  console.log(`Processing ${emptyMalls.length} mall(s)\n`);

  // Load existing outlet thumbnails to reuse for same chains
  console.log('Loading existing chain thumbnails...');
  const { data: existingOutlets } = await supabase
    .from('mall_outlets')
    .select('name, thumbnail_url')
    .not('thumbnail_url', 'is', null);

  existingOutlets?.forEach(o => {
    // Normalize name for matching (remove mall-specific suffixes)
    const baseName = o.name.replace(/\s*[\(@].*$/, '').trim().toLowerCase();
    if (!chainThumbnails[baseName]) {
      chainThumbnails[baseName] = o.thumbnail_url;
    }
  });
  console.log(`Loaded ${Object.keys(chainThumbnails).length} chain thumbnails\n`);

  const results = { outlets: [] };

  for (let i = 0; i < emptyMalls.length; i++) {
    const mall = emptyMalls[i];
    console.log(`\n[${i + 1}/${emptyMalls.length}] ${mall.name}`);

    // Find outlets
    console.log('  Searching for food outlets...');
    const foundOutlets = await findOutletsInMall(mall.name, mall.address);
    console.log(`  Found ${foundOutlets.length} potential outlets`);

    // Fetch details for each outlet
    for (let j = 0; j < foundOutlets.length; j++) {
      const outlet = foundOutlets[j];
      console.log(`    [${j + 1}/${foundOutlets.length}] ${outlet.name}`);

      const details = await fetchOutletDetails(outlet.google_place_id);

      // Try to find thumbnail from existing chain
      const baseName = outlet.name.replace(/\s*[\(@].*$/, '').trim().toLowerCase();
      const thumbnailUrl = chainThumbnails[baseName] || null;

      const outletRecord = {
        id: slugify(outlet.name) + '-' + mall.id,
        name: outlet.name,
        mall_id: mall.id,
        level: details?.level || null,
        category: outlet.category,
        thumbnail_url: thumbnailUrl,
        google_place_id: outlet.google_place_id,
        opening_hours: details?.opening_hours || null,
      };

      results.outlets.push(outletRecord);

      if (details?.level) console.log(`      Unit: ${details.level}`);
      if (thumbnailUrl) console.log(`      Thumbnail: reused from chain`);
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

  // Save
  if (saveMode) {
    console.log('\n========================================');
    console.log('SAVING TO DATABASE');
    console.log('========================================');

    let success = 0, errors = 0;
    for (const outlet of results.outlets) {
      const { error } = await supabase
        .from('mall_outlets')
        .upsert(outlet, { onConflict: 'id' });

      if (error) {
        console.error(`  ✗ ${outlet.name}: ${error.message}`);
        errors++;
      } else {
        success++;
      }
    }

    console.log(`\n  Saved: ${success}, Errors: ${errors}`);
    console.log('\nDone!');
  } else {
    console.log('\n========================================');
    console.log('To save, run with --save flag');
    console.log('========================================');
  }
}

main().catch(console.error);
