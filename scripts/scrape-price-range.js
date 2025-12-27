const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'sb_secret_J_vsb7RYUQ_0Dm2YTR_Fuw_O-ovCRlN'
);

const BATCH_SIZE = parseInt(process.argv[2]) || 50;
const START_OFFSET = parseInt(process.argv[3]) || 0;
const PARALLEL_WORKERS = parseInt(process.argv[4]) || 4;
const PROGRESS_FILE = 'scripts/price-scrape-progress.json';

async function getListingsWithoutPrices(offset, limit) {
  // Get all listing IDs that already have prices
  const { data: withPrices } = await supabase
    .from('listing_prices')
    .select('listing_id');

  const listingsWithPrices = new Set(withPrices?.map(p => p.listing_id) || []);

  // Get all listings
  const { data: allListings } = await supabase
    .from('food_listings')
    .select('id, name, address')
    .order('name');

  if (!allListings) return [];

  // Filter to only those without prices, then paginate
  const withoutPrices = allListings.filter(l => !listingsWithPrices.has(l.id));
  return withoutPrices.slice(offset, offset + limit);
}

async function getTotalMissingCount() {
  const { count: totalListings } = await supabase
    .from('food_listings')
    .select('*', { count: 'exact', head: true });

  const { data: withPrices } = await supabase
    .from('listing_prices')
    .select('listing_id');

  const uniqueWithPrices = new Set(withPrices?.map(p => p.listing_id) || []);
  return totalListings - uniqueWithPrices.size;
}

async function scrapePriceRange(page, name, address) {
  try {
    const searchQuery = address
      ? `${name} ${address}`
      : `${name} Singapore restaurant`;

    const encodedQuery = encodeURIComponent(searchQuery);
    await page.goto(`https://www.google.com/maps/search/${encodedQuery}`, {
      waitUntil: 'domcontentloaded',
      timeout: 20000
    });

    await page.waitForTimeout(1500);

    let priceMin = null;
    let priceMax = null;
    let menuItems = [];

    // Method 1: Click on the first result to get details
    try {
      const firstResult = await page.$('[role="feed"] > div:first-child a, [role="article"] a');
      if (firstResult) {
        await firstResult.click();
        await page.waitForTimeout(1500);
      }
    } catch (e) {}

    // Method 2: Look for menu/price section in the details panel
    try {
      // Click on "Menu" tab if available
      const menuTab = await page.$('button[aria-label*="Menu"], button:has-text("Menu")');
      if (menuTab) {
        await menuTab.click();
        await page.waitForTimeout(1000);
      }
    } catch (e) {}

    // Method 3: Look for price indicators in the page content
    try {
      const content = await page.content();

      // Look for "Price range" or price indicators
      // Pattern: $X - $Y or $X–$Y or SGD X - Y
      const priceRangePatterns = [
        /(?:price\s*(?:range)?|prices?)[\s:]*\$?\s*(\d+(?:\.\d{2})?)\s*[-–to]+\s*\$?\s*(\d+(?:\.\d{2})?)/i,
        /\$(\d+(?:\.\d{2})?)\s*[-–]\s*\$(\d+(?:\.\d{2})?)/g,
        /SGD\s*(\d+(?:\.\d{2})?)\s*[-–to]+\s*SGD?\s*(\d+(?:\.\d{2})?)/i,
        /S\$(\d+(?:\.\d{2})?)\s*[-–]\s*S?\$(\d+(?:\.\d{2})?)/g,
      ];

      for (const pattern of priceRangePatterns) {
        const match = content.match(pattern);
        if (match) {
          priceMin = parseFloat(match[1]);
          priceMax = parseFloat(match[2]);
          if (priceMin > 0 && priceMax > 0 && priceMax >= priceMin) {
            break;
          }
        }
      }

      // Look for individual menu item prices
      // Pattern: item name followed by price like "$12.90" or "S$15"
      const priceMatches = content.matchAll(/(?:S?\$|SGD\s*)(\d+(?:\.\d{2})?)/g);
      const prices = [];
      for (const match of priceMatches) {
        const price = parseFloat(match[1]);
        // Filter reasonable restaurant prices (between $1 and $500)
        if (price >= 1 && price <= 500) {
          prices.push(price);
        }
      }

      if (prices.length > 0) {
        // Remove outliers and calculate min/max
        prices.sort((a, b) => a - b);
        // Take 10th and 90th percentile to avoid extreme outliers
        const p10 = Math.floor(prices.length * 0.1);
        const p90 = Math.floor(prices.length * 0.9);
        const filteredPrices = prices.slice(p10, p90 + 1);

        if (filteredPrices.length > 0) {
          if (!priceMin) priceMin = Math.min(...filteredPrices);
          if (!priceMax) priceMax = Math.max(...filteredPrices);
        }
      }
    } catch (e) {}

    // Method 4: Look for structured menu data
    try {
      const menuElements = await page.$$('[data-price], [aria-label*="price"], .menu-item-price');
      for (const el of menuElements) {
        const text = await el.textContent();
        const priceMatch = text.match(/(?:S?\$|SGD\s*)(\d+(?:\.\d{2})?)/);
        if (priceMatch) {
          const price = parseFloat(priceMatch[1]);
          if (price >= 1 && price <= 500) {
            menuItems.push({ price });
          }
        }
      }

      if (menuItems.length > 0) {
        const itemPrices = menuItems.map(m => m.price);
        if (!priceMin) priceMin = Math.min(...itemPrices);
        if (!priceMax) priceMax = Math.max(...itemPrices);
      }
    } catch (e) {}

    // Validate and round prices
    if (priceMin !== null && priceMax !== null) {
      priceMin = Math.round(priceMin * 100) / 100;
      priceMax = Math.round(priceMax * 100) / 100;

      // Sanity check
      if (priceMin > priceMax) {
        [priceMin, priceMax] = [priceMax, priceMin];
      }
    }

    return { priceMin, priceMax, menuItems: menuItems.length };
  } catch (error) {
    return { priceMin: null, priceMax: null, error: error.message };
  }
}

