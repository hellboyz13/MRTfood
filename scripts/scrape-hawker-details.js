const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Article URLs for each hawker centre
const HAWKER_ARTICLES = {
  'Maxwell Food Centre': 'https://eatbook.sg/maxwell-food-centre-guide/',
  'Tiong Bahru Market': 'https://eatbook.sg/tiong-bahru-market/',
  'Old Airport Road Food Centre': 'https://eatbook.sg/old-airport-road-food/',
  'Amoy Street Food Centre': 'https://eatbook.sg/amoy-street-food-centre/',
  'Adam Road Food Centre': 'https://eatbook.sg/adam-road-food/',
  'Hong Lim Food Centre': 'https://eatbook.sg/hong-lim-food/',
  'Newton Food Centre': 'https://eatbook.sg/newton-food-centre/',
  'Chinatown Complex Food Centre': 'https://eatbook.sg/chinatown-complex-food/',
  'Ghim Moh Market Food Centre': 'https://eatbook.sg/ghim-moh-food/',
  'Holland Village Food Centre': 'https://eatbook.sg/holland-village-food-centre/',
  'Pek Kio Market Food Centre': 'https://eatbook.sg/pek-kio-food/',
  'Seah Im Food Centre': 'https://eatbook.sg/seah-im-food-centre/',
  'Sembawang Hills Food Centre': 'https://eatbook.sg/sembawang-hills-food/',
  'Telok Blangah Crescent Food Centre': 'https://eatbook.sg/telok-blangah-crescent-food/',
  'Woodleigh Village Hawker Centre': 'https://eatbook.sg/woodleigh-village-hawker-centre-guide/',
  'Kampung Admiralty Hawker Centre': 'https://eatbook.sg/kampung-admiralty-hawker-centre/',
  'Kovan 209 Market Food Centre': 'https://eatbook.sg/kovan-market/',
  'Bedok Interchange Hawker Centre': 'https://eatbook.sg/bedok-interchange-hawker/',
  'Fernvale Hawker Centre': 'https://sethlui.com/fernvale-hawker-centre-guide-singapore/',
  'Our Tampines Hub Hawker': 'https://sethlui.com/our-tampines-hub-hawker-centre-singapore/',
  'Bendemeer Market Food Centre': 'https://sethlui.com/bendemeer-market-and-food-centre-singapore/',
  'Circuit Road Hawker Centre': 'https://sethlui.com/circuit-road-hawker-centre-singapore/',
  'Punggol Coast Hawker Centre': 'https://sethlui.com/punggol-coast-hawker-centre-food-guide-singapore/'
};

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeArticle(page, url, hawkerName) {
  console.log(`\nScraping: ${hawkerName}`);
  console.log(`URL: ${url}`);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await delay(2000);

    // Extract stall details from the page
    const stallDetails = await page.evaluate(() => {
      const stalls = [];
      const content = document.body.innerText;

      // Find all headings that might be stall names
      const headings = document.querySelectorAll('h2, h3');

      headings.forEach(h => {
        let stallName = h.textContent.trim();
        // Remove numbering
        stallName = stallName.replace(/^\d+[\.\)\-]\s*/, '').trim();
        stallName = stallName.split(' – ')[0].split(' - ')[0].trim();

        if (stallName.length < 3 || stallName.length > 80) return;

        // Look for details in the next siblings
        let currentEl = h.nextElementSibling;
        let details = {
          name: stallName,
          unit: null,
          openingHours: null
        };

        // Search through next 5 siblings for details
        let searchCount = 0;
        while (currentEl && searchCount < 8) {
          const text = currentEl.textContent || '';

          // Look for unit number patterns
          const unitMatch = text.match(/#\d{1,2}[-–]\d{1,3}/i) ||
                           text.match(/Stall\s*#?\s*\d+/i) ||
                           text.match(/Unit\s*#?\s*\d+[-–]?\d*/i) ||
                           text.match(/(?:located at|address)[:\s]*#?\d{1,2}[-–]\d{1,3}/i);
          if (unitMatch && !details.unit) {
            details.unit = unitMatch[0].replace(/^(located at|address)[:\s]*/i, '').trim();
          }

          // Look for opening hours patterns
          const hoursMatch = text.match(/(?:open(?:ing)?|hours?)[:\s]*([^.]+(?:am|pm)[^.]*(?:am|pm)?)/i) ||
                            text.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)\s*(?:to|–|-)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm))/i) ||
                            text.match(/((?:mon|tue|wed|thu|fri|sat|sun)[a-z]*\s*(?:to|–|-)\s*(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*\s+\d{1,2}(?::\d{2})?\s*(?:am|pm))/i);
          if (hoursMatch && !details.openingHours) {
            details.openingHours = hoursMatch[1] || hoursMatch[0];
            details.openingHours = details.openingHours.replace(/^(?:open(?:ing)?|hours?)[:\s]*/i, '').trim();
          }

          currentEl = currentEl.nextElementSibling;
          searchCount++;
        }

        if (details.name) {
          stalls.push(details);
        }
      });

      return stalls;
    });

    console.log(`  Found ${stallDetails.length} stalls with details`);
    stallDetails.forEach(s => {
      if (s.unit || s.openingHours) {
        console.log(`    - ${s.name}: Unit=${s.unit || 'N/A'}, Hours=${s.openingHours || 'N/A'}`);
      }
    });

    return stallDetails;

  } catch (err) {
    console.log(`  Error: ${err.message}`);
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
  console.log('SCRAPING HAWKER STALL DETAILS (UNIT & HOURS)');
  console.log('='.repeat(60));

  for (const [hawkerName, url] of Object.entries(HAWKER_ARTICLES)) {
    const details = await scrapeArticle(page, url, hawkerName);
    results[hawkerName] = details;
    await delay(2000);
  }

  await browser.close();

  // Save results
  fs.writeFileSync(
    path.join(__dirname, '..', 'hawker-stall-details.json'),
    JSON.stringify(results, null, 2)
  );

  // Count stats
  let totalStalls = 0;
  let withUnit = 0;
  let withHours = 0;

  for (const stalls of Object.values(results)) {
    totalStalls += stalls.length;
    withUnit += stalls.filter(s => s.unit).length;
    withHours += stalls.filter(s => s.openingHours).length;
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total stalls scraped: ${totalStalls}`);
  console.log(`With unit number: ${withUnit}`);
  console.log(`With opening hours: ${withHours}`);
  console.log('\nResults saved to: hawker-stall-details.json');
}

main().catch(console.error);
