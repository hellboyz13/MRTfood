/**
 * List all EatBook articles using search and category browsing
 * Searches for various food guide terms to find comprehensive list
 */

const { chromium } = require('playwright');
const fs = require('fs');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const SEARCH_TERMS = [
  'best food',
  'best restaurants',
  'best hawker',
  'ranked',
  'top restaurants',
  'must try',
  'food guide',
  'area guide',
];

async function searchArticles(page, term) {
  console.log(`\nSearching: "${term}"`);

  const searchUrl = `https://eatbook.sg/?s=${encodeURIComponent(term)}`;
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(2000);

  // Scroll to load more results
  for (let i = 0; i < 10; i++) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(800);
  }

  const articles = await page.evaluate(() => {
    const items = [];
    const seen = new Set();

    document.querySelectorAll('a').forEach(a => {
      const href = a.href || '';
      const text = a.textContent?.trim() || '';

      if (!href.includes('eatbook.sg/') ||
          href.includes('/category/') ||
          href.includes('/page/') ||
          href.includes('/tag/') ||
          href.includes('?s=') ||
          href.includes('/author/') ||
          href.includes('/contact') ||
          href.includes('/about') ||
          href === 'https://eatbook.sg/' ||
          href === 'https://eatbook.sg') {
        return;
      }

      if (text.length < 15 || text.length > 200) return;
      if (seen.has(href)) return;
      seen.add(href);

      items.push({ url: href, title: text });
    });

    return items;
  });

  console.log(`  Found ${articles.length} results`);
  return articles;
}

async function browseCategory(page, categoryUrl, categoryName) {
  console.log(`\nBrowsing category: ${categoryName}`);

  await page.goto(categoryUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(2000);

  // Try to find "Load More" button or scroll
  for (let i = 0; i < 20; i++) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(800);

    // Try clicking "Load More" if exists
    const loadMoreBtn = await page.$('button:has-text("Load More"), a:has-text("Load More"), .load-more');
    if (loadMoreBtn) {
      try {
        await loadMoreBtn.click();
        await sleep(1500);
      } catch (e) {}
    }
  }

  const articles = await page.evaluate(() => {
    const items = [];
    const seen = new Set();

    document.querySelectorAll('a').forEach(a => {
      const href = a.href || '';
      const text = a.textContent?.trim() || '';

      if (!href.includes('eatbook.sg/') ||
          href.includes('/category/') ||
          href.includes('/page/') ||
          href.includes('/tag/') ||
          href.includes('?s=') ||
          href.includes('/author/') ||
          href.includes('/contact') ||
          href.includes('/about') ||
          href === 'https://eatbook.sg/' ||
          href === 'https://eatbook.sg') {
        return;
      }

      if (text.length < 15 || text.length > 200) return;
      if (seen.has(href)) return;
      seen.add(href);

      items.push({ url: href, title: text });
    });

    return items;
  });

  console.log(`  Found ${articles.length} articles`);
  return articles;
}

function extractYear(str) {
  if (!str) return null;
  const match = str.match(/\b(20[12][0-9])\b/);
  return match ? parseInt(match[1]) : null;
}

function isJBOrMalaysia(title) {
  const lower = title.toLowerCase();
  return lower.includes(' jb') ||
         lower.includes('jb ') ||
         lower.includes('johor') ||
         lower.includes('malaysia') ||
         lower.includes('melaka') ||
         lower.includes('malacca') ||
         lower.includes('penang') ||
         lower.includes(' kl ') ||
         lower.includes('kuala lumpur') ||
         lower.includes('ipoh') ||
         lower.includes('genting') ||
         lower.includes('batam') ||
         lower.includes('bintan') ||
         lower.includes('mount austin') ||
         lower.includes('southkey') ||
         lower.includes('kulai') ||
         lower.includes('thai') && lower.includes('bangkok');
}

function isFoodGuide(title) {
  const lower = title.toLowerCase();
  return lower.includes('best') ||
         lower.includes('top ') ||
         lower.includes('ranked') ||
         lower.includes('guide') ||
         lower.includes('must try') ||
         lower.includes('must-try') ||
         lower.includes('places for') ||
         lower.includes('places to') ||
         lower.includes('restaurants in') ||
         lower.includes('eateries in') ||
         lower.includes('stalls in') ||
         lower.includes('where to') ||
         lower.includes('food in singapore');
}

async function main() {
  console.log('=== EATBOOK ARTICLE LISTER (2020-2023) ===\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const allArticles = [];

  try {
    // Search for various terms
    for (const term of SEARCH_TERMS) {
      const results = await searchArticles(page, term);
      allArticles.push(...results);
      await sleep(1000);
    }

    // Also browse categories
    const categories = [
      { url: 'https://eatbook.sg/category/food-guides/best-food-guides/', name: 'Best Food Guides' },
      { url: 'https://eatbook.sg/category/food-guides/area-guides/', name: 'Area Guides' },
    ];

    for (const cat of categories) {
      const results = await browseCategory(page, cat.url, cat.name);
      allArticles.push(...results);
      await sleep(1000);
    }

    // Deduplicate
    const seen = new Set();
    let articles = allArticles.filter(a => {
      if (seen.has(a.url)) return false;
      seen.add(a.url);
      return true;
    });

    console.log(`\n=== TOTAL UNIQUE: ${articles.length} articles ===`);

    // Add year info
    articles = articles.map(a => ({
      ...a,
      year: extractYear(a.url) || extractYear(a.title)
    }));

    // Filter
    const filtered = articles.filter(a => {
      if (isJBOrMalaysia(a.title)) return false;
      if (a.year && (a.year > 2023 || a.year < 2020)) return false;
      if (!isFoodGuide(a.title)) return false;
      return true;
    });

    console.log(`Food guides (SG, 2020-2023): ${filtered.length}`);

    // Group by year
    const byYear = { 2020: [], 2021: [], 2022: [], 2023: [], evergreen: [] };
    filtered.forEach(a => {
      if (a.year >= 2020 && a.year <= 2023) {
        byYear[a.year].push(a);
      } else {
        byYear.evergreen.push(a);
      }
    });

    console.log('\n=== ARTICLES BY YEAR ===');

    for (const year of [2020, 2021, 2022, 2023, 'evergreen']) {
      const yearArticles = byYear[year];
      if (yearArticles.length === 0) continue;
      console.log(`\n--- ${year} (${yearArticles.length} articles) ---`);
      yearArticles.forEach((a, i) => {
        console.log(`${i + 1}. ${a.title}`);
        console.log(`   ${a.url}`);
      });
    }

    // Save to JSON
    fs.writeFileSync('eatbook-articles-2020-2023.json', JSON.stringify(filtered, null, 2));
    console.log('\n\nSaved to eatbook-articles-2020-2023.json');

  } catch (err) {
    console.error('Error:', err);
  }

  await browser.close();
}

main().catch(console.error);
