const { chromium } = require('playwright');
const fs = require('fs');

async function scrapeJem() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  console.log('Navigating to JEM F&B directory...');
  await page.goto('https://www.jem.sg/store-directory/?categories=Food+%26+Beverages', {
    waitUntil: 'networkidle',
    timeout: 60000
  });

  // Wait for content to load
  console.log('Waiting for content to load...');
  await page.waitForTimeout(5000);

  // Wait for initial content

  // Check for Load More button pattern
  let previousCount = 0;
  let loadMoreClicks = 0;
  const MAX_CLICKS = 20;

  while (loadMoreClicks < MAX_CLICKS) {
    // Count current stores
    const currentCount = await page.evaluate(() => {
      // Try various selectors
      const selectors = [
        '.store-card', '.store-item', '[class*="store"]',
        '.tenant-card', '.tenant-item', '[class*="tenant"]',
        '.directory-item', 'article', '.card'
      ];
      for (const sel of selectors) {
        const items = document.querySelectorAll(sel);
        if (items.length > 5) return items.length;
      }
      // Count links to stores
      return document.querySelectorAll('a[href*="/stores/"]').length;
    });

    console.log(`Current store count: ${currentCount}`);

    if (currentCount === previousCount && loadMoreClicks > 0) {
      console.log('No new stores loaded. Done.');
      break;
    }
    previousCount = currentCount;

    // Try to click Load More button
    const clicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a'));
      const loadMoreBtn = buttons.find(b => {
        const text = b.textContent.toLowerCase();
        return text.includes('load more') || text.includes('show more') || text.includes('view more');
      });
      if (loadMoreBtn) {
        loadMoreBtn.click();
        return true;
      }
      return false;
    });

    if (!clicked) {
      console.log('No Load More button found.');
      break;
    }

    loadMoreClicks++;
    console.log(`Clicked "Load More" (${loadMoreClicks} times)...`);
    await page.waitForTimeout(2000);
  }

  console.log('\nExtracting store data...');

  // Extract stores from directory-card elements
  const stores = await page.evaluate(() => {
    const results = [];

    // Use [class*="card"] since that finds 88 elements
    const cards = document.querySelectorAll('[class*="card"]');

    cards.forEach((card) => {
      // Skip if this is not a directory card
      if (!card.className.includes('directory')) return;

      // Get ALL links to store detail page
      const links = card.querySelectorAll('a[href*="/store-directory/"]');
      if (links.length === 0) return;

      // Find the link that has a span with the store name (not the image link)
      let name = null;
      let storeLink = null;

      for (const link of links) {
        const span = link.querySelector('span');
        if (span && span.textContent.trim().length > 2) {
          name = span.textContent.trim();
          storeLink = link.href;
          break;
        }
      }

      // Fallback: get name from image alt attribute
      if (!name) {
        const img = card.querySelector('img');
        if (img && img.alt) {
          name = img.alt.trim();
          storeLink = links[0].href;
        }
      }

      // Skip if still no name
      if (!name || name.length < 2) return;

      // Get the full card text for extracting unit
      const text = card.textContent || '';

      // Get unit number - look for #XX-XX pattern
      const unitMatch = text.match(/#(\d{1,2}-\d{1,3}[A-Z]?(?:\/\d{1,3}[A-Z]?)?)/i);
      const unit = unitMatch ? `#${unitMatch[1]}` : null;

      // Get level from unit (first digit before dash)
      let level = null;
      if (unitMatch) {
        const levelNum = unitMatch[1].split('-')[0];
        if (levelNum.startsWith('0')) {
          level = `Level ${parseInt(levelNum)}`;
        } else if (levelNum.startsWith('B')) {
          level = `Basement ${levelNum.substring(1)}`;
        } else {
          level = `Level ${levelNum}`;
        }
      }

      // Get image (might already have img reference from fallback)
      const imgEl = card.querySelector('img');
      const image = imgEl?.src || imgEl?.getAttribute('data-src');

      // Get category (the span with border-2 class)
      const categorySpan = card.querySelector('.border-2');
      const category = categorySpan?.textContent?.trim() || null;

      // Deduplicate by name
      if (!results.find(r => r.name === name)) {
        results.push({
          name: name.replace(/\s+/g, ' ').trim(),
          unit,
          level,
          category,
          link: storeLink,
          image
        });
      }
    });

    return results;
  });

  console.log(`Found ${stores.length} stores.`);

  if (stores.length === 0) {
    console.log('No stores found. Check debug HTML for structure.');
  }

  // Save results
  const output = {
    mall: 'JEM',
    address: '50 Jurong Gateway Road, Singapore 608549',
    nearestMRT: 'Jurong East',
    category: 'Food & Beverage',
    scrapedAt: new Date().toISOString(),
    totalStores: stores.length,
    stores
  };

  fs.writeFileSync('jem-fb-stores.json', JSON.stringify(output, null, 2));
  console.log('Saved to jem-fb-stores.json');

  // Preview
  console.log('\nPreview (first 15 stores):');
  stores.slice(0, 15).forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.name} (${s.unit || 'No unit'})`);
  });

  await browser.close();
  console.log('\nDone!');
}

scrapeJem().catch(console.error);
