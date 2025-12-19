/**
 * Import Missing Neighbourhood Malls Script
 *
 * This script:
 * 1. Reads the CSV of missing neighbourhood malls
 * 2. Inserts malls into the database
 * 3. Uses Google Places API to find food outlets in each mall
 * 4. Fetches opening hours and unit numbers for each outlet
 *
 * Run with: node scripts/import-neighbourhood-malls.js [options]
 *
 * Options:
 *   --test       Test mode: only process first mall
 *   --save       Save data to database
 *   --mall NAME  Process only the specified mall name
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;

if (!supabaseUrl || !supabaseKey || !googleApiKey) {
  console.error('Missing environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helpers
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const slugify = (str) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// API Cost tracking
let apiCosts = {
  textSearch: 0,      // $0.032 per request
  placeDetails: 0,    // $0.017 per request (basic data is free)
};

function trackCost(type) {
  const costs = { textSearch: 0.032, placeDetails: 0.017 };
  apiCosts[type] = (apiCosts[type] || 0) + (costs[type] || 0);
}

function getTotalCost() {
  return Object.values(apiCosts).reduce((a, b) => a + b, 0);
}

// Parse CSV
function parseCSV(csvContent) {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());

  return lines.slice(1).map(line => {
    // Handle quoted fields
    const values = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = values[i] || '';
    });
    return obj;
  });
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
          // Filter: must be food-related
          const foodTypes = ['restaurant', 'cafe', 'bakery', 'food', 'meal_takeaway', 'meal_delivery', 'coffee_shop', 'fast_food_restaurant'];
          const isFood = place.types?.some(t => foodTypes.includes(t));

          if (!isFood) continue;

          // Check if address contains mall name or address
          const addressLower = (place.formattedAddress || '').toLowerCase();
          const mallNameLower = mallName.toLowerCase();
          const mallAddressLower = mallAddress.toLowerCase();

          // Extract key identifiers from mall address (e.g., "445 Fajar Road")
          const addressMatch = mallAddressLower.match(/(\d+)\s+(\w+)/);
          const streetNumber = addressMatch ? addressMatch[1] : '';
          const streetName = addressMatch ? addressMatch[2] : '';

          // Mall name words (excluding common words)
          const excludeWords = ['shopping', 'centre', 'center', 'mall', 'plaza', 'the', 'and'];
          const mallWords = mallNameLower.split(' ').filter(w => w.length > 2 && !excludeWords.includes(w));

          // Check if outlet is in this mall
          const hasStreetNumber = streetNumber && addressLower.includes(streetNumber);
          const hasStreetName = streetName && addressLower.includes(streetName);
          const hasMallName = mallWords.some(word => addressLower.includes(word));

          // Require street match OR strong mall name match
          const inMall = (hasStreetNumber && hasStreetName) || (hasMallName && (hasStreetNumber || hasStreetName));

          if (!inMall) continue;

          // Extra check: exclude if address contains other mall names
          const otherMalls = ['raffles city', 'ion orchard', 'vivocity', 'tampines mall', 'jurong point'];
          const isOtherMall = otherMalls.some(m => addressLower.includes(m) && !mallNameLower.includes(m.split(' ')[0]));
          if (isOtherMall) continue;

          outlets.push({
            name: place.displayName.text,
            google_place_id: place.id,
            category: place.types?.find(t => foodTypes.includes(t)) || 'restaurant',
            rating: place.rating || null,
          });
        }
      }

      pageToken = data.nextPageToken;
      pageCount++;

      if (pageToken) {
        await delay(200);
      }
    } while (pageToken && pageCount < 3);

    return outlets;
  } catch (error) {
    console.error(`  Error finding outlets in ${mallName}:`, error.message);
    return [];
  }
}

// Fetch details for an outlet (opening hours, floor/unit)
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

      // Get first photo URL if available
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

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const testMode = args.includes('--test');
  const saveMode = args.includes('--save');
  const mallNameArg = args.includes('--mall') ? args[args.indexOf('--mall') + 1] : null;

  console.log('========================================');
  console.log('Import Neighbourhood Malls Script');
  console.log('========================================');
  console.log(`Mode: ${testMode ? 'TEST' : 'FULL'} | Save: ${saveMode ? 'YES' : 'NO'}`);
  console.log('');

  // Read CSV file
  const csvPath = path.join(__dirname, '..', 'public', 'missing-neighbourhood-malls.csv');
  let csvContent;

  // Try different locations for the CSV
  const possiblePaths = [
    csvPath,
    path.join(__dirname, '..', 'missing-neighbourhood-malls.csv'),
    'C:\\Users\\JeremyNg\\Downloads\\missing-neighbourhood-malls.csv'
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      csvContent = fs.readFileSync(p, 'utf-8');
      console.log(`Found CSV at: ${p}`);
      break;
    }
  }

  if (!csvContent) {
    console.error('CSV file not found! Tried:', possiblePaths);
    process.exit(1);
  }

  const malls = parseCSV(csvContent);
  console.log(`Parsed ${malls.length} malls from CSV\n`);

  // Filter if specific mall requested
  let mallsToProcess = malls;
  if (mallNameArg) {
    mallsToProcess = malls.filter(m => m.mall_name.toLowerCase().includes(mallNameArg.toLowerCase()));
    console.log(`Filtering to malls matching: "${mallNameArg}"`);
  }
  if (testMode) {
    mallsToProcess = mallsToProcess.slice(0, 1);
  }

  // Check which malls already exist in DB
  const { data: existingMalls } = await supabase
    .from('malls')
    .select('id, name');

  const existingMallIds = new Set((existingMalls || []).map(m => m.id));
  const existingMallNames = new Set((existingMalls || []).map(m => m.name.toLowerCase()));

  // Filter out malls that already exist
  const newMalls = mallsToProcess.filter(m => {
    const mallId = slugify(m.mall_name);
    const exists = existingMallIds.has(mallId) || existingMallNames.has(m.mall_name.toLowerCase());
    if (exists) {
      console.log(`  Skipping existing mall: ${m.mall_name}`);
    }
    return !exists;
  });

  console.log(`\nFound ${mallsToProcess.length - newMalls.length} existing malls (skipped)`);
  console.log(`Processing ${newMalls.length} new mall(s)\n`);

  if (newMalls.length === 0) {
    console.log('No new malls to import!');
    return;
  }

  // Results
  const results = {
    malls: [],
    outlets: [],
  };

  // Process each mall
  for (let i = 0; i < newMalls.length; i++) {
    const mallData = newMalls[i];
    console.log(`\n[${i + 1}/${newMalls.length}] ${mallData.mall_name}`);
    console.log(`  Station: ${mallData.station_id}`);
    console.log(`  Address: ${mallData.address}`);

    const mallId = slugify(mallData.mall_name);

    const mall = {
      id: mallId,
      name: mallData.mall_name,
      station_id: mallData.station_id,
      address: mallData.address,
      thumbnail_url: null,
    };

    results.malls.push(mall);

    // Find outlets
    console.log('  Searching for food outlets...');
    const outlets = await findOutletsInMall(mallData.mall_name, mallData.address);
    console.log(`  Found ${outlets.length} potential outlets`);

    // Fetch details for each outlet
    for (let j = 0; j < outlets.length; j++) {
      const outlet = outlets[j];
      console.log(`    [${j + 1}/${outlets.length}] ${outlet.name}`);

      const details = await fetchOutletDetails(outlet.google_place_id);

      const outletRecord = {
        id: slugify(outlet.name) + '-' + mallId,
        name: outlet.name,
        mall_id: mallId,
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
  console.log(`Malls processed: ${results.malls.length}`);
  console.log(`Outlets found: ${results.outlets.length}`);
  console.log('');
  console.log('API COSTS (estimated):');
  console.log(`  Text Search: $${apiCosts.textSearch.toFixed(3)}`);
  console.log(`  Place Details: $${apiCosts.placeDetails.toFixed(3)}`);
  console.log(`  Total: $${getTotalCost().toFixed(3)}`);

  // Preview data
  console.log('\n========================================');
  console.log('DATA PREVIEW');
  console.log('========================================');

  console.log('\nMalls:');
  results.malls.forEach(m => {
    console.log(`  - ${m.name} @ ${m.station_id}`);
  });

  console.log(`\nOutlets (${results.outlets.length} total):`);
  results.outlets.slice(0, 10).forEach(o => {
    console.log(`  - ${o.name} (${o.mall_id}) ${o.level || ''}`);
  });
  if (results.outlets.length > 10) {
    console.log(`  ... and ${results.outlets.length - 10} more`);
  }

  // Save to database
  if (saveMode) {
    console.log('\n========================================');
    console.log('SAVING TO DATABASE');
    console.log('========================================');

    // Insert malls
    for (const mall of results.malls) {
      const { error } = await supabase
        .from('malls')
        .upsert(mall, { onConflict: 'id' });

      if (error) {
        console.error(`  ✗ Mall ${mall.name}: ${error.message}`);
      } else {
        console.log(`  ✓ Mall: ${mall.name}`);
      }
    }

    // Insert outlets
    let outletSuccess = 0;
    let outletError = 0;

    for (const outlet of results.outlets) {
      const { error } = await supabase
        .from('mall_outlets')
        .upsert(outlet, { onConflict: 'id' });

      if (error) {
        console.error(`  ✗ Outlet ${outlet.name}: ${error.message}`);
        outletError++;
      } else {
        outletSuccess++;
      }
    }

    console.log(`\n  Outlets: ${outletSuccess} saved, ${outletError} errors`);
    console.log('\nDone!');
  } else {
    console.log('\n========================================');
    console.log('To save this data, run with --save flag');
    console.log('========================================');
  }
}

main().catch(console.error);