async function savePriceData(listingId, priceMin, priceMax) {
  if (priceMin === null && priceMax === null) return false;

  // Create a single "Price Range" entry in listing_prices
  const avgPrice = priceMin && priceMax ? (priceMin + priceMax) / 2 : (priceMin || priceMax);

  const { error } = await supabase
    .from('listing_prices')
    .insert({
      listing_id: listingId,
      item_name: 'Average Price',
      price: avgPrice,
      description: priceMin && priceMax ? `Price range: $${priceMin} - $${priceMax}` : null,
      is_signature: true
    });

  if (error) {
    console.error(`  DB error:`, error.message);
    return false;
  }
  return true;
}

function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    }
  } catch (e) {}
  return { processed: 0, found: 0, updated: 0, failed: [], lastRun: null };
}

function saveProgress(progress) {
  progress.lastRun = new Date().toISOString();
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

async function processWorker(workerId, restaurants, totalMissing, startOffset, progress) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled']
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  });

  const page = await context.newPage();
  const results = [];
  let found = 0;
  let updated = 0;

  for (let i = 0; i < restaurants.length; i++) {
    const restaurant = restaurants[i];
    const globalIndex = startOffset + i + 1;

    console.log(`[W${workerId}][${globalIndex}/${totalMissing}] ${restaurant.name}`);

    const { priceMin, priceMax, menuItems, error } = await scrapePriceRange(
      page,
      restaurant.name,
      restaurant.address
    );

    const result = {
      id: restaurant.id,
      name: restaurant.name,
      priceMin,
      priceMax,
      menuItems,
      error
    };
    results.push(result);

    if (priceMin !== null || priceMax !== null) {
      found++;
      console.log(`  [W${workerId}] ✓ Found: $${priceMin || '?'} - $${priceMax || '?'}`);

      const success = await savePriceData(restaurant.id, priceMin, priceMax);
      if (success) {
        updated++;
      }
    } else {
      console.log(`  [W${workerId}] ✗ No price found`);
      progress.failed.push({ id: restaurant.id, name: restaurant.name });
    }

    // Fast rate limiting - 100ms between requests
    await page.waitForTimeout(100);
  }

  await browser.close();
  return { results, found, updated };
}

async function main() {
  console.log('='.repeat(60));
  console.log('SCRAPING PRICE RANGES FROM GOOGLE MAPS');
  console.log('='.repeat(60));

  const totalMissing = await getTotalMissingCount();
  console.log(`\nTotal listings missing prices: ${totalMissing}`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log(`Starting from offset: ${START_OFFSET}`);
  console.log(`Parallel workers: ${PARALLEL_WORKERS}\n`);

  const restaurants = await getListingsWithoutPrices(START_OFFSET, BATCH_SIZE);

  if (restaurants.length === 0) {
    console.log('No listings to process!');
    return;
  }

  console.log(`Processing ${restaurants.length} listings with ${PARALLEL_WORKERS} workers...\n`);

  const progress = loadProgress();

  // Split restaurants among workers
  const chunkSize = Math.ceil(restaurants.length / PARALLEL_WORKERS);
  const chunks = [];
  for (let i = 0; i < PARALLEL_WORKERS; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, restaurants.length);
    if (start < restaurants.length) {
      chunks.push(restaurants.slice(start, end));
    }
  }

  // Run workers in parallel
  const workerPromises = chunks.map((chunk, idx) =>
    processWorker(idx + 1, chunk, totalMissing, START_OFFSET + idx * chunkSize, progress)
  );

  const workerResults = await Promise.all(workerPromises);

  // Aggregate results
  let found = 0;
  let updated = 0;
  const results = [];

  for (const wr of workerResults) {
    found += wr.found;
    updated += wr.updated;
    results.push(...wr.results);
  }

  // Update progress
  progress.processed += restaurants.length;
  progress.found += found;
  progress.updated += updated;
  saveProgress(progress);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('BATCH SUMMARY');
  console.log('='.repeat(60));
  console.log(`Processed: ${restaurants.length}`);
  console.log(`Found prices: ${found}`);
  console.log(`Updated in DB: ${updated}`);
  console.log(`Failed: ${restaurants.length - found}`);

  console.log('\n' + '-'.repeat(60));
  console.log('OVERALL PROGRESS');
  console.log('-'.repeat(60));
  console.log(`Total processed: ${progress.processed}`);
  console.log(`Total found: ${progress.found}`);
  console.log(`Total updated: ${progress.updated}`);

  const nextOffset = START_OFFSET + BATCH_SIZE;
  const remaining = totalMissing - restaurants.length;

  if (remaining > 0) {
    console.log(`\nNext batch command:`);
    console.log(`  node scripts/scrape-price-range.js ${BATCH_SIZE} ${nextOffset} ${PARALLEL_WORKERS}`);
    console.log(`  Remaining: ${remaining} listings`);
  } else {
    console.log(`\n✓ All listings processed!`);
  }

  // Save detailed results
  fs.writeFileSync(
    `scripts/price-results-${START_OFFSET}-${START_OFFSET + restaurants.length}.json`,
    JSON.stringify(results, null, 2)
  );
  console.log(`\nResults saved to scripts/price-results-${START_OFFSET}-${START_OFFSET + restaurants.length}.json`);
}

main().catch(console.error);
