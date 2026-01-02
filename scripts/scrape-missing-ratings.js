const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'sb_secret_J_vsb7RYUQ_0Dm2YTR_Fuw_O-ovCRlN'
);

const BATCH_SIZE = parseInt(process.argv[2]) || 50;
const START_OFFSET = parseInt(process.argv[3]) || 0;
const PARALLEL_WORKERS = parseInt(process.argv[4]) || 2; // Number of parallel browsers
const PROGRESS_FILE = 'scripts/rating-scrape-progress.json';

async function getRestaurantsWithoutRatings(offset, limit) {
  const { data, error } = await supabase
    .from('food_listings')
    .select('id, name, address, station_id')
    .is('rating', null)
    .is('review_count', null)
    .order('name')
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching:', error);
    return [];
  }
  return data;
}

async function getTotalMissingCount() {
  const { count, error } = await supabase
    .from('food_listings')
    .select('*', { count: 'exact', head: true })
    .is('rating', null)
    .is('review_count', null);

  if (error) {
    console.error('Error getting count:', error);
    return 0;
  }
  return count;
}

async function scrapeGoogleRating(page, name, address) {
  try {
    // Build search query
    const searchQuery = address
      ? `${name} ${address}`
      : `${name} Singapore restaurant`;

    const encodedQuery = encodeURIComponent(searchQuery);
    await page.goto(`https://www.google.com/maps/search/${encodedQuery}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Wait for results to load
    await page.waitForTimeout(2000);

    let rating = null;
    let reviewCount = null;

    // Method 1: Look for rating in aria-label with stars
    try {
      const starElements = await page.$$('[role="img"][aria-label*="star"]');
      for (const el of starElements) {
        const ariaLabel = await el.getAttribute('aria-label');
        if (ariaLabel) {
          const match = ariaLabel.match(/([\d.]+)\s*star/i);
          if (match) {
            rating = parseFloat(match[1]);
            break;
          }
        }
      }
    } catch (e) {}

    // Method 2: Look for rating number directly
    if (!rating) {
      try {
        const content = await page.content();
        // Pattern: "4.5" followed by "stars" in aria-label
        const ratingMatch = content.match(/aria-label="([\d.]+) stars?"/i);
        if (ratingMatch) {
          rating = parseFloat(ratingMatch[1]);
        }
      } catch (e) {}
    }

    // Method 3: Click on first result and get details
    if (!rating) {
      try {
        // Click on the first result in the list
        const firstResult = await page.$('[role="feed"] > div:first-child');
        if (firstResult) {
          await firstResult.click();
          await page.waitForTimeout(2000);

          // Now look for rating in the details panel
          const detailsContent = await page.content();

          // Look for rating pattern in details
          const detailRatingMatch = detailsContent.match(/"([\d.]+)"[^}]*"stars?"/i) ||
                                    detailsContent.match(/aria-label="([\d.]+) stars?"/i);
          if (detailRatingMatch) {
            rating = parseFloat(detailRatingMatch[1]);
          }
        }
      } catch (e) {}
    }

    // Get review count - look for specific patterns in Google Maps
    try {
      // Method 1: Look for the review button/link with aria-label
      const reviewButton = await page.$('[aria-label*="review"]');
      if (reviewButton) {
        const ariaLabel = await reviewButton.getAttribute('aria-label');
        if (ariaLabel) {
          // Pattern: "123 reviews" or "1,234 reviews"
          const match = ariaLabel.match(/([\d,]+)\s*reviews?/i);
          if (match) {
            reviewCount = parseInt(match[1].replace(/,/g, ''));
          }
        }
      }

      // Method 2: Look for text content with review count pattern
      if (!reviewCount) {
        // Find elements that might contain review count
        const elements = await page.$$('button, span, div');
        for (const el of elements) {
          try {
            const text = await el.textContent();
            // Match patterns like "(123)" or "(1,234)" right after rating
            if (text) {
              const match = text.match(/^\(([\d,]+)\)$/);
              if (match) {
                const count = parseInt(match[1].replace(/,/g, ''));
                // Sanity check - review count should be reasonable (less than 100k for most restaurants)
                if (count > 0 && count < 100000) {
                  reviewCount = count;
                  break;
                }
              }
            }
          } catch (e) {}
        }
      }

      // Method 3: Parse page content for review patterns near the rating
      if (!reviewCount) {
        const content = await page.content();
        // Look for pattern: rating followed by review count in parentheses
        // E.g., "4.5</span><span>(1,234)</span>"
        const patterns = [
          /aria-label="[\d.]+ stars?"[^>]*>.*?\(([\d,]+)\)/i,
          />([\d,]+)\s*reviews?</i,
          />\(([\d,]+)\)</
        ];

        for (const pattern of patterns) {
          const match = content.match(pattern);
          if (match) {
            const count = parseInt(match[1].replace(/,/g, ''));
            // Sanity check
            if (count > 0 && count < 100000) {
              reviewCount = count;
              break;
            }
          }
        }
      }
    } catch (e) {}

    return { rating, reviewCount };
  } catch (error) {
    console.error(`  Error scraping ${name}:`, error.message);
    return { rating: null, reviewCount: null, error: error.message };
  }
}

async function updateRestaurantRating(id, rating, reviewCount) {
  const updateData = {};
  if (rating !== null) updateData.rating = rating;
  if (reviewCount !== null) updateData.review_count = reviewCount;

  if (Object.keys(updateData).length === 0) return false;

  const { error } = await supabase
    .from('food_listings')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error(`  DB update error:`, error.message);
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
    const globalIndex = startOffset + (workerId - 1) * restaurants.length + i + 1;

    console.log(`[W${workerId}][${globalIndex}/${totalMissing}] ${restaurant.name}`);

    const { rating, reviewCount, error } = await scrapeGoogleRating(
      page,
      restaurant.name,
      restaurant.address
    );

    const result = {
      id: restaurant.id,
      name: restaurant.name,
      rating,
      reviewCount,
      error
    };
    results.push(result);

    if (rating !== null || reviewCount !== null) {
      found++;
      console.log(`  [W${workerId}] ✓ Found: ${rating ? `★${rating}` : 'no rating'} | ${reviewCount ? `${reviewCount} reviews` : 'no count'}`);

      const success = await updateRestaurantRating(restaurant.id, rating, reviewCount);
      if (success) {
        updated++;
      }
    } else {
      console.log(`  [W${workerId}] ✗ No rating found`);
      progress.failed.push({ id: restaurant.id, name: restaurant.name });
    }

    // Rate limiting - faster but still safe
    const delay = 1000 + Math.random() * 500;
    await page.waitForTimeout(delay);
  }

  await browser.close();
  return { results, found, updated };
}

async function main() {
  console.log('='.repeat(60));
  console.log('SCRAPING MISSING RATINGS FROM GOOGLE MAPS');
  console.log('='.repeat(60));

  const totalMissing = await getTotalMissingCount();
  console.log(`\nTotal restaurants missing ratings: ${totalMissing}`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log(`Starting from offset: ${START_OFFSET}`);
  console.log(`Parallel workers: ${PARALLEL_WORKERS}\n`);

  const restaurants = await getRestaurantsWithoutRatings(START_OFFSET, BATCH_SIZE);

  if (restaurants.length === 0) {
    console.log('No restaurants to process!');
    return;
  }

  console.log(`Processing ${restaurants.length} restaurants with ${PARALLEL_WORKERS} workers...\n`);

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
  console.log(`Found ratings: ${found}`);
  console.log(`Updated in DB: ${updated}`);
  console.log(`Failed: ${restaurants.length - found}`);

  console.log('\n' + '-'.repeat(60));
  console.log('OVERALL PROGRESS');
  console.log('-'.repeat(60));
  console.log(`Total processed: ${progress.processed}`);
  console.log(`Total found: ${progress.found}`);
  console.log(`Total updated: ${progress.updated}`);

  const nextOffset = START_OFFSET + BATCH_SIZE;
  const remaining = totalMissing - nextOffset;

  if (remaining > 0) {
    console.log(`\nNext batch command:`);
    console.log(`  node scripts/scrape-missing-ratings.js ${BATCH_SIZE} ${nextOffset}`);
    console.log(`  Remaining: ${remaining} restaurants`);
  } else {
    console.log(`\n✓ All restaurants processed!`);
  }

  // Save detailed results
  fs.writeFileSync(
    `scripts/rating-results-${START_OFFSET}-${START_OFFSET + restaurants.length}.json`,
    JSON.stringify(results, null, 2)
  );
  console.log(`\nResults saved to scripts/rating-results-${START_OFFSET}-${START_OFFSET + restaurants.length}.json`);
}

main().catch(console.error);
