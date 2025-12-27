/**
 * Scrape opening hours from Google Maps - PARALLEL VERSION
 * Runs multiple browser instances for speed
 */

const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function parseHoursText(text) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const weekdayDescriptions = [];

  for (const day of days) {
    const regex = new RegExp(`${day}[,:\\s]+([\\d:]+\\s*(?:AM|PM)?\\s*(?:to|–|-|—)\\s*[\\d:]+\\s*(?:AM|PM)?)`, 'i');
    const match = text.match(regex);
    if (match) {
      weekdayDescriptions.push(`${day}: ${match[1].trim()}`);
    } else if (text.toLowerCase().includes(day.toLowerCase()) && text.toLowerCase().includes('closed')) {
      weekdayDescriptions.push(`${day}: Closed`);
    }
  }

  return weekdayDescriptions.length > 0 ? weekdayDescriptions : null;
}

async function scrapeOpeningHours(page, name, mallName, stationName, placeId) {
  // Search by name + mall + "opening hours" for better results
  const query = mallName
    ? `${name} ${mallName} Singapore opening hours`
    : `${name} ${stationName} Singapore opening hours`;
  const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await delay(2500);

    let currentUrl = page.url();

    // Check if place info is already showing (direct match)
    let hoursButton = await page.$('[data-item-id="oh"]');

    // If no hours button and still on search results, click first result
    if (!hoursButton && currentUrl.includes('/maps/search/')) {
      await delay(1000);

      // Try clicking the first result - could be in feed or direct link
      const feedResult = await page.$('div[role="feed"] a[href*="/maps/place/"]');
      if (feedResult) {
        await feedResult.click();
        await delay(2500);
      } else {
        const placeLink = await page.$('a[href*="/maps/place/"]');
        if (placeLink) {
          await placeLink.click();
          await delay(2500);
        }
      }

      // Re-check for hours button after navigation
      hoursButton = await page.$('[data-item-id="oh"]');
    }

    let openingHours = null;

    // Method 1: Look for hours aria-label
    const hoursElements = await page.$$('[aria-label]');
    for (const el of hoursElements) {
      const label = await el.getAttribute('aria-label');
      if (label && label.match(/monday|tuesday|wednesday/i) && label.match(/\d+\s*(am|pm|AM|PM)/i)) {
        const parsed = parseHoursText(label);
        if (parsed && parsed.length >= 5) {
          openingHours = { weekdayDescriptions: parsed };
          break;
        }
      }
    }

    // Method 2: Use hours button (already found above or find it now)
    if (!openingHours) {
      if (!hoursButton) {
        hoursButton = await page.$('[data-item-id="oh"]');
      }
      if (hoursButton) {
        // First try to get aria-label directly
        const ariaLabel = await hoursButton.getAttribute('aria-label');
        if (ariaLabel && ariaLabel.match(/\d+\s*(am|pm)/i)) {
          openingHours = { weekdayDescriptions: [ariaLabel] };
        }

        // If no direct hours, click to expand
        if (!openingHours) {
          await hoursButton.click();
          await delay(800);

          const rows = await page.$$('table tr');
          const hours = [];
          for (const row of rows) {
            const text = await row.textContent();
            if (text && text.match(/monday|tuesday|wednesday|thursday|friday|saturday|sunday/i)) {
              hours.push(text.replace(/\s+/g, ' ').trim());
            }
          }
          if (hours.length >= 5) {
            openingHours = { weekdayDescriptions: hours };
          }
        }
      }
    }

    // Method 3: Get status text
    if (!openingHours) {
      const bodyText = await page.textContent('body');
      const statusMatch = bodyText.match(/(Open|Closed)\s*[⋅·]\s*(Opens?|Closes?)\s+(\d+(?::\d+)?\s*(?:AM|PM))/i);
      if (statusMatch) {
        openingHours = { weekdayDescriptions: [statusMatch[0]] };
      }
    }

    return openingHours;

  } catch (error) {
    return null;
  }
}

async function processWorker(workerId, listings, results) {
  const browser = await chromium.launch({
    headless: true,
    slowMo: 0
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  });

  const page = await context.newPage();

  for (const listing of listings) {
    const stationName = listing.malls?.stations?.name;
    const mallName = listing.malls?.name;

    if (!stationName) {
      console.log(`[W${workerId}] ⊘ ${listing.name} - no station`);
      results.notFound++;
      continue;
    }

    const hours = await scrapeOpeningHours(page, listing.name, mallName, stationName, listing.google_place_id);

    if (!hours) {
      console.log(`[W${workerId}] ✗ ${listing.name}`);
      results.notFound++;
      continue;
    }

    const { error } = await supabase
      .from('mall_outlets')
      .update({ opening_hours: hours })
      .eq('id', listing.id);

    if (error) {
      console.log(`[W${workerId}] ✗ ${listing.name} - DB error`);
      results.failed++;
    } else {
      console.log(`[W${workerId}] ✓ ${listing.name}`);
      results.updated++;
    }

    // Minimal delay between requests
    await delay(100);
  }

  await browser.close();
}

async function main() {
  const args = process.argv.slice(2);
  const limit = parseInt(args[0]) || 100;
  const workers = parseInt(args[1]) || 3;
  const offset = parseInt(args[2]) || 0;

  console.log(`\n=== PARALLEL SCRAPE (limit: ${limit}, workers: ${workers}, offset: ${offset}) ===\n`);

  // Fetch mall outlets missing opening hours
  const { data: listings, error } = await supabase
    .from('mall_outlets')
    .select('id, name, google_place_id, opening_hours, malls(name, station_id, stations:station_id(name))')
    .range(offset, offset + limit - 1);

  // Filter to only those with null or empty opening_hours
  const toProcess = listings ? listings.filter(l => {
    const h = l.opening_hours;
    return h === null || h === undefined || Object.keys(h).length === 0;
  }) : [];

  if (error) {
    console.error('Error fetching outlets:', error);
    return;
  }

  console.log(`Found ${toProcess.length} outlets to process (from ${listings?.length || 0} with place_id)\n`);

  if (toProcess.length === 0) {
    console.log('Nothing to process!');
    return;
  }

  // Split listings among workers
  const chunkSize = Math.ceil(toProcess.length / workers);
  const chunks = [];
  for (let i = 0; i < workers; i++) {
    chunks.push(toProcess.slice(i * chunkSize, (i + 1) * chunkSize));
  }

  const results = { updated: 0, failed: 0, notFound: 0 };

  // Run workers in parallel
  const startTime = Date.now();
  await Promise.all(
    chunks.map((chunk, i) => processWorker(i + 1, chunk, results))
  );
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n=== SUMMARY ===');
  console.log(`Updated: ${results.updated}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Not found: ${results.notFound}`);
  console.log(`Time: ${elapsed}s (${(toProcess.length / elapsed * 60).toFixed(0)} items/min)`);
}

main().catch(console.error);
