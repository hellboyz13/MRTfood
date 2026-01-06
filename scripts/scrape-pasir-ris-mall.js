const { chromium } = require('playwright');
const fs = require('fs');

async function scrapePasirRisMall() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  const allStores = [];
  let currentPage = 1;

  console.log('Navigating to Pasir Ris Mall dining directory...');
  await page.goto('https://pasirrismall.com.sg/dine/', {
    waitUntil: 'networkidle',
    timeout: 60000
  });

  await page.waitForTimeout(3000);

  // Debug: Save first page HTML
  const html = await page.content();
  fs.writeFileSync('pasir-ris-debug.html', html);
  console.log('Saved debug HTML');

  // Get total pages from pagination - look for all links with page numbers
  const paginationInfo = await page.evaluate(() => {
    // Find all anchor tags that contain page numbers
    const allLinks = Array.from(document.querySelectorAll('a'));
    const pageLinks = allLinks.filter(a => {
      const href = a.href || '';
      return href.includes('/page/') || /^\d+$/.test(a.textContent.trim());
    });

    const pages = [];
    pageLinks.forEach(link => {
      const href = link.href;
      const match = href.match(/\/page\/(\d+)/);
      if (match) {
        pages.push(parseInt(match[1]));
      }
      const textNum = parseInt(link.textContent.trim());
      if (!isNaN(textNum)) {
        pages.push(textNum);
      }
    });

    return {
      maxPage: pages.length > 0 ? Math.max(...pages) : 1,
      foundPages: [...new Set(pages)].sort((a, b) => a - b)
    };
  });

  const totalPages = paginationInfo.maxPage;
  console.log(`Found pagination: ${paginationInfo.foundPages.join(', ')} (max: ${totalPages})`);

  // Function to extract stores from current page
  async function extractStores() {
    return await page.evaluate(() => {
      const results = [];

      // Look for links to shop detail pages (not /store/ but /shop/)
      const shopLinks = document.querySelectorAll('a[href*="/shop/"]');

      shopLinks.forEach((link) => {
        // Skip non-shop links (like google play store)
        if (link.href.includes('play.google.com') || link.href.includes('apps.apple.com')) {
          return;
        }

        // Get container (the link itself contains the card structure)
        const container = link;
        const text = container.textContent || '';

        // Extract store name from .shoptitle
        const titleEl = container.querySelector('.shoptitle');
        let name = titleEl?.textContent?.trim();

        // Extract unit number
        const unitMatch = text.match(/#([B]?\d{1,2}-\d{1,3}[A-Z]?)/i);
        const unit = unitMatch ? `#${unitMatch[1]}` : null;

        // Extract level
        const levelMatch = text.match(/(Level\s*\d|B\d)/i);
        const level = levelMatch ? levelMatch[1] : null;

        // Extract category - look for category text
        const categories = ['Bistros', 'Cafes', 'Casual Dining', 'Confectionery', 'Deli', 'Specialty Food',
          'Restaurants', 'Fast Food', 'Food Court', 'Bakery', 'Desserts', 'Beverages'];
        let category = null;
        for (const cat of categories) {
          if (text.includes(cat)) {
            category = cat;
            break;
          }
        }

        // Get link
        const storeLink = link.href;

        // Get image from .shopimage img
        const img = container.querySelector('.shopimage img');
        const image = img?.src;

        if (name && name.length > 2) {
          name = name.replace(/\s+/g, ' ').trim();
          // Avoid duplicates
          if (!results.find(r => r.name === name)) {
            results.push({
              name,
              unit,
              level,
              category,
              link: storeLink,
              image
            });
          }
        }
      });

      return results;
    });
  }

  // Scrape each page
  while (currentPage <= totalPages) {
    console.log(`\nScraping page ${currentPage}/${totalPages}...`);

    const stores = await extractStores();
    console.log(`  Found ${stores.length} stores on this page.`);

    // Add to all stores (avoid duplicates)
    stores.forEach(store => {
      if (!allStores.find(s => s.name === store.name && s.unit === store.unit)) {
        allStores.push(store);
      }
    });

    // Go to next page if not last
    if (currentPage < totalPages) {
      currentPage++;
      const nextUrl = `https://pasirrismall.com.sg/dine/page/${currentPage}/`;
      console.log(`  Navigating to page ${currentPage}...`);
      await page.goto(nextUrl, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForTimeout(1500);
    } else {
      break;
    }
  }

  console.log(`\n\nTotal stores scraped: ${allStores.length}`);

  // Save results
  const output = {
    mall: 'Pasir Ris Mall',
    address: '1 Pasir Ris Central Street 3, Singapore 518457',
    nearestMRT: 'Pasir Ris',
    category: 'Food & Beverage',
    scrapedAt: new Date().toISOString(),
    totalStores: allStores.length,
    stores: allStores
  };

  fs.writeFileSync('pasir-ris-mall-fb-stores.json', JSON.stringify(output, null, 2));
  console.log('Saved to pasir-ris-mall-fb-stores.json');

  // Print preview
  console.log('\nPreview (first 10 stores):');
  allStores.slice(0, 10).forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.name} (${s.unit || 'No unit'})`);
  });

  await browser.close();
  console.log('\nDone!');
}

scrapePasirRisMall().catch(console.error);
