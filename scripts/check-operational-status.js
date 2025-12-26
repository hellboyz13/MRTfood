const { createClient } = require('@supabase/supabase-js');
const { chromium } = require('playwright');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Configuration
const CONFIG = {
  batchSize: 50,           // How many listings to process per run
  startOffset: 0,          // Skip first N listings (for resuming)
  delayBetweenRequests: 300, // ms between API calls
  usePlaywright: true,     // Whether to use Playwright for verification
  dryRun: false,           // If true, don't update database
};

// Parse command line args
const args = process.argv.slice(2);
args.forEach(arg => {
  if (arg.startsWith('--offset=')) CONFIG.startOffset = parseInt(arg.split('=')[1]);
  if (arg.startsWith('--batch=')) CONFIG.batchSize = parseInt(arg.split('=')[1]);
  if (arg === '--dry-run') CONFIG.dryRun = true;
  if (arg === '--no-playwright') CONFIG.usePlaywright = false;
});

/**
 * Search Google Places API for business status
 */
async function checkGooglePlacesStatus(name, stationName) {
  const areaName = stationName ? stationName.replace(/-/g, ' ') : '';
  const query = `${name} ${areaName} Singapore`;

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'places.displayName,places.businessStatus,places.formattedAddress,places.googleMapsUri'
      },
      body: JSON.stringify({ textQuery: query, maxResultCount: 1 })
    });

    const data = await response.json();
    const place = data.places?.[0];

    if (!place) {
      return { found: false, status: 'NOT_FOUND', query };
    }

    return {
      found: true,
      status: place.businessStatus || 'UNKNOWN',
      name: place.displayName?.text,
      address: place.formattedAddress,
      mapsUri: place.googleMapsUri
    };
  } catch (error) {
    console.error(`  API Error: ${error.message}`);
    return { found: false, status: 'API_ERROR', error: error.message };
  }
}

/**
 * Use Playwright to search Google and check if restaurant is marked as closed
 */
