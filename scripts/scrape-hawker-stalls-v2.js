const { chromium } = require('playwright');
const fs = require('fs');

// Food centres to search
const FOOD_CENTRES = [
  'Adam Road Food Centre',
  'Amoy Street Food Centre',
  'Bedok Reservoir Food Centre',
  'Bendemeer Market Food Centre',
  'Blk 50 Hawker Centre',
  'Circuit Road Hawker Centre',
  'Fernvale Hawker Centre',
  'Ghim Moh Market Food Centre',
  'Holland Village Food Centre',
  'Hong Lim Food Centre',
  'Kampung Admiralty Hawker Centre',
  'Kovan 209 Market Food Centre',
  'Maxwell Food Centre',
  'Newton Food Centre',
  'Old Airport Road Food Centre',
  'Our Tampines Hub Hawker',
  'Pek Kio Market Food Centre',
  'Punggol Coast Hawker Centre',
  'Seah Im Food Centre',
  'Sembawang Hills Food Centre',
  'Telok Blangah Food Centre',
  'Tiong Bahru Food Centre',
  'Woodleigh Village Hawker Centre'
];

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function searchEatbook(page, foodCentre) {
  // Simplify name for search
  const searchName = foodCentre.replace(/&/g, '').replace(/\s+/g, ' ').trim();
  const url = `https://eatbook.sg/?s=${encodeURIComponent(searchName)}`;

  console.log(`  Searching Eatbook: ${searchName}`);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await delay(2000);

    // Get article links
    const articles = await page.evaluate(() => {
      const results = [];
      const links = document.querySelectorAll('a[href*="eatbook.sg/"]');

      links.forEach(a => {
        const href = a.href;
        const text = a.textContent || '';
        // Filter to actual article links
        if (href.includes('eatbook.sg/') && !href.includes('?s=') && !href.includes('/page/')) {
          if (text.length > 10 && !results.some(r => r.url === href)) {
            results.push({ url: href, title: text.substring(0, 150) });
          }
        }
      });

      return results.slice(0, 3);
    });

    return articles;
  } catch (err) {
    console.log(`    Error: ${err.message}`);
    return [];
  }
}

async function searchSethLui(page, foodCentre) {
  const searchName = foodCentre.replace(/&/g, '').replace(/\s+/g, ' ').trim();
  const url = `https://sethlui.com/?s=${encodeURIComponent(searchName)}`;

  console.log(`  Searching Seth Lui: ${searchName}`);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await delay(2000);

    const articles = await page.evaluate(() => {
      const results = [];
      const links = document.querySelectorAll('a[href*="sethlui.com/"]');

      links.forEach(a => {
        const href = a.href;
        const text = a.textContent || '';
        if (href.includes('sethlui.com/') && !href.includes('?s=') && href.includes('-')) {
          if (text.length > 10 && !results.some(r => r.url === href)) {
            results.push({ url: href, title: text.substring(0, 150) });
          }
        }
      });

      return results.slice(0, 3);
    });

    return articles;
  } catch (err) {
    console.log(`    Error: ${err.message}`);
    return [];
  }
}

async function extractStallNames(page, url, foodCentre) {
  console.log(`    Fetching article: ${url.substring(0, 70)}...`);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await delay(2000);

    const stalls = await page.evaluate((centreName) => {
      const found = [];
      const centreWords = centreName.toLowerCase().split(/\s+/);

      // Look for headings that are likely stall names
      const headings = document.querySelectorAll('h2, h3, h4');

      headings.forEach(h => {
        let text = h.textContent.trim();

        // Remove numbering like "1.", "2.", etc
        text = text.replace(/^\d+[\.\)]\s*/, '').trim();
        // Remove trailing dashes and extra text
        text = text.split(' – ')[0].split(' - ')[0].trim();

        // Filter criteria
        if (text.length < 3 || text.length > 80) return;

        const textLower = text.toLowerCase();

        // Skip if contains the food centre name
        if (centreWords.some(w => w.length > 3 && textLower.includes(w))) return;

        // Skip common non-stall headings
        const skipPatterns = [
          'address', 'opening', 'location', 'direction', 'price', 'rating',
          'review', 'conclusion', 'summary', 'introduction', 'about', 'related',
          'read also', 'share', 'comment', 'facebook', 'instagram', 'subscribe',
          'best food', 'top food', 'must try', 'food guide', 'what to eat',
          'getting there', 'how to get', 'nearest mrt', 'parking'
        ];

        if (skipPatterns.some(p => textLower.includes(p))) return;

        found.push(text);
      });

      return [...new Set(found)];
    }, foodCentre);

    console.log(`      Found ${stalls.length} stall names`);
    return stalls;

  } catch (err) {
    console.log(`      Error: ${err.message}`);
    return [];
  }
}

async function main() {
  const results = {};

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });
  const page = await context.newPage();

  console.log('='.repeat(60));
  console.log('SCRAPING HAWKER STALLS FROM EATBOOK & SETH LUI');
  console.log('='.repeat(60));

  for (const foodCentre of FOOD_CENTRES) {
    console.log(`\n--- ${foodCentre} ---`);

    results[foodCentre] = {
      articles: [],
      stalls: []
    };

    // Search Eatbook
    const eatbookArticles = await searchEatbook(page, foodCentre);
    results[foodCentre].articles.push(...eatbookArticles.map(a => ({ ...a, source: 'eatbook' })));

    await delay(1500);

    // Search Seth Lui
    const sethArticles = await searchSethLui(page, foodCentre);
    results[foodCentre].articles.push(...sethArticles.map(a => ({ ...a, source: 'sethlui' })));

    console.log(`  Found ${results[foodCentre].articles.length} articles total`);

    // Extract stalls from each article
    for (const article of results[foodCentre].articles) {
      const stalls = await extractStallNames(page, article.url, foodCentre);
      results[foodCentre].stalls.push(...stalls);
      await delay(1500);
    }

    // Dedupe
    results[foodCentre].stalls = [...new Set(results[foodCentre].stalls)];
    console.log(`  Total unique stalls: ${results[foodCentre].stalls.length}`);

    await delay(2000);
  }

  await browser.close();

  // Save results
  fs.writeFileSync('hawker-stalls-results.json', JSON.stringify(results, null, 2));

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));

  let totalStalls = 0;
  for (const [centre, data] of Object.entries(results)) {
    if (data.stalls.length > 0) {
      console.log(`\n${centre} (${data.stalls.length} stalls):`);
      data.stalls.slice(0, 10).forEach(s => console.log(`  - ${s}`));
      if (data.stalls.length > 10) console.log(`  ... and ${data.stalls.length - 10} more`);
      totalStalls += data.stalls.length;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Total stalls found: ${totalStalls}`);
  console.log('Results saved to: hawker-stalls-results.json');
}

main().catch(console.error);
