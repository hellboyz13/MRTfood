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

async function getListingsWithoutPrices(offset, limit) {
  const { data: withPrices } = await supabase
    .from('listing_prices')
    .select('listing_id');

  const listingsWithPrices = new Set(withPrices?.map(p => p.listing_id) || []);

  const { data: allListings } = await supabase
    .from('food_listings')
    .select('id, name, address')
    .order('name');

  if (!allListings) return [];

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

async function scrapePriceFromHungryGoWhere(page, name) {
  try {
    const searchQuery = encodeURIComponent(name);
    await page.goto(`https://www.hungrygowhere.com/search/food/${searchQuery}/`, {
      waitUntil: 'domcontentloaded',
      timeout: 20000
    });

    await page.waitForTimeout(2000);

    let priceMin = null;
    let priceMax = null;
    let source = null;

    const content = await page.content();

    // Look for price ranges in HungryGoWhere format
    // They often show "$10 - $30 per pax" or similar
    const pricePatterns = [
      /\$([\d.]+)\s*[-–]\s*\$([\d.]+)/g,
      /average[:\s]*\$([\d.]+)/gi,
      /budget[:\s]*\$([\d.]+)/gi,
    ];

    for (const pattern of pricePatterns) {
      const matches = [...content.matchAll(pattern)];
      for (const match of matches) {
        if (match[2]) {
          const min = parseFloat(match[1]);
          const max = parseFloat(match[2]);
          if (min >= 1 && min <= 500 && max >= 1 && max <= 500 && max >= min) {
            priceMin = min;
            priceMax = max;
            source = 'hungrygowhere-range';
            break;
          }
        } else if (match[1]) {
          const price = parseFloat(match[1]);
          if (price >= 1 && price <= 500) {
            if (!priceMin) priceMin = price;
            if (!priceMax) priceMax = price;
            source = 'hungrygowhere-single';
          }
        }
      }
      if (priceMin && priceMax) break;
    }

    return { priceMin, priceMax, source };
  } catch (error) {
    return { priceMin: null, priceMax: null, error: error.message };
  }
}

async function scrapePriceFromBurpple(page, name) {
  try {
    const searchQuery = encodeURIComponent(name);
    await page.goto(`https://www.burpple.com/search?q=${searchQuery}`, {
      waitUntil: 'domcontentloaded',
      timeout: 20000
    });

    await page.waitForTimeout(2000);

    let priceMin = null;
    let priceMax = null;
    let source = null;

    const content = await page.content();

    // Look for price indicators
    // Burpple often shows "$" symbols for price level
    const priceLevelMatch = content.match(/class="[^"]*price[^"]*"[^>]*>(\${1,4})/i);
    if (priceLevelMatch) {
      const level = priceLevelMatch[1].length;
      const priceRanges = {
        1: { min: 5, max: 15 },
        2: { min: 15, max: 30 },
        3: { min: 30, max: 60 },
        4: { min: 60, max: 150 }
      };
      if (priceRanges[level]) {
        priceMin = priceRanges[level].min;
        priceMax = priceRanges[level].max;
        source = 'burpple-level';
      }
    }

    // Look for actual price mentions
    if (!priceMin) {
      const priceMatches = [...content.matchAll(/\$([\d.]+)/g)];
      const prices = [];
      for (const match of priceMatches) {
        const price = parseFloat(match[1]);
        if (price >= 3 && price <= 200) {
          prices.push(price);
        }
      }
      if (prices.length >= 2) {
        prices.sort((a, b) => a - b);
        priceMin = prices[Math.floor(prices.length * 0.2)];
        priceMax = prices[Math.floor(prices.length * 0.8)];
        source = 'burpple-extracted';
      }
    }

    return { priceMin, priceMax, source };
  } catch (error) {
    return { priceMin: null, priceMax: null, error: error.message };
  }
}

async function scrapePriceFromGrabFood(page, name) {
  try {
    const searchQuery = encodeURIComponent(name);
    await page.goto(`https://food.grab.com/sg/en/search?q=${searchQuery}`, {
      waitUntil: 'domcontentloaded',
      timeout: 20000
    });

    await page.waitForTimeout(3000);

    let priceMin = null;
    let priceMax = null;
    let source = null;

    const content = await page.content();

    // GrabFood shows menu prices
    const priceMatches = [...content.matchAll(/S?\$([\d.]+)/g)];
    const prices = [];
    for (const match of priceMatches) {
      const price = parseFloat(match[1]);
      if (price >= 2 && price <= 100) {
        prices.push(price);
      }
    }

    if (prices.length >= 3) {
      prices.sort((a, b) => a - b);
      const p10 = Math.floor(prices.length * 0.1);
      const p90 = Math.floor(prices.length * 0.9);
      priceMin = prices[p10];
      priceMax = prices[p90];
      source = 'grabfood';
    } else if (prices.length > 0) {
      priceMin = Math.min(...prices);
      priceMax = Math.max(...prices);
      source = 'grabfood-limited';
    }

    return { priceMin, priceMax, source };
  } catch (error) {
    return { priceMin: null, priceMax: null, error: error.message };
  }
}

async function scrapeAllSources(page, name) {
  // Try GrabFood first (most reliable for menu prices)
  let result = await scrapePriceFromGrabFood(page, name);
  if (result.priceMin !== null) {
    return result;
  }

  // Try HungryGoWhere
  result = await scrapePriceFromHungryGoWhere(page, name);
  if (result.priceMin !== null) {
    return result;
  }

  // Try Burpple
  result = await scrapePriceFromBurpple(page, name);
  return result;
}

async function savePriceData(listingId, priceMin, priceMax) {
  if (priceMin === null && priceMax === null) return false;

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

async function processWorker(workerId, restaurants, totalMissing, startOffset) {
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

    const { priceMin, priceMax, source, error } = await scrapeAllSources(
      page,
      restaurant.name
    );

    const result = {
      id: restaurant.id,
      name: restaurant.name,
      priceMin,
      priceMax,
      source,
      error
    };
    results.push(result);

    if (priceMin !== null || priceMax !== null) {
      found++;
      console.log(`  [W${workerId}] ✓ $${priceMin} - $${priceMax} (${source})`);

      const success = await savePriceData(restaurant.id, priceMin, priceMax);
      if (success) {
        updated++;
      }
    } else {
      console.log(`  [W${workerId}] ✗ No price found`);
    }

    // Rate limiting
    await page.waitForTimeout(500 + Math.random() * 500);
  }

  await browser.close();
  return { results, found, updated };
}

async function main() {
  console.log('='.repeat(60));
  console.log('SCRAPING PRICES FROM FOOD DELIVERY/REVIEW SITES');
  console.log('='.repeat(60));

  const totalMissing = await getTotalMissingCount();
  console.log(`\nTotal listings missing prices: ${totalMissing}`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log(`Parallel workers: ${PARALLEL_WORKERS}\n`);

  const restaurants = await getListingsWithoutPrices(START_OFFSET, BATCH_SIZE);

  if (restaurants.length === 0) {
    console.log('No listings to process!');
    return;
  }

  console.log(`Processing ${restaurants.length} listings...\n`);

  // Split among workers
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
    processWorker(idx + 1, chunk, totalMissing, START_OFFSET + idx * chunkSize)
  );

  const workerResults = await Promise.all(workerPromises);

  // Aggregate
  let found = 0;
  let updated = 0;
  const results = [];

  for (const wr of workerResults) {
    found += wr.found;
    updated += wr.updated;
    results.push(...wr.results);
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Processed: ${restaurants.length}`);
  console.log(`Found prices: ${found}`);
  console.log(`Updated in DB: ${updated}`);
  console.log(`Failed: ${restaurants.length - found}`);

  // Save results
  fs.writeFileSync(
    `scripts/food-site-price-results.json`,
    JSON.stringify(results, null, 2)
  );
  console.log(`\nResults saved to scripts/food-site-price-results.json`);
}

main().catch(console.error);
