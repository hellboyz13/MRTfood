const { chromium } = require('playwright');
const fs = require('fs');

async function scrapeTiongBahruPlaza() {
  console.log('Scraping Tiong Bahru Plaza stores...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('https://www.tiongbahruplaza.com.sg/stores', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(5000);

  console.log('Page loaded. Starting to scrape...\n');

  // Get total pages
  const totalPages = await page.evaluate(() => {
    const items = document.querySelectorAll('.pagination .item');
    let maxPage = 1;
    items.forEach(item => {
      const num = parseInt(item.textContent.trim());
      if (!isNaN(num) && num > maxPage) maxPage = num;
    });
    return maxPage;
  });
  console.log(`Total pages: ${totalPages}\n`);

  let allStores = [];
  let pageNum = 1;

  while (pageNum <= totalPages) {
    console.log(`Page ${pageNum}:`);

    // Extract stores from current page
    const pageStores = await page.evaluate(() => {
      const stores = [];
      const items = document.querySelectorAll('.store-listing .item');

      items.forEach(item => {
        // Get store name
        const nameEl = item.querySelector('a.name');
        const name = nameEl ? nameEl.textContent.trim() : '';

        // Get thumbnail
        const img = item.querySelector('a.thumb img');
        let thumbnail = img ? img.getAttribute('src') : '';
        if (thumbnail && !thumbnail.startsWith('http')) {
          thumbnail = 'https://www.tiongbahruplaza.com.sg' + thumbnail;
        }

        // Get level from listing
        const levelEl = item.querySelector('.location .level .text');
        const level = levelEl ? levelEl.textContent.trim() : '';

        // Get detail page URL
        const link = item.querySelector('a.name');
        const detailUrl = link ? link.getAttribute('href') : '';

        if (name && name.length > 0) {
          stores.push({
            name,
            level,
            thumbnail_url: thumbnail,
            detail_url: detailUrl
          });
        }
      });

      return stores;
    });

    console.log(`  Found ${pageStores.length} stores`);
    if (pageStores.length > 0) {
      console.log(`  Sample: ${pageStores[0].name} | ${pageStores[0].level}`);
    }

    allStores = allStores.concat(pageStores);

    // Navigate to next page if not last
    if (pageNum < totalPages) {
      const nextPageNum = pageNum + 1;
      const nextBtn = await page.$(`.pagination .item:has-text("${nextPageNum}")`);
      if (nextBtn) {
        await nextBtn.click();
        await page.waitForTimeout(2000);
      }
    }
    pageNum++;
  }

  console.log(`\n=== Fetching details from individual store pages ===`);
  console.log(`Total stores to process: ${allStores.length}\n`);

  // Visit each store's detail page for unit number and opening hours
  for (let i = 0; i < allStores.length; i++) {
    const store = allStores[i];
    if (store.detail_url) {
      try {
        console.log(`[${i + 1}/${allStores.length}] ${store.name}`);

        // Clean the URL - remove hash fragment
        let cleanUrl = store.detail_url.split('#')[0];
        const detailUrl = cleanUrl.startsWith('http')
          ? cleanUrl
          : 'https://www.tiongbahruplaza.com.sg' + cleanUrl;

        // Debug: print URL for first few stores
        if (i < 3) console.log(`  URL: ${detailUrl}`);

        await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000); // Increased wait time

        // Extract details from detail page
        const details = await page.evaluate(() => {
          const text = document.body.innerText;

          // Get unit number - look for #01-105 or #B1-118 pattern
          const unitMatch = text.match(/#[B0-9]+-[0-9]+(?:\/[0-9]+)?/);
          const unit = unitMatch ? unitMatch[0] : '';

          // Get opening hours - find section between "Opening Hours" and "Directions"
          let openingHours = '';
          const hoursStart = text.indexOf('Opening Hours');
          const hoursEnd = text.indexOf('Directions');
          if (hoursStart > -1 && hoursEnd > hoursStart) {
            let hoursSection = text.substring(hoursStart + 13, hoursEnd).trim();
            // Clean up whitespace
            hoursSection = hoursSection.replace(/\n+/g, '; ').replace(/\s+/g, ' ').trim();
            // Remove leading/trailing semicolons
            hoursSection = hoursSection.replace(/^[;\s]+|[;\s]+$/g, '');
            openingHours = hoursSection;
          }

          // Get category/keywords
          const keywordsMatch = text.match(/Keywords\s*\n?([\s\S]*?)(?:Similar Stores|Contact|$)/i);
          let category = '';
          if (keywordsMatch) {
            category = keywordsMatch[1].trim().split('\n')[0].trim();
          }

          return { unit, openingHours, category };
        });

        // Debug for first few stores
        if (i < 3) {
          console.log(`  Raw unit: "${details.unit}"`);
          console.log(`  Raw hours: "${details.openingHours ? details.openingHours.substring(0, 50) : ''}..."`);
        }

        if (details.unit) {
          store.level = details.unit;
          console.log(`  Unit: ${store.level}`);
        }
        if (details.openingHours) {
          store.opening_hours = details.openingHours;
        }
        if (details.category) {
          store.category = details.category;
        }

      } catch (e) {
        console.log(`  Error: ${e.message}`);
      }
    }
  }

  // Clean up and format final output
  const finalStores = allStores.map(s => ({
    name: s.name,
    level: s.level || '',
    thumbnail_url: s.thumbnail_url || '',
    opening_hours: s.opening_hours || '',
    category: s.category || 'Food & Beverages',
    mall_id: 'tiong-bahru-plaza'
  }));

  // Remove duplicates
  const seen = new Set();
  const uniqueStores = finalStores.filter(s => {
    const key = s.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`\n=== Summary ===`);
  console.log(`Total pages scraped: ${totalPages}`);
  console.log(`Total stores: ${uniqueStores.length}`);

  console.log('\nSample stores:');
  uniqueStores.slice(0, 10).forEach(s => {
    console.log(`  - ${s.name} | ${s.level} | ${s.opening_hours}`);
  });

  // Save to file
  const outputPath = 'tiong-bahru-plaza-outlets.json';
  fs.writeFileSync(outputPath, JSON.stringify(uniqueStores, null, 2));
  console.log(`\n${uniqueStores.length} stores saved to ${outputPath}`);

  await browser.close();
  console.log('Done!');

  return uniqueStores;
}

scrapeTiongBahruPlaza().catch(console.error);
