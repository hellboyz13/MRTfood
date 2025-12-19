const { chromium } = require('playwright');
const fs = require('fs');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeCompassOne() {
  console.log('Starting Compass One scraper...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });

  const page = await context.newPage();
  const outlets = [];

  try {
    // Get the restaurant page
    console.log('Navigating to Compass One restaurants page...');
    await page.goto('https://www.compassone.sg/store-category/restaurant-cafe-fast-food/', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    await delay(3000);

    // Take screenshot
    await page.screenshot({ path: 'compass-one-debug.png', fullPage: true });

    // Get all store links from the listing
    const storeLinks = await page.evaluate(() => {
      const links = [];
      document.querySelectorAll('a[href*="/store-directory/"]').forEach(a => {
        const href = a.href;
        if (href && !links.includes(href)) {
          links.push(href);
        }
      });
      return links;
    });

    console.log(`Found ${storeLinks.length} store links`);

    // Also get stores from pagination
    for (let pageNum = 2; pageNum <= 5; pageNum++) {
      try {
        await page.goto(`https://www.compassone.sg/store-category/restaurant-cafe-fast-food/page/${pageNum}/`, {
          waitUntil: 'networkidle',
          timeout: 30000
        });
        await delay(1500);

        const moreLinks = await page.evaluate(() => {
          const links = [];
          document.querySelectorAll('a[href*="/store-directory/"]').forEach(a => {
            const href = a.href;
            if (href && !links.includes(href)) {
              links.push(href);
            }
          });
          return links;
        });

        for (const link of moreLinks) {
          if (!storeLinks.includes(link)) {
            storeLinks.push(link);
          }
        }
        console.log(`Page ${pageNum}: found ${moreLinks.length} more links (total: ${storeLinks.length})`);
      } catch (e) {
        console.log(`No page ${pageNum}`);
        break;
      }
    }

    console.log(`Total unique store links: ${storeLinks.length}`);

    // Visit each store page to get unit number
    for (const link of storeLinks) {
      try {
        await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await delay(800);

        const storeData = await page.evaluate(() => {
          // Get store name from title or h1
          const nameEl = document.querySelector('h1, .store-title, .entry-title');
          const name = nameEl?.textContent?.trim() || '';

          // Look for unit number in the page
          const pageText = document.body.textContent || '';
          const unitMatch = pageText.match(/#[B]?\d{1,2}-\d{1,2}[A-Z]?(?:\/\d{1,2}[A-Z]?)?/i);
          const unit = unitMatch ? unitMatch[0] : '';

          // Get thumbnail
          const img = document.querySelector('.store-image img, .featured-image img, article img');
          const thumbnail = img?.src || '';

          return { name, unit, thumbnail };
        });

        if (storeData.name) {
          outlets.push({
            name: storeData.name,
            level: storeData.unit,
            thumbnail_url: storeData.thumbnail,
            mall_id: 'compass-one'
          });
          console.log(`${storeData.name} - ${storeData.unit || 'no unit'}`);
        }
      } catch (e) {
        console.log(`Error fetching ${link}: ${e.message}`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }

  // Save results
  fs.writeFileSync('compass-one-outlets.json', JSON.stringify(outlets, null, 2));
  console.log(`\nSaved ${outlets.length} outlets to compass-one-outlets.json`);

  return outlets;
}

scrapeCompassOne().catch(console.error);
