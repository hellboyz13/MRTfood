const { chromium } = require('playwright');
const fs = require('fs');

async function scrapeIONOrchard() {
  console.log('Scraping ION Orchard dining directory...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('https://www.ionorchard.com/en/dine.html', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(5000);

  console.log('Page loaded. Starting to scrape...\n');

  let allStores = [];
  let pageNum = 1;
  const maxPages = 10;

  while (pageNum <= maxPages) {
    console.log(`Page ${pageNum}:`);

    // Extract stores from current page
    const pageStores = await page.evaluate(() => {
      const stores = [];
      const items = document.querySelectorAll('.cmp-dynamic-list-dine-shop-grid-item');

      items.forEach(item => {
        // Get link with store name and unit
        const link = item.closest('a');
        if (!link) return;

        const fullText = link.textContent.trim();
        // Format: "STORE NAME#B4-34" or "STORE NAME#01-15/16" or "STORE NAME#55-01, #56-01"
        // Split on first # to separate name from unit
        const hashIndex = fullText.indexOf('#');

        let name = fullText;
        let unit = '';

        if (hashIndex > 0) {
          name = fullText.substring(0, hashIndex).trim();
          unit = fullText.substring(hashIndex).trim();
        }

        // Get thumbnail
        const img = item.querySelector('img');
        let thumbnail = img ? img.getAttribute('src') : '';
        if (thumbnail && !thumbnail.startsWith('http')) {
          thumbnail = 'https://www.ionorchard.com' + thumbnail;
        }

        // Get detail page URL for later
        const detailUrl = link.getAttribute('href');

        if (name && name.length > 0) {
          stores.push({
            name,
            level: unit,
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

    // Add to collection
    allStores = allStores.concat(pageStores);

    // Check if there's a next page
    const hasNextPage = await page.evaluate(() => {
      const nextArrow = document.querySelector('.cmp-dynamic-list-paginate-item i.ph-caret-right');
      if (!nextArrow) return false;

      // Check if we're on the last page
      const pageItems = document.querySelectorAll('.cmp-dynamic-list-paginate-item');
      const activeItem = document.querySelector('.cmp-dynamic-list-paginate-item.active');
      const lastPageNum = Array.from(pageItems).filter(item => item.textContent.match(/^\d+$/)).pop();

      if (activeItem && lastPageNum) {
        const currentPage = activeItem.textContent.trim();
        const lastPage = lastPageNum.textContent.trim();
        return currentPage !== lastPage;
      }

      return true;
    });

    if (!hasNextPage) {
      console.log('  Last page reached.');
      break;
    }

    // Click next page
    try {
      await page.click('.cmp-dynamic-list-paginate-item i.ph-caret-right');
      await page.waitForTimeout(2000);
      pageNum++;
    } catch (e) {
      console.log(`  Navigation failed: ${e.message}`);
      break;
    }
  }

  // Skip detail page scraping for now - the listing page has all essential info
  console.log(`\n=== Data extraction complete ===`);

  // Clean up and format final output
  const finalStores = allStores.map(s => ({
    name: s.name,
    level: s.level || '',
    thumbnail_url: s.thumbnail_url || '',
    opening_hours: s.opening_hours || '',
    category: s.category || 'Food & Beverages',
    mall_id: 'ion-orchard'
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
  console.log(`Total pages scraped: ${pageNum}`);
  console.log(`Total stores: ${uniqueStores.length}`);

  console.log('\nSample stores:');
  uniqueStores.slice(0, 10).forEach(s => {
    console.log(`  - ${s.name} | ${s.level} | ${s.opening_hours}`);
  });

  // Save to file
  const outputPath = 'ion-orchard-outlets.json';
  fs.writeFileSync(outputPath, JSON.stringify(uniqueStores, null, 2));
  console.log(`\n${uniqueStores.length} stores saved to ${outputPath}`);

  await browser.close();
  console.log('Done!');

  return uniqueStores;
}

scrapeIONOrchard().catch(console.error);
