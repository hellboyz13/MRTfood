const { chromium } = require('playwright');
const fs = require('fs');

// Food centres to search
const FOOD_CENTRES = [
  'Adam Road Food Centre',
  'Amoy Street Food Centre',
  'Bedok Reservoir Food Centre',
  'Bendemeer Market & Food Centre',
  'Blk 50 Hawker Centre',
  'Circuit Road Hawker Centre',
  'Fernvale Hawker Centre & Market',
  'Ghim Moh Market & Food Centre',
  'Holland Village Market & Food Centre',
  'Hong Lim Market & Food Centre',
  'Kampung Admiralty Hawker Centre',
  'Kovan 209 Market & Food Centre',
  'Maxwell Food Centre',
  'Newton Food Centre',
  'Old Airport Road Food Centre',
  'Our Tampines Hub Hawker',
  'Pek Kio Market & Food Centre',
  'Punggol Coast Hawker Centre',
  'Seah Im Food Centre',
  'Sembawang Hills Food Centre',
  'Telok Blangah Food Centre',
  'Tiong Bahru Food Centre',
  'Woodleigh Village Hawker Centre'
];

// Trusted sources
const TRUSTED_SOURCES = ['eatbook.sg', 'sethlui.com', 'misstamchiak.com', 'danielfooddiary.com'];

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function searchFoodCentre(page, foodCentre) {
  const query = `${foodCentre} stalls`;
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

  console.log(`\n--- Searching: ${foodCentre} ---`);

  try {
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await delay(2000);

    // Get all search result links
    const results = await page.evaluate((sources) => {
      const links = [];
      const anchors = document.querySelectorAll('a[href]');

      anchors.forEach(a => {
        const href = a.href;
        const text = a.textContent || '';

        // Check if from trusted source
        if (sources.some(s => href.includes(s))) {
          // Extract actual URL from Google redirect
          let actualUrl = href;
          if (href.includes('/url?q=')) {
            const match = href.match(/\/url\?q=([^&]+)/);
            if (match) actualUrl = decodeURIComponent(match[1]);
          }

          if (!links.some(l => l.url === actualUrl)) {
            links.push({
              url: actualUrl,
              title: text.substring(0, 200),
              source: sources.find(s => actualUrl.includes(s))
            });
          }
        }
      });

      return links.slice(0, 3); // Top 3 results
    }, TRUSTED_SOURCES);

    console.log(`  Found ${results.length} trusted source(s)`);
    results.forEach(r => console.log(`    - ${r.source}: ${r.url.substring(0, 80)}...`));

    return results;

  } catch (err) {
    console.log(`  Error: ${err.message}`);
    return [];
  }
}

async function extractStallsFromPage(page, url, foodCentre) {
  console.log(`  Fetching: ${url.substring(0, 60)}...`);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await delay(2000);

    // Extract stall names from the page
    const stalls = await page.evaluate((centreName) => {
      const found = [];
      const centreNameLower = centreName.toLowerCase();

      // Look for headings (h2, h3, h4) that might be stall names
      const headings = document.querySelectorAll('h2, h3, h4, strong, b');

      headings.forEach(h => {
        const text = h.textContent.trim();

        // Filter: should be a reasonable stall name
        if (text.length > 2 && text.length < 100) {
          // Skip if it's just the food centre name
          if (text.toLowerCase().includes(centreNameLower)) return;
          // Skip common non-stall headings
          if (text.match(/^(address|opening hours|location|how to get|directions|map|price|rating|review|conclusion|summary|introduction|about|related|read also|you may|share|comment|facebook|instagram|twitter)/i)) return;
          // Skip numbered lists like "1.", "2."
          const cleaned = text.replace(/^\d+\.\s*/, '').trim();
          if (cleaned.length > 2 && cleaned.length < 80) {
            // Likely a stall name if it contains food words or is a proper noun
            found.push(cleaned);
          }
        }
      });

      // Dedupe
      return [...new Set(found)];
    }, foodCentre);

    console.log(`    Extracted ${stalls.length} potential stall names`);
    return stalls;

  } catch (err) {
    console.log(`    Error fetching page: ${err.message}`);
    return [];
  }
}

async function main() {
  const results = {};

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  console.log('='.repeat(60));
  console.log('SCRAPING HAWKER STALLS FROM TRUSTED SOURCES');
  console.log('='.repeat(60));
  console.log(`Food centres to search: ${FOOD_CENTRES.length}`);
  console.log(`Trusted sources: ${TRUSTED_SOURCES.join(', ')}`);

  for (const foodCentre of FOOD_CENTRES) {
    results[foodCentre] = {
      sources: [],
      stalls: []
    };

    // Search Google for articles
    const searchResults = await searchFoodCentre(page, foodCentre);
    results[foodCentre].sources = searchResults;

    // Extract stalls from each article
    for (const result of searchResults) {
      const stalls = await extractStallsFromPage(page, result.url, foodCentre);
      results[foodCentre].stalls.push(...stalls);
      await delay(1500); // Be nice to servers
    }

    // Dedupe stalls
    results[foodCentre].stalls = [...new Set(results[foodCentre].stalls)];

    console.log(`  Total unique stalls found: ${results[foodCentre].stalls.length}`);

    await delay(2000); // Delay between searches to avoid rate limiting
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
    console.log(`\n${centre}:`);
    console.log(`  Sources found: ${data.sources.length}`);
    console.log(`  Stalls found: ${data.stalls.length}`);
    if (data.stalls.length > 0) {
      console.log(`  Sample stalls: ${data.stalls.slice(0, 5).join(', ')}...`);
    }
    totalStalls += data.stalls.length;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Total stalls found across all centres: ${totalStalls}`);
  console.log('Results saved to: hawker-stalls-results.json');
}

main().catch(console.error);
