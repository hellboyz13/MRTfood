const { chromium } = require('playwright');
const fs = require('fs');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeCentrepoint() {
  console.log('Starting The Centrepoint scraper...');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 100
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();
  const outlets = [];

  try {
    console.log('Navigating to The Centrepoint eat page...');
    await page.goto('https://www.thecentrepoint.com.sg/content/frasersexperience/tcp/en/eat.html', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await delay(5000);

    // Take debug screenshot
    await page.screenshot({ path: 'centrepoint-debug.png', fullPage: true });
    console.log('Saved debug screenshot');

    // Save HTML for debugging
    const html = await page.content();
    fs.writeFileSync('centrepoint-debug.html', html);
    console.log('Saved debug HTML');

    // Try various selectors for store cards
    const selectors = [
      '.store-card',
      '.store-item',
      '.tenant-card',
      '.outlet-card',
      '[class*="store"]',
      '[class*="tenant"]',
      '[class*="card"]',
      '.listing-item',
      'article',
      '.grid-item',
      '.directory-item'
    ];

    for (const selector of selectors) {
      const elements = await page.$$(selector);
      console.log(`Selector "${selector}": found ${elements.length} elements`);
    }

    // Look for restaurant links
    const links = await page.$$eval('a', links =>
      links.map(a => ({
        href: a.href,
        text: a.textContent?.trim()
      })).filter(l => l.text && l.text.length > 2)
    );

    console.log('\nFound links:');
    links.slice(0, 50).forEach(l => console.log(`  ${l.text} -> ${l.href}`));

    // Try to find store tiles/cards with various patterns
    const storeData = await page.evaluate(() => {
      const stores = [];

      // Look for elements with store names and unit info
      const allElements = document.querySelectorAll('*');
      allElements.forEach(el => {
        const text = el.textContent || '';
        // Look for unit number patterns
        const unitMatch = text.match(/#\d{2}-\d{2,3}/);
        if (unitMatch && text.length < 500) {
          stores.push({
            text: text.trim().substring(0, 200),
            unit: unitMatch[0]
          });
        }
      });

      return stores;
    });

    console.log('\nElements with unit numbers:');
    storeData.forEach(s => console.log(`  ${s.unit}: ${s.text.substring(0, 100)}...`));

    // Try clicking on stores to get details
    const storeLinks = await page.$$('a[href*="/eat/"], a[href*="/store/"], a[href*="/tenant/"]');
    console.log(`\nFound ${storeLinks.length} store links`);

    for (const link of storeLinks.slice(0, 30)) {
      try {
        const href = await link.getAttribute('href');
        const text = await link.textContent();
        if (href && !href.includes('#') && text) {
          console.log(`Store: ${text?.trim()} -> ${href}`);
        }
      } catch (e) {}
    }

  } catch (error) {
    console.error('Scraping error:', error);
  } finally {
    await browser.close();
  }

  return outlets;
}

scrapeCentrepoint().catch(console.error);
