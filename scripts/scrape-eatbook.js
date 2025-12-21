/**
 * Scrape food recommendations from EatBook.sg
 * EatBook has listicle format with multiple restaurants per article
 */

require('dotenv').config({ path: '.env.local' });
const { chromium } = require('playwright');
const { supabase, geocodeAddress, findNearestStation, getWalkingDistance, restaurantExists, sleep } = require('./scraper-utils');

const SOURCE_ID = 'eatbook';

// Category pages to scrape
const CATEGORY_URLS = [
  'https://eatbook.sg/category/food-guides/best-food-guides/',  // Best food guides
  'https://eatbook.sg/category/food-guides/area-guides/',        // Area guides
];

async function findArticles(page) {
  console.log('=== Finding EatBook Articles ===\n');
  const allArticles = [];

  for (const categoryUrl of CATEGORY_URLS) {
    console.log(`Fetching: ${categoryUrl}`);
    await page.goto(categoryUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(3000);

    // Scroll to load more articles
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await sleep(1000);
    }

    const results = await page.evaluate(() => {
      const items = [];
      const seen = new Set();

      document.querySelectorAll('.post, [class*="post-"]').forEach(post => {
        const link = post.querySelector('a[href*="eatbook.sg"]');
        const title = post.querySelector('h2, h3, .post-header, .entry-title');
        if (link && title) {
          const href = link.href;
          const text = title.textContent?.trim();

          // Skip category pages and duplicates
          if (href.includes('/category/') || seen.has(href)) return;

          // Only include "best" or "guide" articles
          const textLower = text?.toLowerCase() || '';
          if (textLower.includes('best') || textLower.includes('guide') ||
              textLower.includes('top') || textLower.includes('must try') ||
              textLower.includes('ranked')) {
            seen.add(href);
            items.push({ url: href, title: text });
          }
        }
      });

      return items;
    });

    console.log(`  Found ${results.length} articles`);
    allArticles.push(...results);
    await sleep(1000);
  }

  // Dedupe
  const seen = new Set();
  const uniqueArticles = allArticles.filter(a => {
    if (seen.has(a.url)) return false;
    seen.add(a.url);
    return true;
  });

  console.log(`\nTotal unique articles: ${uniqueArticles.length}`);
  return uniqueArticles;
}

async function extractRestaurantsFromArticle(page, articleUrl) {
  console.log(`\nScraping: ${articleUrl}`);

  try {
    await page.goto(articleUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(2000);

    const data = await page.evaluate(() => {
      const restaurants = [];

      // EatBook uses h3 for restaurant names with numbering like "10. Restaurant Name"
      document.querySelectorAll('h3').forEach(h3 => {
        const text = h3.textContent?.trim() || '';
        if (text.length < 3 || text.length > 150) return;
        if (/^(summary|conclusion|related|read also|you may|where to|best )/i.test(text)) return;

        // Get restaurant name (must have numbering)
        const nameMatch = text.match(/^\d+\.\s*(.+)$/);
        if (!nameMatch) return;
        const name = nameMatch[1].trim();

        // Look for address and hours in following elements
        let address = null;
        let openingHours = null;
        let element = h3.nextElementSibling;
        let attempts = 0;

        while (element && attempts < 15) {
          const content = element.textContent || '';

          if (!address) {
            const addrMatch = content.match(/Address:\s*([^<\n]+(?:Singapore\s*\d{6})?)/i);
            if (addrMatch) address = addrMatch[1].trim();
          }

          if (!openingHours) {
            const hoursMatch = content.match(/Opening [Hh]ours?:\s*([^<\n]+)/i);
            if (hoursMatch) openingHours = hoursMatch[1].trim();
          }

          element = element.nextElementSibling;
          attempts++;
          if (element?.tagName === 'H2' || element?.tagName === 'H3') break;
        }

        if (name.length > 2 && name.length < 100) {
          restaurants.push({ name, address, openingHours });
        }
      });

      // Get article featured image
      const imgEl = document.querySelector('.post-thumbnail img, .featured-image img, article img');
      const imageUrl = imgEl?.src || null;

      return { restaurants, imageUrl };
    });

    console.log(`  Found ${data.restaurants.length} restaurants`);
    return data;
  } catch (err) {
    console.error(`  Error: ${err.message}`);
    return { restaurants: [], imageUrl: null };
  }
}

async function insertRestaurant(restaurant, articleUrl, articleImage) {
  // Check if exists
  const exists = await restaurantExists(restaurant.name, restaurant.address);
  if (exists) {
    return { inserted: false, reason: 'exists' };
  }

  // Must have address to geocode
  if (!restaurant.address) {
    return { inserted: false, reason: 'no address' };
  }

  // Geocode address
  const geo = await geocodeAddress(restaurant.address);
  if (!geo) {
    console.log(`    Could not geocode: ${restaurant.name}`);
    return { inserted: false, reason: 'geocode failed' };
  }

  // Find nearest station
  const station = await findNearestStation(geo.lat, geo.lng);
  if (!station) {
    console.log(`    No station found for: ${restaurant.name}`);
    return { inserted: false, reason: 'no station' };
  }

  // Get walking distance
  const walking = await getWalkingDistance(geo.lat, geo.lng, station.lat, station.lng);

  // Insert
  const { error } = await supabase
    .from('food_listings')
    .insert({
      name: restaurant.name,
      address: restaurant.address,
      station_id: station.id,
      image_url: articleImage,
      source_id: SOURCE_ID,
      source_url: articleUrl,
      opening_hours: restaurant.openingHours,
      tags: [],
      is_active: true,
      lat: geo.lat,
      lng: geo.lng,
      distance_to_station: walking?.distance || null,
      walking_time: walking?.time || null
    });

  if (error) {
    console.log(`    Error inserting ${restaurant.name}: ${error.message}`);
    return { inserted: false, reason: 'db error' };
  }

  console.log(`    Inserted: ${restaurant.name} (near ${station.name})`);
  return { inserted: true };
}

async function main() {
  console.log('=== EATBOOK SCRAPER ===\n');
  console.log('Date range: 2020-2025\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Find articles
    const articles = await findArticles(page);

    // Process all articles (or limit for testing)
    const maxArticles = process.argv[2] ? parseInt(process.argv[2]) : articles.length;
    const articlesToProcess = articles.slice(0, maxArticles);
    console.log(`\nProcessing ${articlesToProcess.length} articles...\n`);

    let stats = { inserted: 0, skipped: 0, noAddress: 0, geocodeFailed: 0 };

    for (const article of articlesToProcess) {
      const data = await extractRestaurantsFromArticle(page, article.url);

      for (const restaurant of data.restaurants) {
        const result = await insertRestaurant(restaurant, article.url, data.imageUrl);
        if (result.inserted) stats.inserted++;
        else if (result.reason === 'exists') stats.skipped++;
        else if (result.reason === 'no address') stats.noAddress++;
        else if (result.reason === 'geocode failed') stats.geocodeFailed++;
      }

      await sleep(500); // Be nice to the server
    }

    console.log('\n=== COMPLETE ===');
    console.log(`Inserted: ${stats.inserted}`);
    console.log(`Skipped (exists): ${stats.skipped}`);
    console.log(`No address: ${stats.noAddress}`);
    console.log(`Geocode failed: ${stats.geocodeFailed}`);

  } catch (err) {
    console.error('Error:', err);
  }

  await browser.close();
}

main().catch(console.error);
