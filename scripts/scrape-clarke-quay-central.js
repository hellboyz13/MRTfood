const { chromium } = require('playwright');
const fs = require('fs');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeClarkeQuayCentral() {
  console.log('Starting Clarke Quay Central scraper...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });

  const page = await context.newPage();
  const outlets = [];

  try {
    // First get the F&B category page
    console.log('Navigating to Clarke Quay Central shops page...');
    await page.goto('https://www.fareastmalls.com.sg/en/clarke-quay-central/shops?s=&category=Food+%26+Beverage', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    await delay(3000);

    // Accept cookies if present
    try {
      const acceptBtn = await page.$('button:has-text("I accept"), button:has-text("Accept")');
      if (acceptBtn) {
        await acceptBtn.click();
        await delay(1000);
      }
    } catch (e) {}

    // Click Load More until all loaded
    let loadMoreClicks = 0;
    while (loadMoreClicks < 30) {
      try {
        const loadMoreBtn = await page.$('button:has-text("Load More"), a:has-text("Load More"), .load-more, [class*="load-more"]');
        if (loadMoreBtn) {
          const isVisible = await loadMoreBtn.isVisible();
          if (isVisible) {
            console.log('Clicking Load More...');
            await loadMoreBtn.click();
            await delay(1500);
            loadMoreClicks++;
          } else {
            break;
          }
        } else {
          break;
        }
      } catch (e) {
        break;
      }
    }

    console.log(`Clicked Load More ${loadMoreClicks} times`);

    // Take screenshot
    await page.screenshot({ path: 'clarke-quay-central-debug.png', fullPage: true });

    // Extract store data - looking at the structure from screenshot
    // Each store card has: image, name, unit number, category
    const storeData = await page.evaluate(() => {
      const stores = [];

      // The stores appear to be in a grid with cards
      // Each card has store name and unit number like #01-31
      const cards = document.querySelectorAll('div, article, li');

      cards.forEach(card => {
        const text = card.textContent || '';

        // Look for unit number pattern
        const unitMatch = text.match(/#[B]?\d{1,2}-\d{1,2}[A-Z]?(?:\s*(?:to|\/)\s*\d{1,2})?/i);

        if (unitMatch) {
          // Check if this is a Food & Beverage item
          if (text.includes('Food & Beverage') || text.includes('Restaurants') || text.includes('Food Kiosks') || text.includes('Cafes')) {
            // Find the store name - it should be nearby
            const lines = text.split('\n').map(l => l.trim()).filter(l => l && l.length > 1);

            // Find the line that's likely the name (before the unit number)
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              // Skip if it contains unit number or category
              if (/#[B]?\d/.test(line) || line.includes('Food & Beverage') || line.includes('Restaurants') || line.includes('Food Kiosks') || line.includes('Cafes') || line.includes('Light Bites')) {
                continue;
              }
              // Check if this could be a store name (reasonable length, not navigation)
              if (line.length > 2 && line.length < 60) {
                const name = line;
                const unit = unitMatch[0];

                // Check we haven't already added this
                if (!stores.some(s => s.name === name && s.unit === unit)) {
                  stores.push({ name, unit });
                }
                break;
              }
            }
          }
        }
      });

      // Deduplicate
      const seen = new Set();
      return stores.filter(s => {
        const key = s.name + s.unit;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    });

    console.log(`Found ${storeData.length} F&B stores`);

    for (const store of storeData) {
      outlets.push({
        name: store.name,
        level: store.unit,
        thumbnail_url: '',
        mall_id: 'clarke-quay-central'
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }

  // Save results
  fs.writeFileSync('clarke-quay-central-outlets.json', JSON.stringify(outlets, null, 2));
  console.log(`Saved ${outlets.length} outlets`);

  // Print them
  outlets.forEach(o => console.log(`${o.name} - ${o.level}`));

  return outlets;
}

scrapeClarkeQuayCentral().catch(console.error);
