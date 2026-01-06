const { chromium } = require('playwright');
const fs = require('fs');

async function scrapeParagon() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  console.log('Navigating to Paragon F&B directory...');
  await page.goto('https://paragon.com.sg/store-directory/?store_category=fb', {
    waitUntil: 'networkidle',
    timeout: 60000
  });

  // Wait for content to settle
  console.log('Waiting for content to load...');
  await page.waitForTimeout(3000);

  // Click "Load More" until no more content loads
  let previousCount = 0;
  let loadMoreClicks = 0;
  const MAX_CLICKS = 30;

  while (loadMoreClicks < MAX_CLICKS) {
    // Count current stores
    const currentCount = await page.evaluate(() => {
      return document.querySelectorAll('.paragon-store-archive-loop').length;
    });

    console.log(`Current store count: ${currentCount}`);

    // If count didn't change after last click, we're done
    if (currentCount === previousCount && loadMoreClicks > 0) {
      console.log('No new stores loaded. Done clicking.');
      break;
    }
    previousCount = currentCount;

    // Try to find and click load more using evaluate
    const clicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const loadMoreBtn = buttons.find(b => b.textContent.trim().toLowerCase() === 'load more');
      if (loadMoreBtn) {
        loadMoreBtn.click();
        return true;
      }
      return false;
    });

    if (!clicked) {
      console.log('Load more button not found. All stores loaded.');
      break;
    }

    loadMoreClicks++;
    console.log(`Clicked "Load More" (${loadMoreClicks} times)...`);
    await page.waitForTimeout(2000);
  }

  console.log('\nExtracting store data...');

  // Extract all store data using the correct selectors
  const stores = await page.evaluate(() => {
    const results = [];
    const storeCards = document.querySelectorAll('.paragon-store-archive-loop');

    storeCards.forEach((card) => {
      const titleEl = card.querySelector('.paragon-store-title a');
      const unitEl = card.querySelector('.paragon-store-unit-number');
      const categoryEl = card.querySelector('.paragon-store-category');
      const logoEl = card.querySelector('.paragon-store-logo-link img');

      const name = titleEl?.textContent?.trim();
      const link = titleEl?.href;
      const unit = unitEl?.textContent?.trim();
      const category = categoryEl?.textContent?.trim();
      const logo = logoEl?.src;

      if (name) {
        results.push({
          name,
          unit: unit || null,
          category: category || null,
          link: link || null,
          logo: logo || null
        });
      }
    });

    return results;
  });

  // Filter to only F&B stores
  const fbStores = stores.filter(s =>
    s.category && s.category.toLowerCase().includes('food') ||
    s.category && s.category.toLowerCase().includes('beverage')
  );

  console.log(`Found ${stores.length} total stores, ${fbStores.length} F&B stores.`);

  if (fbStores.length === 0) {
    console.log('No F&B stores found. Saving all stores...');
  }

  const storesToSave = fbStores.length > 0 ? fbStores : stores;

  // Save results
  const output = {
    mall: 'Paragon',
    address: '290 Orchard Road, Singapore 238859',
    nearestMRT: 'Orchard',
    category: 'Food & Beverage',
    scrapedAt: new Date().toISOString(),
    totalStores: storesToSave.length,
    stores: storesToSave
  };

  fs.writeFileSync('paragon-fb-stores.json', JSON.stringify(output, null, 2));
  console.log('Saved to paragon-fb-stores.json');

  // Print preview
  console.log('\nPreview (first 10 stores):');
  storesToSave.slice(0, 10).forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.name} (${s.unit || 'No unit'})`);
  });

  await browser.close();
  console.log('\nDone!');
}

scrapeParagon().catch(console.error);
