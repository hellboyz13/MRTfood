const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Sources to scrape for each food centre
const FOOD_CENTRE_SOURCES = {
  'east-coast-lagoon-food-village': [
    'https://eatbook.sg/east-coast-lagoon/',
    'https://sethlui.com/east-coast-lagoon-food-village-food-guide-singapore/'
  ],
  'lau-pa-sat': [
    'https://eatbook.sg/lau-pa-sat/',
    'https://sethlui.com/lau-pa-sat-food-guide-singapore/'
  ],
  'hougang-hainanese-village-centre': [
    'https://sethlui.com/hougang-hainanese-village-centre-food-guide-singapore/',
    'https://eatbook.sg/hainanese-village-food-centre/'
  ],
  'marine-terrace-market': [
    'https://the.fat.guide/singapore/eat/50a-marine-terrace-market/'
  ],
  'bedok-corner-food-centre': [
    'https://sethlui.com/bedok-corner-food-centre-guide-singapore/'
  ],
  'makansutra-gluttons-bay': [
    'https://sethlui.com/esplanade-mall-food-guide-singapore/'
  ],
  'kopitiam-plaza-singapura': [
    'https://eatbook.sg/plaza-singapura-food/',
    'https://sethlui.com/plaza-singapura-food-guide-singapore/'
  ],
  'timbre-plus-eastside': [
    'https://eatbook.sg/timbre-eastside/'
  ],
  'kopitiam-tampines-mall': [
    'https://danielfooddiary.com/2020/11/05/kopitiamtampines/',
    'https://sethlui.com/tampines-mall-food-guide-singapore/'
  ],
  'pacific-plaza': [
    'https://www.fareastmalls.com.sg/pacific-plaza/Shops'
  ]
};