async function checkWithPlaywright(browser, name, stationName) {
  const page = await browser.newPage();
  const areaName = stationName ? stationName.replace(/-/g, ' ') : '';
  const searchQuery = `${name} ${areaName} Singapore restaurant`;

  try {
    // Search on Google
    await page.goto(`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });

    await page.waitForTimeout(2000);

    // Get the page content
    const content = await page.content();
    const lowerContent = content.toLowerCase();

    // Check for closure indicators
    const closureIndicators = {
      permanentlyClosed: [
        'permanently closed',
        'permanently-closed',
        'this place has closed',
        'this business has closed'
      ],
      temporarilyClosed: [
        'temporarily closed',
        'temporarily-closed',
        'closed temporarily'
      ]
    };

    let status = 'OPERATIONAL';
    let evidence = null;

    for (const phrase of closureIndicators.permanentlyClosed) {
      if (lowerContent.includes(phrase)) {
        status = 'CLOSED_PERMANENTLY';
        evidence = phrase;
        break;
      }
    }

    if (status === 'OPERATIONAL') {
      for (const phrase of closureIndicators.temporarilyClosed) {
        if (lowerContent.includes(phrase)) {
          status = 'CLOSED_TEMPORARILY';
          evidence = phrase;
          break;
        }
      }
    }

    await page.close();
    return { status, evidence, searchQuery };

  } catch (error) {
    await page.close();
    return { status: 'SCRAPE_ERROR', error: error.message };
  }
}

/**
 * Main function
 */
async function main() {
  console.log('=== CHECKING RESTAURANT OPERATIONAL STATUS ===\n');
  console.log(`Config: batch=${CONFIG.batchSize}, offset=${CONFIG.startOffset}, dryRun=${CONFIG.dryRun}\n`);

  // Fetch all active food listings with station info
  const { data: listings, error } = await supabase
    .from('food_listings')
    .select('id, name, station_id, address, is_active')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .range(CONFIG.startOffset, CONFIG.startOffset + CONFIG.batchSize - 1);

  if (error) {
    console.error('Failed to fetch listings:', error.message);
    return;
  }

  console.log(`Fetched ${listings.length} listings (offset: ${CONFIG.startOffset})\n`);

  // Get station names for context
  const { data: stations } = await supabase.from('stations').select('id, name');
  const stationMap = Object.fromEntries(stations.map(s => [s.id, s.name]));

  // Initialize Playwright if needed
  let browser = null;
  if (CONFIG.usePlaywright) {
    console.log('Launching Playwright browser...\n');
    browser = await chromium.launch({ headless: true });
  }

  // Results tracking
  const results = {
    operational: [],
    closedTemporarily: [],
    closedPermanently: [],
    notFound: [],
    errors: []
  };

  // Process each listing
  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    const stationName = stationMap[listing.station_id] || '';

    console.log(`[${i + 1}/${listings.length}] ${listing.name}`);
    console.log(`  Station: ${stationName || 'N/A'}`);

    // Step 1: Check Google Places API
    const googleResult = await checkGooglePlacesStatus(listing.name, listing.station_id);
    console.log(`  Google Places: ${googleResult.status}`);

    let finalStatus = googleResult.status;
    let statusSource = 'google_places';

    // Step 2: If not conclusive and Playwright enabled, do web search
    if (CONFIG.usePlaywright && browser) {
      if (googleResult.status === 'NOT_FOUND' || googleResult.status === 'UNKNOWN') {
        console.log('  Verifying with web search...');
        const webResult = await checkWithPlaywright(browser, listing.name, listing.station_id);
        console.log(`  Web search: ${webResult.status}${webResult.evidence ? ` (found: "${webResult.evidence}")` : ''}`);

        if (webResult.status !== 'OPERATIONAL' && webResult.status !== 'SCRAPE_ERROR') {
          finalStatus = webResult.status;
          statusSource = 'web_search';
        }
      }
    }

    // Categorize result
    const resultEntry = {
      id: listing.id,
      name: listing.name,
      station: stationName,
      googleResult: googleResult,
      finalStatus,
      statusSource
    };

    switch (finalStatus) {
      case 'OPERATIONAL':
        results.operational.push(resultEntry);
        console.log('  -> OPERATIONAL');
        break;
      case 'CLOSED_TEMPORARILY':
        results.closedTemporarily.push(resultEntry);
        console.log('  -> FLAGGED: Temporarily Closed');
        break;
      case 'CLOSED_PERMANENTLY':
        results.closedPermanently.push(resultEntry);
        console.log('  -> FLAGGED: Permanently Closed');
        break;
      case 'NOT_FOUND':
        results.notFound.push(resultEntry);
        console.log('  -> NOT FOUND (needs manual review)');
        break;
      default:
        results.errors.push(resultEntry);
        console.log(`  -> ERROR: ${finalStatus}`);
    }

    console.log('');
    await delay(CONFIG.delayBetweenRequests);
  }

  // Close browser
  if (browser) {
    await browser.close();
    console.log('Browser closed.\n');
  }

  // Summary
  console.log('=== SUMMARY ===');
  console.log(`Operational: ${results.operational.length}`);
  console.log(`Temporarily Closed: ${results.closedTemporarily.length}`);
  console.log(`Permanently Closed: ${results.closedPermanently.length}`);
  console.log(`Not Found: ${results.notFound.length}`);
  console.log(`Errors: ${results.errors.length}`);

  // Save full results to JSON
  const outputPath = 'operational-status-results.json';
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nFull results saved to ${outputPath}`);

  // Update database for closed listings
  if (!CONFIG.dryRun) {
    console.log('\n=== UPDATING DATABASE ===');

    // Flag temporarily closed
    for (const item of results.closedTemporarily) {
      const { error } = await supabase
        .from('food_listings')
        .update({
          is_active: false,
          description: `[TEMPORARILY CLOSED] ${item.googleResult.address || ''}`
        })
        .eq('id', item.id);

      if (error) {
        console.log(`  Error updating ${item.name}: ${error.message}`);
      } else {
        console.log(`  Flagged (temp): ${item.name}`);
      }
    }

    // Flag permanently closed
    for (const item of results.closedPermanently) {
      const { error } = await supabase
        .from('food_listings')
        .update({
          is_active: false,
          description: `[PERMANENTLY CLOSED] ${item.googleResult.address || ''}`
        })
        .eq('id', item.id);

      if (error) {
        console.log(`  Error updating ${item.name}: ${error.message}`);
      } else {
        console.log(`  Flagged (perm): ${item.name}`);
      }
    }

    console.log('\nDatabase updates complete.');
  } else {
    console.log('\n[DRY RUN] No database changes made.');
  }

  // Print flagged listings for review
  if (results.closedTemporarily.length > 0) {
    console.log('\n=== TEMPORARILY CLOSED ===');
    results.closedTemporarily.forEach(item => {
      console.log(`- ${item.name} (${item.station})`);
    });
  }

  if (results.closedPermanently.length > 0) {
    console.log('\n=== PERMANENTLY CLOSED ===');
    results.closedPermanently.forEach(item => {
      console.log(`- ${item.name} (${item.station})`);
    });
  }

  if (results.notFound.length > 0) {
    console.log('\n=== NOT FOUND (Manual Review Needed) ===');
    results.notFound.forEach(item => {
      console.log(`- ${item.name} (${item.station})`);
    });
  }

  console.log('\nDone!');
}

main().catch(console.error);