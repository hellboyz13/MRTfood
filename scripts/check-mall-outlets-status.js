const { createClient } = require('@supabase/supabase-js');
const { chromium } = require('playwright');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Configuration
const CONFIG = {
  batchSize: 50,
  startOffset: 0,
  dryRun: false,
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
let reverseOrder = false;
args.forEach(arg => {
  if (arg.startsWith('--offset=')) CONFIG.startOffset = parseInt(arg.split('=')[1]);
  if (arg.startsWith('--batch=')) CONFIG.batchSize = parseInt(arg.split('=')[1]);
  if (arg === '--dry-run') CONFIG.dryRun = true;
  if (arg === '--reverse') reverseOrder = true;
});

/**
 * Use Playwright to search Google and check if outlet is marked as closed
 */
async function checkWithPlaywright(browser, outletName, mallName) {
  const page = await browser.newPage();
  const searchQuery = `${outletName} ${mallName} Singapore`;

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

async function main() {
  console.log('=== CHECKING MALL OUTLET OPERATIONAL STATUS (Playwright) ===\n');
  console.log('Config: batch=' + CONFIG.batchSize + ', offset=' + CONFIG.startOffset + ', dryRun=' + CONFIG.dryRun + '\n');

  // Fetch mall outlets WITHOUT opening hours (skip verified ones)
  const { data: outlets, error } = await supabase
    .from('mall_outlets')
    .select('id, name, mall_id, malls(name)')
    .is('opening_hours', null)
    .order('created_at', { ascending: !reverseOrder })
    .range(CONFIG.startOffset, CONFIG.startOffset + CONFIG.batchSize - 1);

  console.log('Direction: ' + (reverseOrder ? 'BOTTOM-UP (reverse)' : 'TOP-DOWN'));

  if (error) {
    console.error('Failed to fetch outlets:', error.message);
    return;
  }

  console.log('Fetched ' + outlets.length + ' outlets (offset: ' + CONFIG.startOffset + ')\n');

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

  // Process each outlet
  for (let i = 0; i < outlets.length; i++) {
    const outlet = outlets[i];
    const mallName = outlet.malls?.name || outlet.mall_id;

    console.log('[' + (i + 1) + '/' + outlets.length + '] ' + outlet.name);
    console.log('  Mall: ' + mallName);

    const webResult = await checkWithPlaywright(browser, outlet.name, mallName);
    console.log('  Status: ' + webResult.status + (webResult.evidence ? ' (found: "' + webResult.evidence + '")' : ''));

    const resultEntry = {
      id: outlet.id,
      name: outlet.name,
      mall: mallName,
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
        console.log('  -> ERROR: ' + webResult.status);
    }

    const currentDelay = getDelay();
    console.log('  [delay: ' + currentDelay + 'ms, streak: ' + consecutiveSuccess + ']');
    await delay(currentDelay);
  }

  // Close browser
  await browser.close();
  console.log('Browser closed.\n');

  // Summary
  console.log('=== SUMMARY ===');
  console.log('Operational: ' + results.operational.length);
  console.log('Temporarily Closed: ' + results.closedTemporarily.length);
  console.log('Permanently Closed: ' + results.closedPermanently.length);
  console.log('Errors: ' + results.errors.length);

  // Save results to JSON file for review (append mode)
  const outputFile = 'mall-outlets-closed.json';

  let existingResults = { closedTemporarily: [], closedPermanently: [], errors: [] };
  try {
    if (fs.existsSync(outputFile)) {
      const parsed = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
      existingResults.closedTemporarily = parsed.closedTemporarily || [];
      existingResults.closedPermanently = parsed.closedPermanently || [];
      existingResults.errors = parsed.errors || [];
    }
  } catch (e) {}

  // Append new results
  existingResults.closedTemporarily.push(...results.closedTemporarily);
  existingResults.closedPermanently.push(...results.closedPermanently);
  existingResults.errors.push(...results.errors);

  fs.writeFileSync(outputFile, JSON.stringify(existingResults, null, 2));
  console.log('\nResults saved to ' + outputFile);
  console.log('Total flagged so far: ' +
    (existingResults.closedTemporarily.length + existingResults.closedPermanently.length) +
    ' closed, ' + existingResults.errors.length + ' errors');

  // Print flagged outlets
  if (results.closedTemporarily.length > 0) {
    console.log('\n=== TEMPORARILY CLOSED ===');
    results.closedTemporarily.forEach(item => {
      console.log('- ' + item.name + ' (' + item.mall + ')');
    });
  }

  if (results.closedPermanently.length > 0) {
    console.log('\n=== PERMANENTLY CLOSED ===');
    results.closedPermanently.forEach(item => {
      console.log('- ' + item.name + ' (' + item.mall + ')');
    });
  }

  if (results.errors.length > 0) {
    console.log('\n=== ERRORS ===');
    results.errors.forEach(item => {
      console.log('- ' + item.name + ' (' + item.mall + '): ' + item.status);
    });
  }

  console.log('\nDone!');
}

main().catch(console.error);
