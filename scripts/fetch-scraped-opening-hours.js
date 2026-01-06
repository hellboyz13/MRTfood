/**
 * Fetch opening hours for scraped mall stores using Google Places API (New)
 * Uses searchText endpoint which returns opening hours in one call
 *
 * Usage: node scripts/fetch-scraped-opening-hours.js [mall]
 * Examples:
 *   node scripts/fetch-scraped-opening-hours.js          # All malls
 *   node scripts/fetch-scraped-opening-hours.js jem      # JEM only
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Mall JSON files and their search context
const MALL_FILES = {
  paragon: {
    file: 'paragon-fb-stores.json',
    searchContext: 'Paragon Orchard Road'
  },
  'pasir-ris-mall': {
    file: 'pasir-ris-mall-fb-stores.json',
    searchContext: 'Pasir Ris Mall'
  },
  whitesands: {
    file: 'whitesands-fb-stores.json',
    searchContext: 'White Sands Pasir Ris'
  },
  jem: {
    file: 'jem-fb-stores.json',
    searchContext: 'JEM Jurong East'
  }
};

// Search for a place and get opening hours in one API call
async function fetchOpeningHours(storeName, mallContext) {
  const query = `${storeName} ${mallContext} Singapore`;

  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.regularOpeningHours,places.formattedAddress'
    },
    body: JSON.stringify({
      textQuery: query,
      maxResultCount: 1
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.places?.[0] || null;
}

// Format opening hours for storage
function formatOpeningHours(place) {
  if (!place?.regularOpeningHours) return null;

  const hours = place.regularOpeningHours;
  return {
    weekdayDescriptions: hours.weekdayDescriptions || [],
    periods: hours.periods || [],
    openNow: hours.openNow
  };
}

async function processMall(mallKey) {
  const mallConfig = MALL_FILES[mallKey];
  if (!mallConfig) {
    console.error(`Unknown mall: ${mallKey}`);
    return null;
  }

  const filePath = mallConfig.file;
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return null;
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Processing: ${mallKey.toUpperCase()}`);
  console.log(`${'='.repeat(50)}\n`);

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const stores = data.stores;

  const results = { updated: 0, notFound: 0, alreadyHas: 0, failed: 0, apiCalls: 0 };

  for (let i = 0; i < stores.length; i++) {
    const store = stores[i];

    // Skip if already has opening hours
    if (store.openingHours && store.openingHours.weekdayDescriptions?.length > 0) {
      results.alreadyHas++;
      continue;
    }

    console.log(`[${i + 1}/${stores.length}] ${store.name}`);

    try {
      const place = await fetchOpeningHours(store.name, mallConfig.searchContext);
      results.apiCalls++;

      if (!place) {
        console.log('  -> Not found on Google');
        results.notFound++;
        await delay(100);
        continue;
      }

      const hours = formatOpeningHours(place);

      if (hours && hours.weekdayDescriptions?.length > 0) {
        store.openingHours = hours;
        store.googlePlaceId = place.id;
        console.log(`  -> ${hours.weekdayDescriptions[0]?.substring(0, 40)}...`);
        results.updated++;
      } else {
        console.log('  -> No hours available');
        results.notFound++;
      }

      // Rate limiting - 100ms between calls
      await delay(100);

    } catch (err) {
      console.log(`  -> Error: ${err.message}`);
      results.failed++;
      await delay(200);
    }
  }

  // Save updated data
  data.stores = stores;
  data.openingHoursFetchedAt = new Date().toISOString();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`\nSaved to ${filePath}`);

  return results;
}

async function main() {
  const args = process.argv.slice(2);
  const specificMall = args[0]?.toLowerCase();

  if (!GOOGLE_API_KEY) {
    console.error('Error: GOOGLE_PLACES_API_KEY not found in .env.local');
    process.exit(1);
  }

  console.log('=== FETCHING OPENING HOURS FROM GOOGLE PLACES API ===\n');

  const mallsToProcess = specificMall
    ? [specificMall]
    : Object.keys(MALL_FILES);

  const totalResults = { updated: 0, notFound: 0, alreadyHas: 0, failed: 0, apiCalls: 0 };

  for (const mallKey of mallsToProcess) {
    const results = await processMall(mallKey);
    if (results) {
      totalResults.updated += results.updated;
      totalResults.notFound += results.notFound;
      totalResults.alreadyHas += results.alreadyHas;
      totalResults.failed += results.failed;
      totalResults.apiCalls += results.apiCalls;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('FINAL SUMMARY');
  console.log('='.repeat(50));
  console.log(`Updated:       ${totalResults.updated}`);
  console.log(`Not found:     ${totalResults.notFound}`);
  console.log(`Already had:   ${totalResults.alreadyHas}`);
  console.log(`Failed:        ${totalResults.failed}`);
  console.log(`API calls:     ${totalResults.apiCalls}`);
  console.log(`Est. cost:     ~$${(totalResults.apiCalls * 0.017).toFixed(2)}`);
}

main().catch(console.error);
