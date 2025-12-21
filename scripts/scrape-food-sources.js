/**
 * Scrape food recommendations from all sources
 * Uses each site's search functionality or category pages
 */

require('dotenv').config({ path: '.env.local' });
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Try 8days internal search
async function search8days(page) {
  console.log('\n=== Searching 8days.sg ===');

  // Go to 8days search with "best food" query
  await page.goto('https://www.8days.sg/search?q=best+food+2024', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  await sleep(3000);

  const results = await page.evaluate(() => {
    const items = [];
    // Look for search results
    document.querySelectorAll('a').forEach(a => {
      const href = a.href || '';
      const text = a.textContent?.trim() || '';
      if (href.includes('/eatanddrink/') && text.length > 20 &&
          (text.toLowerCase().includes('best') || text.toLowerCase().includes('top') ||
           text.toLowerCase().includes('must try') || text.toLowerCase().includes('guide'))) {
        items.push({ url: href, title: text.slice(0, 100) });
      }
    });
    return items;
  });

  console.log(`Found ${results.length} "best food" articles`);
  results.slice(0, 10).forEach(r => console.log(`  - ${r.title}`));
  return results;
}

// Try EatBook - known for listicles
async function searchEatBook(page) {
  console.log('\n=== Searching eatbook.sg ===');

  await page.goto('https://eatbook.sg/?s=best+food', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  await sleep(3000);

  const results = await page.evaluate(() => {
    const items = [];
    document.querySelectorAll('article a, .post a, h2 a, h3 a').forEach(a => {
      const href = a.href || '';
      const text = a.textContent?.trim() || '';
      if (href.includes('eatbook.sg/') && text.length > 15 && !href.includes('?s=')) {
        items.push({ url: href, title: text.slice(0, 100) });
      }
    });
    // Dedupe
    const seen = new Set();
    return items.filter(i => {
      if (seen.has(i.url)) return false;
      seen.add(i.url);
      return true;
    });
  });

  console.log(`Found ${results.length} articles`);
  results.slice(0, 10).forEach(r => console.log(`  - ${r.title}`));
  return results;
}

// Try sethlui.com
async function searchSethLui(page) {
  console.log('\n=== Searching sethlui.com ===');

  await page.goto('https://sethlui.com/?s=best+food+singapore', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  await sleep(3000);

  const results = await page.evaluate(() => {
    const items = [];
    document.querySelectorAll('article a, .post a, h2 a, h3 a, .entry-title a').forEach(a => {
      const href = a.href || '';
      const text = a.textContent?.trim() || '';
      if (href.includes('sethlui.com/') && text.length > 15 && !href.includes('?s=')) {
        items.push({ url: href, title: text.slice(0, 100) });
      }
    });
    const seen = new Set();
    return items.filter(i => {
      if (seen.has(i.url)) return false;
      seen.add(i.url);
      return true;
    });
  });

  console.log(`Found ${results.length} articles`);
  results.slice(0, 10).forEach(r => console.log(`  - ${r.title}`));
  return results;
}

// Try Miss Tam Chiak
async function searchMissTamChiak(page) {
  console.log('\n=== Searching misstamchiak.com ===');

  await page.goto('https://www.misstamchiak.com/?s=best+food', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  await sleep(3000);

  const results = await page.evaluate(() => {
    const items = [];
    document.querySelectorAll('article a, .post a, h2 a, h3 a').forEach(a => {
      const href = a.href || '';
      const text = a.textContent?.trim() || '';
      if (href.includes('misstamchiak.com/') && text.length > 15 && !href.includes('?s=')) {
        items.push({ url: href, title: text.slice(0, 100) });
      }
    });
    const seen = new Set();
    return items.filter(i => {
      if (seen.has(i.url)) return false;
      seen.add(i.url);
      return true;
    });
  });

  console.log(`Found ${results.length} articles`);
  results.slice(0, 10).forEach(r => console.log(`  - ${r.title}`));
  return results;
}

async function main() {
  console.log('=== FOOD SOURCE SCRAPER ===');
  console.log('Testing internal search on food blogs...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await search8days(page);
    await searchEatBook(page);
    await searchSethLui(page);
    await searchMissTamChiak(page);
  } catch (err) {
    console.error('Error:', err.message);
  }

  await browser.close();
}

main().catch(console.error);
