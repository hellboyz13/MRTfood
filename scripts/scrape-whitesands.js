const { chromium } = require('playwright');
const fs = require('fs');

async function scrapeWhiteSands() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  const allStores = new Map();

  // URLs to scrape
  const urls = [
    'https://www.whitesands.com.sg/stores?tag=cafe,fast-food,restaurant',
    'https://www.whitesands.com.sg/stores?tag=halal',
    'https://www.whitesands.com.sg/stores?tag=snacks,quick-bites,drinks'
  ];

  // Non-food keywords to exclude
  const excludeKeywords = [
    'supermarket', 'mart', 'fairprice', 'cold storage', 'giant', 'sheng siong',
    'pharmacy', 'guardian', 'watsons', 'unity',
    'bank', 'atm', 'money', 'remittance',
    'salon', 'barber', 'hair', 'beauty', 'spa', 'nail', 'facial',
    'optical', 'spectacle', 'glasses', 'vision',
    'phone', 'mobile', 'singtel', 'starhub', 'm1',
    'travel', 'insurance',
    'laundry', 'dry clean',
    'pet', 'veterinary',
    'clinic', 'dental', 'medical', 'health',
    'gym', 'fitness'
  ];

  for (const url of urls) {
    console.log(`\n===== Scraping: ${url} =====`);

    let currentPage = 1;
    let hasMorePages = true;

    while (hasMorePages) {
      const pageUrl = currentPage === 1 ? url : `${url}&page=${currentPage}`;
      console.log(`\nPage ${currentPage}: ${pageUrl}`);

      try {
        await page.goto(pageUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });
      } catch (e) {
        console.log(`  Navigation timeout, skipping...`);
        hasMorePages = false;
        continue;
      }

      // Dismiss cookie popup if present
      try {
        await page.click('#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll', { timeout: 3000 });
        console.log('  Dismissed cookie popup');
        await page.waitForTimeout(1000);
      } catch (e) {
        // No popup or already dismissed
      }

      // Wait for content to load
      await page.waitForTimeout(3000);

      // Debug: Save HTML on first page
      if (currentPage === 1 && url === urls[0]) {
        const html = await page.content();
        fs.writeFileSync('whitesands-debug.html', html);
        console.log('Saved debug HTML');
      }

      // Extract stores
      const stores = await page.evaluate(() => {
        const results = [];

        // Look for store links - try multiple patterns
        const storeLinks = document.querySelectorAll('a[href*="/stores/"]');

        storeLinks.forEach((link) => {
          // Skip pagination and filter links
          if (link.href.includes('?tag=') || link.href.includes('&page=')) return;

          const container = link.closest('div') || link;
          const text = container.textContent || '';

          // Get store name from link or container
          let name = link.querySelector('h2, h3, h4, .title, [class*="title"]')?.textContent?.trim();
          if (!name) {
            name = link.textContent?.trim();
          }

          // Get unit number
          const unitMatch = text.match(/#([B]?\d{1,2}-\d{1,3}[A-Z]?)/i);
          const unit = unitMatch ? `#${unitMatch[1]}` : null;

          // Get level
          const levelMatch = text.match(/(Level\s*\d|B\d|L\d)/i);
          const level = levelMatch ? levelMatch[1] : null;

          // Get image
          const img = container.querySelector('img');
          const image = img?.src || img?.getAttribute('data-src');

          // Get link
          const storeLink = link.href;

          if (name && name.length > 2 && !name.includes('View All') && name !== 'Map') {
            results.push({
              name: name.replace(/\s+/g, ' ').trim(),
              unit,
              level,
              link: storeLink,
              image
            });
          }
        });

        return results;
      });

      console.log(`  Found ${stores.length} stores on this page`);

      // Add to map (deduplicate)
      stores.forEach(store => {
        const key = store.name.toLowerCase();
        if (!allStores.has(key)) {
          allStores.set(key, store);
        }
      });

      // Check for pagination
      const paginationInfo = await page.evaluate(() => {
        const pageLinks = document.querySelectorAll('a[href*="&page="]');
        let maxPage = 1;
        let currentPageNum = 1;

        pageLinks.forEach(link => {
          const match = link.href.match(/page=(\d+)/);
          if (match) {
            const num = parseInt(match[1]);
            maxPage = Math.max(maxPage, num);
          }
          if (link.classList.contains('active') || link.getAttribute('aria-current')) {
            const m = link.href.match(/page=(\d+)/);
            if (m) currentPageNum = parseInt(m[1]);
          }
        });

        // Also check for numbered page links
        const numberedLinks = document.querySelectorAll('.pagination a, [class*="pagination"] a');
        numberedLinks.forEach(link => {
          const num = parseInt(link.textContent.trim());
          if (!isNaN(num)) {
            maxPage = Math.max(maxPage, num);
          }
        });

        return { maxPage, currentPageNum };
      });

      if (currentPage < paginationInfo.maxPage) {
        currentPage++;
      } else {
        hasMorePages = false;
      }

      if (currentPage > 10) {
        hasMorePages = false;
      }
    }
  }

  // Convert and filter
  let storesList = Array.from(allStores.values());
  const beforeFilter = storesList.length;

  storesList = storesList.filter(store => {
    const nameLower = (store.name || '').toLowerCase();
    return !excludeKeywords.some(keyword => nameLower.includes(keyword));
  });

  console.log(`\n\nFiltered out ${beforeFilter - storesList.length} non-food stores`);
  console.log(`Total F&B stores: ${storesList.length}`);

  // Save results
  const output = {
    mall: 'White Sands',
    address: '1 Pasir Ris Central Street 3, Singapore 518457',
    nearestMRT: 'Pasir Ris',
    category: 'Food & Beverage',
    scrapedAt: new Date().toISOString(),
    totalStores: storesList.length,
    stores: storesList
  };

  fs.writeFileSync('whitesands-fb-stores.json', JSON.stringify(output, null, 2));
  console.log('Saved to whitesands-fb-stores.json');

  console.log('\nPreview (first 15 stores):');
  storesList.slice(0, 15).forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.name} (${s.unit || 'No unit'})`);
  });

  await browser.close();
  console.log('\nDone!');
}

scrapeWhiteSands().catch(console.error);
