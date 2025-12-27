const { createClient } = require('@supabase/supabase-js');
const { chromium } = require('playwright');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Configuration
const CONFIG = {
  batchSize: 50,           // How many listings to process per run
  startOffset: 0,          // Skip first N listings (for resuming)
  dryRun: false,           // If true, don't update database
};

// Progressive delay - starts at 500ms, decreases to 100ms as success count increases
let consecutiveSuccess = 0;
function getDelay() {
  if (consecutiveSuccess < 10) return 500;
  if (consecutiveSuccess < 30) return 300;
  if (consecutiveSuccess < 50) return 200;
  return 100; // Max speed after 50 consecutive successes
}

// Parse command line args
const args = process.argv.slice(2);
args.forEach(arg => {
  if (arg.startsWith('--offset=')) CONFIG.startOffset = parseInt(arg.split('=')[1]);
  if (arg.startsWith('--batch=')) CONFIG.batchSize = parseInt(arg.split('=')[1]);
  if (arg === '--dry-run') CONFIG.dryRun = true;
});

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
  console.log('=== CHECKING RESTAURANT OPERATIONAL STATUS (Playwright) ===\n');
  console.log(`Config: batch=${CONFIG.batchSize}, offset=${CONFIG.startOffset}, dryRun=${CONFIG.dryRun}\n`);

  // Fetch active food listings WITHOUT opening hours (skip verified ones)
  const { data: listings, error } = await supabase
    .from('food_listings')
    .select('id, name, station_id, address, is_active')
    .eq('is_active', true)
    .is('opening_hours', null)
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

  // Initialize Playwright
  console.log('Launching Playwright browser...\n');
  const browser = await chromium.launch({ headless: true });

  // Results tracking
  const results = {
    operational: [],
    closedTemporarily: [],
    closedPermanently: [],
    errors: []
  };

  // Process each listing
  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    const stationName = stationMap[listing.station_id] || '';

    console.log(`[${i + 1}/${listings.length}] ${listing.name}`);
    console.log(`  Station: ${stationName || 'N/A'}`);

    // Check with Playwright web search
    const webResult = await checkWithPlaywright(browser, listing.name, stationName);
    console.log(`  Status: ${webResult.status}${webResult.evidence ? ` (found: "${webResult.evidence}")` : ''}`);

    // Categorize result
    const resultEntry = {
      id: listing.id,
      name: listing.name,
      station: stationName,
      status: webResult.status,
      evidence: webResult.evidence,
      searchQuery: webResult.searchQuery
    };

    switch (webResult.status) {
      case 'OPERATIONAL':
        results.operational.push(resultEntry);
        consecutiveSuccess++;
        console.log('  -> OPERATIONAL');
        break;
      case 'CLOSED_TEMPORARILY':
        results.closedTemporarily.push(resultEntry);
        consecutiveSuccess++;
        console.log('  -> FLAGGED: Temporarily Closed');
        break;
      case 'CLOSED_PERMANENTLY':
        results.closedPermanently.push(resultEntry);
        consecutiveSuccess++;
        console.log('  -> FLAGGED: Permanently Closed');
        break;
      default:
        results.errors.push(resultEntry);
        consecutiveSuccess = 0; // Reset on error
        console.log(`  -> ERROR: ${webResult.status}`);
    }

    const currentDelay = getDelay();
    console.log(`  [delay: ${currentDelay}ms, streak: ${consecutiveSuccess}]`);
    await delay(currentDelay);
  }

  // Close browser
  await browser.close();
  console.log('Browser closed.\n');

  // Summary
  console.log('=== SUMMARY ===');
  console.log(`Operational: ${results.operational.length}`);
  console.log(`Temporarily Closed: ${results.closedTemporarily.length}`);
  console.log(`Permanently Closed: ${results.closedPermanently.length}`);
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
          description: `[TEMPORARILY CLOSED]`
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
          description: `[PERMANENTLY CLOSED]`
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

  if (results.errors.length > 0) {
    console.log('\n=== ERRORS ===');
    results.errors.forEach(item => {
      console.log(`- ${item.name} (${item.station}): ${item.status}`);
    });
  }

  console.log('\nDone!');
}

main().catch(console.error);