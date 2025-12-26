/**
 * Scrape opening hours from Google Maps without using API
 * Uses restaurant name + station name for search
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
  // Parse hours text like "Monday, 11 AM to 10 PM; Tuesday, 11 AM to 10 PM"
  // or "Monday: 11:00 AM – 10:00 PM"
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const weekdayDescriptions = [];

  for (const day of days) {
    // Match patterns like "Monday, 11 AM to 10 PM" or "Monday: 11 AM – 10 PM"
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

async function scrapeOpeningHours(page, name, stationName, debug = false) {
  const query = `${name} ${stationName} MRT Singapore`;
  const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await delay(1500);

    // Handle consent dialog if present
    try {
      const acceptButton = await page.$('button[aria-label*="Accept"]');
      if (acceptButton) {
        await acceptButton.click();
        await delay(1000);
      }
    } catch (e) {}

    // Check if we landed on a place page or search results
    let currentUrl = page.url();

    if (debug) {
      await page.screenshot({ path: 'debug-search.png' });
      console.log('  Current URL:', currentUrl);
    }

    // If still on search results, click first result
    if (currentUrl.includes('/maps/search/')) {
      await delay(800);

      // Try multiple selectors for the first result
      let clicked = false;

      // Try: feed > first div with href
      const feedResult = await page.$('div[role="feed"] a[href*="/maps/place/"]');
      if (feedResult) {
        await feedResult.click();
        clicked = true;
      }

      // Try: any link to a place
      if (!clicked) {
        const placeLink = await page.$('a[href*="/maps/place/"]');
        if (placeLink) {
          await placeLink.click();
          clicked = true;
        }
      }

      if (clicked) {
        await delay(1500);
        currentUrl = page.url();
      }
    }

    if (debug) {
      await page.screenshot({ path: 'debug-place.png' });
      console.log('  Place URL:', currentUrl);
    }

    // Make sure we're on a place page
    if (!currentUrl.includes('/maps/place/')) {
      if (debug) console.log('  Not on a place page');
      return null;
    }

    let openingHours = null;

    // Method 1: Look for hours aria-label which contains full schedule
    // Collect all hours-related labels
    let allHoursLabels = [];
    const hoursElements = await page.$$('[aria-label]');
    for (const el of hoursElements) {
      const label = await el.getAttribute('aria-label');
      if (label && label.match(/monday|tuesday|wednesday|thursday|friday|saturday|sunday/i) && label.match(/\d+\s*(am|pm|AM|PM)/i)) {
        if (debug) console.log('  Found hours label:', label.substring(0, 100));
        allHoursLabels.push(label);
      }
    }

    // Combine all found labels and parse
    if (allHoursLabels.length > 0) {
      const combinedText = allHoursLabels.join('; ');
      const parsed = parseHoursText(combinedText);
      if (parsed && parsed.length >= 5) {
        openingHours = { weekdayDescriptions: parsed };
      }
    }

    // Method 2: Click the hours button to expand and read table
    if (!openingHours) {
      const hoursButton = await page.$('[data-item-id="oh"]');
      if (hoursButton) {
        if (debug) console.log('  Found hours button, clicking...');
        await hoursButton.click();
        await delay(800);

        if (debug) {
          await page.screenshot({ path: 'debug-hours.png' });
        }

        // Look for the hours table
        const rows = await page.$$('table tr');
        const hours = [];
        for (const row of rows) {
          const text = await row.textContent();
          if (text && text.match(/monday|tuesday|wednesday|thursday|friday|saturday|sunday/i)) {
            const cleaned = text.replace(/\s+/g, ' ').trim();
            hours.push(cleaned);
          }
        }
        if (hours.length >= 5) {
          openingHours = { weekdayDescriptions: hours };
        }

        // Try getting aria-label from the button
        if (!openingHours) {
          const ariaLabel = await hoursButton.getAttribute('aria-label');
          if (debug && ariaLabel) console.log('  Hours button aria-label:', ariaLabel.substring(0, 100));
          if (ariaLabel) {
            const parsed = parseHoursText(ariaLabel);
            if (parsed && parsed.length > 0) {
              openingHours = { weekdayDescriptions: parsed };
            }
          }
        }
      } else if (debug) {
        console.log('  No hours button found');
      }
    }

    // Method 3: Get text from hours section
    if (!openingHours) {
      // Try to find any element containing hours info
      const bodyText = await page.textContent('body');

      // Look for patterns like "Open ⋅ Closes 10 PM" or "Closed ⋅ Opens 11 AM"
      const statusMatch = bodyText.match(/(Open|Closed)\s*[⋅·]\s*(Opens?|Closes?)\s+(\d+(?::\d+)?\s*(?:AM|PM))/i);
      if (statusMatch) {
        if (debug) console.log('  Found status:', statusMatch[0]);
        openingHours = { weekdayDescriptions: [statusMatch[0]] };
      }
    }

    return openingHours;

  } catch (error) {
    console.error(`  Error scraping: ${error.message}`);
    return null;
  }
}

async function processListings(page, listings, type) {
  let updated = 0;
  let failed = 0;
  let notFound = 0;

  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    const stationName = type === 'food'
      ? listing.stations?.name
      : listing.malls?.stations?.name;

    console.log(`[${i + 1}/${listings.length}] ${listing.name} (${stationName || 'no station'})`);

    if (!stationName) {
      console.log('  ⊘ No station info, skipping');
      notFound++;
      continue;
    }

    const debug = i === 0; // Debug first item
    const hours = await scrapeOpeningHours(page, listing.name, stationName, debug);

    if (!hours) {
      console.log('  ✗ No opening hours found');
      notFound++;
      continue;
    }

    // Update database
    const table = type === 'food' ? 'food_listings' : 'mall_outlets';
    const { error } = await supabase
      .from(table)
      .update({ opening_hours: hours })
      .eq('id', listing.id);

    if (error) {
      console.log(`  ✗ DB error: ${error.message}`);
      failed++;
    } else {
      console.log('  ✓ Updated:', hours.weekdayDescriptions?.[0]?.substring(0, 50) || 'hours saved');
      updated++;
    }

    // Rate limiting - wait between requests (reduced for speed)
    await delay(500 + Math.random() * 500);
  }

  return { updated, failed, notFound };
}

async function main() {
  const args = process.argv.slice(2);
  const type = args[0] || 'food'; // 'food' or 'mall'
  const limit = parseInt(args[1]) || 10;

  console.log(`\n=== SCRAPING OPENING HOURS (${type}, limit: ${limit}) ===\n`);

  // Fetch listings missing opening hours
  let listings;

  if (type === 'food') {
    const { data, error } = await supabase
      .from('food_listings')
      .select('id, name, station_id, stations(name)')
      .is('opening_hours', null)
      .not('station_id', 'is', null)
      .limit(limit);

    if (error) {
      console.error('Error fetching listings:', error);
      return;
    }
    listings = data;
  } else {
    const { data, error } = await supabase
      .from('mall_outlets')
      .select('id, name, malls(name, station_id, stations:station_id(name))')
      .is('opening_hours', null)
      .limit(limit);

    if (error) {
      console.error('Error fetching outlets:', error);
      return;
    }
    listings = data;
  }

  console.log(`Found ${listings.length} ${type} entries to process\n`);

  if (listings.length === 0) {
    console.log('Nothing to process!');
    return;
  }

  // Launch browser
  const browser = await chromium.launch({
    headless: true, // Headless for speed
    slowMo: 0
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  });

  const page = await context.newPage();

  try {
    const results = await processListings(page, listings, type);

    console.log('\n=== SUMMARY ===');
    console.log(`Updated: ${results.updated}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Not found: ${results.notFound}`);

  } finally {
    await browser.close();
  }
}

main().catch(console.error);
