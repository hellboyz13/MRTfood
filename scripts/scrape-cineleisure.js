const { chromium } = require('playwright');
const fs = require('fs');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeCineleisure() {
  console.log('Starting Cineleisure scraper...');

  const browser = await chromium.launch({
    headless: true
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();
  const outlets = [];

  try {
    console.log('Navigating to Cineleisure directory...');
    await page.goto('https://cineleisure.com.sg/directory/?search_keyword=&f_category=5&f_sortby=', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    await delay(3000);

    // Click "View More" button until all items are loaded
    let loadMoreClicks = 0;
    while (loadMoreClicks < 10) {
      try {
        const viewMoreBtn = await page.$('a.view-more, .view-more, button:has-text("View More"), a:has-text("View More")');
        if (viewMoreBtn) {
          const isVisible = await viewMoreBtn.isVisible();
          if (isVisible) {
            console.log('Clicking View More...');
            await viewMoreBtn.click();
            await delay(2000);
            loadMoreClicks++;
          } else {
            break;
          }
        } else {
          break;
        }
      } catch (e) {
        console.log('No more View More button');
        break;
      }
    }

    console.log(`Clicked View More ${loadMoreClicks} times`);

    // Extract outlet data from the store cards
    const outletData = await page.evaluate(() => {
      const items = [];

      // Select the store card divs - they have class "store-info"
      const storeCards = document.querySelectorAll('.store-listing .store-item, .stores-grid .store-item, .directory-listing .store-item, article.store-item');

      // If that doesn't work, try the parent containers
      let elements = storeCards.length > 0 ? storeCards : document.querySelectorAll('.store-info');

      // Look for the actual store elements based on the screenshot structure
      if (elements.length === 0) {
        // The stores appear to be in a grid with images and info below
        elements = document.querySelectorAll('[class*="store"]');
      }

      console.log(`Found ${elements.length} store elements`);

      elements.forEach(el => {
        // Get name from the title/heading
        const nameEl = el.querySelector('h3, h4, .store-name, .title, a');
        // Get unit/level
        const unitEl = el.querySelector('.unit, .level, .store-level, small, span');
        // Get image
        const imgEl = el.querySelector('img');

        let name = '';
        let unit = '';

        if (nameEl) {
          name = nameEl.textContent?.trim();
        }

        if (unitEl) {
          const unitText = unitEl.textContent?.trim();
          // Look for unit number pattern like #01-01 or B1-01
          const unitMatch = unitText?.match(/#?[B]?\d{1,2}-\d{1,2}/i);
          if (unitMatch) {
            unit = unitMatch[0];
            if (!unit.startsWith('#')) unit = '#' + unit;
          }
        }

        const thumbnail = imgEl?.src || imgEl?.getAttribute('data-src') || '';

        if (name && name.length > 2 && name.length < 80) {
          items.push({ name, unit, thumbnail });
        }
      });

      return items;
    });

    console.log(`Found ${outletData.length} outlets from store elements`);

    // If that didn't work well, try a different approach - look at the visible cards
    if (outletData.length < 5) {
      console.log('Trying alternative extraction...');

      const altData = await page.evaluate(() => {
        const items = [];

        // Look for the store cards in the grid
        // Based on screenshot, stores are in a grid with image on top and name/unit below
        const cards = document.querySelectorAll('.stores-wrapper > div, .directory-grid > div, .store-grid > div');

        cards.forEach(card => {
          const img = card.querySelector('img');
          const textContent = card.textContent;
          const lines = textContent.split('\n').map(l => l.trim()).filter(l => l);

          // First non-empty line is usually the name
          const name = lines.find(l => l.length > 2 && l.length < 50 && !l.startsWith('#'));
          // Look for unit pattern
          const unitLine = lines.find(l => /#?[B]?\d{1,2}-\d{1,2}/i.test(l));
          let unit = '';
          if (unitLine) {
            const match = unitLine.match(/#?[B]?\d{1,2}-\d{1,2}/i);
            if (match) {
              unit = match[0];
              if (!unit.startsWith('#')) unit = '#' + unit;
            }
          }

          if (name) {
            items.push({
              name,
              unit,
              thumbnail: img?.src || ''
            });
          }
        });

        return items;
      });

      for (const item of altData) {
        if (!outlets.some(o => o.name === item.name)) {
          outlets.push({
            name: item.name,
            level: item.unit,
            thumbnail_url: item.thumbnail,
            mall_id: 'cineleisure-orchard'
          });
        }
      }
    }

    // Final approach - get all text that looks like store names with their units
    const finalData = await page.evaluate(() => {
      const items = [];
      const html = document.body.innerHTML;

      // Look for patterns in the page that indicate store info
      // Based on the screenshot, stores have: image, name, unit (like #01-01)

      // Get all divs that contain a unit number
      const allDivs = document.querySelectorAll('div, article, li');

      allDivs.forEach(div => {
        const text = div.textContent?.trim();
        // Check if this div contains a unit number
        if (text && /#[B]?\d{1,2}-\d{1,2}/i.test(text)) {
          // Find the store name - it's usually before the unit number
          const parts = text.split('\n').map(p => p.trim()).filter(p => p);

          for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            // If this part is a unit number
            if (/#[B]?\d{1,2}-\d{1,2}/i.test(part)) {
              // The previous part might be the name
              if (i > 0) {
                const potentialName = parts[i - 1];
                if (potentialName.length > 2 && potentialName.length < 60 && !potentialName.includes('#')) {
                  const unitMatch = part.match(/#[B]?\d{1,2}[-/]\d{1,2}[A-Z]?/i);
                  if (unitMatch) {
                    items.push({
                      name: potentialName,
                      unit: unitMatch[0]
                    });
                  }
                }
              }
            }
          }
        }
      });

      // Dedupe by name
      const seen = new Set();
      return items.filter(item => {
        if (seen.has(item.name)) return false;
        seen.add(item.name);
        return true;
      });
    });

    console.log(`Found ${finalData.length} items with unit numbers`);

    for (const item of finalData) {
      if (!outlets.some(o => o.name === item.name)) {
        outlets.push({
          name: item.name,
          level: item.unit,
          thumbnail_url: '',
          mall_id: 'cineleisure-orchard'
        });
      }
    }

    // If still not many, manually add from screenshot
    if (outlets.length < 5) {
      console.log('Using visible stores from page...');

      // Get all visible store names from specific structure
      const visibleStores = await page.evaluate(() => {
        const stores = [];
        // Try to find store info sections
        document.querySelectorAll('.store-info, .shop-info, .item-info').forEach(info => {
          const name = info.querySelector('h3, h4, .name, a')?.textContent?.trim();
          const unit = info.querySelector('.unit, .level, small')?.textContent?.trim();
          if (name) {
            stores.push({ name, unit: unit || '' });
          }
        });
        return stores;
      });

      for (const store of visibleStores) {
        if (!outlets.some(o => o.name === store.name)) {
          outlets.push({
            name: store.name,
            level: store.unit,
            thumbnail_url: '',
            mall_id: 'cineleisure-orchard'
          });
        }
      }
    }

    // Clean up - remove non-store entries
    const cleanedOutlets = outlets.filter(o => {
      const name = o.name.toLowerCase();
      const nonStores = ['steals', 'deals', 'what\'s on', 'cathay rewards', 'directory', 'about', 'contact', 'categories', 'sort by', 'terms', 'privacy', 'emergency', 'cathay mall', 'cathay organisation', 'residences'];
      return !nonStores.some(ns => name.includes(ns));
    });

    console.log(`Cleaned outlets: ${cleanedOutlets.length}`);

    // Save results
    fs.writeFileSync('cineleisure-outlets.json', JSON.stringify(cleanedOutlets, null, 2));
    console.log(`Saved ${cleanedOutlets.length} outlets to cineleisure-outlets.json`);

    return cleanedOutlets;

  } catch (error) {
    console.error('Scraping error:', error);
  } finally {
    await browser.close();
  }
}

scrapeCineleisure().catch(console.error);