async function scrapeEatbook(page, url) {
  console.log(`  Scraping Eatbook: ${url}`);
  const stalls = [];

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Try different selectors for Eatbook articles
    const content = await page.evaluate(() => {
      const results = [];

      // Look for h2/h3 headings with stall names
      const headings = document.querySelectorAll('h2, h3');
      headings.forEach(h => {
        const text = h.textContent.trim();
        // Skip navigation/meta headings
        if (text.match(/^\d+\.\s/) || text.match(/^[A-Za-z\s&']+(?:–|-)\s/)) {
          const name = text.replace(/^\d+\.\s*/, '').replace(/\s*–.*$/, '').replace(/\s*-.*$/, '').trim();
          if (name.length > 2 && name.length < 100) {
            results.push({ name, source: 'heading' });
          }
        }
      });

      // Look for bold text that might be stall names
      const bolds = document.querySelectorAll('strong, b');
      bolds.forEach(b => {
        const text = b.textContent.trim();
        if (text.length > 3 && text.length < 80 && !text.includes('Address') && !text.includes('Opening')) {
          const parent = b.closest('p');
          if (parent) {
            const parentText = parent.textContent;
            // Check if this looks like a stall introduction
            if (parentText.includes('known for') || parentText.includes('famous for') ||
                parentText.includes('serves') || parentText.includes('offers') ||
                parentText.includes('stall') || parentText.includes('Stall')) {
              results.push({ name: text, source: 'bold' });
            }
          }
        }
      });

      return results;
    });

    // Deduplicate and clean
    const seen = new Set();
    for (const item of content) {
      const cleanName = item.name.replace(/[^\w\s&']/g, '').trim();
      if (cleanName.length > 2 && !seen.has(cleanName.toLowerCase())) {
        seen.add(cleanName.toLowerCase());
        stalls.push({ name: cleanName, unit: null, openingHours: null });
      }
    }
  } catch (err) {
    console.log(`    Error: ${err.message}`);
  }

  return stalls;
}

async function scrapeSethLui(page, url) {
  console.log(`  Scraping SethLui: ${url}`);
  const stalls = [];

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    const content = await page.evaluate(() => {
      const results = [];

      // SethLui uses h2 for stall names
      const headings = document.querySelectorAll('.entry-content h2, .post-content h2, article h2');
      headings.forEach(h => {
        let text = h.textContent.trim();
        // Remove numbering like "1." or "1)"
        text = text.replace(/^\d+[\.\)]\s*/, '');
        // Remove unit numbers like "(#01-23)"
        const unitMatch = text.match(/\(#[\d-]+\)/);
        const unit = unitMatch ? unitMatch[0].replace(/[()]/g, '') : null;
        text = text.replace(/\s*\(#[\d-]+\)/, '').trim();

        if (text.length > 2 && text.length < 100 && !text.match(/^(What|Where|When|How|Best|Top|Guide)/i)) {
          results.push({ name: text, unit });
        }
      });

      // Also look for h3
      const h3s = document.querySelectorAll('.entry-content h3, .post-content h3, article h3');
      h3s.forEach(h => {
        let text = h.textContent.trim();
        text = text.replace(/^\d+[\.\)]\s*/, '');
        const unitMatch = text.match(/\(#[\d-]+\)/);
        const unit = unitMatch ? unitMatch[0].replace(/[()]/g, '') : null;
        text = text.replace(/\s*\(#[\d-]+\)/, '').trim();

        if (text.length > 2 && text.length < 100 && !text.match(/^(What|Where|When|How|Best|Top|Guide)/i)) {
          results.push({ name: text, unit });
        }
      });

      return results;
    });

    const seen = new Set();
    for (const item of content) {
      const cleanName = item.name.replace(/[^\w\s&']/g, '').trim();
      if (cleanName.length > 2 && !seen.has(cleanName.toLowerCase())) {
        seen.add(cleanName.toLowerCase());
        stalls.push({ name: cleanName, unit: item.unit, openingHours: null });
      }
    }
  } catch (err) {
    console.log(`    Error: ${err.message}`);
  }

  return stalls;
}

async function scrapeFatGuide(page, url) {
  console.log(`  Scraping FatGuide: ${url}`);
  const stalls = [];

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    const content = await page.evaluate(() => {
      const results = [];

      // FatGuide has stall listings
      const links = document.querySelectorAll('a[href*="/eat/"]');
      links.forEach(a => {
        const text = a.textContent.trim();
        if (text.length > 2 && text.length < 80) {
          results.push({ name: text });
        }
      });

      // Also check headings
      const headings = document.querySelectorAll('h2, h3, h4');
      headings.forEach(h => {
        const text = h.textContent.trim();
        if (text.length > 2 && text.length < 80) {
          results.push({ name: text });
        }
      });

      return results;
    });

    const seen = new Set();
    for (const item of content) {
      const cleanName = item.name.replace(/[^\w\s&']/g, '').trim();
      if (cleanName.length > 2 && !seen.has(cleanName.toLowerCase())) {
        seen.add(cleanName.toLowerCase());
        stalls.push({ name: cleanName, unit: null, openingHours: null });
      }
    }
  } catch (err) {
    console.log(`    Error: ${err.message}`);
  }

  return stalls;
}

async function scrapeDanielFoodDiary(page, url) {
  console.log(`  Scraping DanielFoodDiary: ${url}`);
  const stalls = [];

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    const content = await page.evaluate(() => {
      const results = [];

      // DanielFoodDiary uses h2/h3 for stall names with unit numbers often in parentheses
      const headings = document.querySelectorAll('h2, h3');
      headings.forEach(h => {
        let text = h.textContent.trim();
        // Extract unit number
        const unitMatch = text.match(/\((?:Stall\s*)?#?([\d-]+)\)/i);
        const unit = unitMatch ? '#' + unitMatch[1] : null;
        text = text.replace(/\s*\([^)]+\)/, '').trim();
        text = text.replace(/^\d+[\.\)]\s*/, '');

        if (text.length > 2 && text.length < 100) {
          results.push({ name: text, unit });
        }
      });

      return results;
    });

    const seen = new Set();
    for (const item of content) {
      const cleanName = item.name.replace(/[^\w\s&']/g, '').trim();
      if (cleanName.length > 2 && !seen.has(cleanName.toLowerCase())) {
        seen.add(cleanName.toLowerCase());
        stalls.push({ name: cleanName, unit: item.unit, openingHours: null });
      }
    }
  } catch (err) {
    console.log(`    Error: ${err.message}`);
  }

  return stalls;
}

async function scrapeFarEastMalls(page, url) {
  console.log(`  Scraping Far East Malls: ${url}`);
  const stalls = [];

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    const content = await page.evaluate(() => {
      const results = [];

      // Look for shop listings
      const shopCards = document.querySelectorAll('.shop-card, .store-item, [class*="shop"], [class*="store"]');
      shopCards.forEach(card => {
        const nameEl = card.querySelector('h2, h3, h4, .shop-name, .store-name, [class*="name"]');
        const unitEl = card.querySelector('.unit, .location, [class*="unit"]');

        if (nameEl) {
          const name = nameEl.textContent.trim();
          const unit = unitEl ? unitEl.textContent.trim() : null;
          if (name.length > 2) {
            results.push({ name, unit });
          }
        }
      });

      // Also try list items
      const listItems = document.querySelectorAll('li');
      listItems.forEach(li => {
        const text = li.textContent.trim();
        if (text.length > 3 && text.length < 80 && !text.includes('Menu') && !text.includes('Home')) {
          results.push({ name: text, unit: null });
        }
      });

      return results;
    });

    const seen = new Set();
    for (const item of content) {
      const cleanName = item.name.replace(/[^\w\s&']/g, '').trim();
      if (cleanName.length > 2 && !seen.has(cleanName.toLowerCase())) {
        seen.add(cleanName.toLowerCase());
        stalls.push({ name: cleanName, unit: item.unit, openingHours: null });
      }
    }
  } catch (err) {
    console.log(`    Error: ${err.message}`);
  }

  return stalls;
}

async function scrapeUrl(page, url) {
  if (url.includes('eatbook.sg')) {
    return await scrapeEatbook(page, url);
  } else if (url.includes('sethlui.com')) {
    return await scrapeSethLui(page, url);
  } else if (url.includes('the.fat.guide')) {
    return await scrapeFatGuide(page, url);
  } else if (url.includes('danielfooddiary.com')) {
    return await scrapeDanielFoodDiary(page, url);
  } else if (url.includes('fareastmalls')) {
    return await scrapeFarEastMalls(page, url);
  }
  return [];
}

async function run() {
  console.log('='.repeat(60));
  console.log('SCRAPING FOOD CENTRE STALLS');
  console.log('='.repeat(60));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  const results = {};

  for (const [centreId, urls] of Object.entries(FOOD_CENTRE_SOURCES)) {
    console.log(`\n--- ${centreId} ---`);
    const allStalls = [];

    for (const url of urls) {
      const stalls = await scrapeUrl(page, url);
      console.log(`    Found ${stalls.length} stalls`);
      allStalls.push(...stalls);
    }

    // Deduplicate across sources
    const seen = new Set();
    const uniqueStalls = [];
    for (const stall of allStalls) {
      const key = stall.name.toLowerCase().replace(/\s+/g, '');
      if (!seen.has(key)) {
        seen.add(key);
        uniqueStalls.push(stall);
      }
    }

    results[centreId] = uniqueStalls;
    console.log(`  Total unique: ${uniqueStalls.length}`);
  }

  await browser.close();

  // Save results
  const outputPath = path.join(__dirname, '..', 'food-centre-stalls.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nSaved to ${outputPath}`);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  let total = 0;
  for (const [centreId, stalls] of Object.entries(results)) {
    console.log(`${centreId}: ${stalls.length} stalls`);
    total += stalls.length;
  }
  console.log(`\nTotal: ${total} stalls`);
}

run().catch(console.error);
