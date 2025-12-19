const { chromium } = require('playwright');
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MALL_ID = 'tiong-bahru-plaza';

// Captured stores will be populated via network interception
let capturedStores = [];

function getCategory(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('coffee') || nameLower.includes('cafe') || nameLower.includes('café') ||
      nameLower.includes('starbucks') || nameLower.includes('toast') || nameLower.includes('ya kun')) {
    return 'cafe, food';
  }
  if (nameLower.includes('bakery') || nameLower.includes('bread') || nameLower.includes('cake') ||
      nameLower.includes('donut') || nameLower.includes('croissant')) {
    return 'bakery, food';
  }
  if (nameLower.includes('mcdonald') || nameLower.includes('kfc') || nameLower.includes('burger') ||
      nameLower.includes('subway') || nameLower.includes('jollibee') || nameLower.includes('popeyes') ||
      nameLower.includes('wingstop') || nameLower.includes('texas chicken')) {
    return 'fast food, food';
  }
  if (nameLower.includes('sushi') || nameLower.includes('ramen') || nameLower.includes('japanese') ||
      nameLower.includes('don') || nameLower.includes('udon') || nameLower.includes('genki')) {
    return 'japanese, food';
  }
  if (nameLower.includes('korean') || nameLower.includes('bibim') || nameLower.includes('bbq')) {
    return 'korean, food';
  }
  if (nameLower.includes('chinese') || nameLower.includes('dim sum') || nameLower.includes('hotpot') ||
      nameLower.includes('putien') || nameLower.includes('crystal jade')) {
    return 'chinese, food';
  }
  if (nameLower.includes('thai')) {
    return 'thai, food';
  }
  if (nameLower.includes('bar') || nameLower.includes('pub') || nameLower.includes('beer')) {
    return 'bar, food';
  }

  return 'restaurant, food';
}

function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-tbp';
}

async function scrapeTiongBahruPlaza() {
  console.log('=== SCRAPING TIONG BAHRU PLAZA ===\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const allStores = [];

  // Intercept network requests to capture store data from API
  page.on('response', async (response) => {
    const url = response.url();
    // Look for store listing API responses
    if (url.includes('/graphql') || url.includes('/api/') || url.includes('stores') || url.includes('store-listing')) {
      try {
        const contentType = response.headers()['content-type'] || '';
        if (contentType.includes('json')) {
          const json = await response.json();
          // Check if this is store data
          if (json.data?.stores || json.stores || Array.isArray(json)) {
            const stores = json.data?.stores || json.stores || json;
            console.log(`Intercepted API with ${stores.length} stores`);
            if (Array.isArray(stores)) {
              stores.forEach(s => {
                if (s.storeName || s.name) {
                  capturedStores.push({
                    name: s.storeName || s.name,
                    level: s.unit || s.level || '',
                    imageUrl: s.imageUrl || s.image || s.logo || null
                  });
                }
              });
            }
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  });

  try {
    // Try the stores page first (from mall-directory-urls.csv)
    console.log('Loading: https://tiongbahruplaza.com.sg/stores');
    await page.goto('https://tiongbahruplaza.com.sg/stores', {
      waitUntil: 'domcontentloaded',
      timeout: 90000
    });

    // Wait longer for dynamic content to load and API calls to complete
    console.log('Waiting for dynamic content and API calls...');
    await page.waitForTimeout(15000);

    // Scroll to load all content
    console.log('Scrolling to load content...');
    for (let i = 0; i < 50; i++) {
      await page.evaluate(() => window.scrollBy(0, 800));
      await page.waitForTimeout(400);

      // Every 10 scrolls, wait longer for API calls
      if (i % 10 === 9) {
        await page.waitForTimeout(2000);
        console.log(`Scrolled ${i + 1} times, ${capturedStores.length} stores captured`);
      }
    }
    await page.waitForTimeout(5000);

    // Try clicking "Load More" or "View All" buttons multiple times
    console.log('Looking for Load More buttons...');
    try {
      for (let i = 0; i < 20; i++) {
        const loadMore = await page.$('button:has-text("Load More"), button:has-text("View All"), a:has-text("Load More"), .load-more-btn, [class*="load-more"], button:has-text("Show More"), [class*="showMore"]');
        if (loadMore) {
          await loadMore.click();
          await page.waitForTimeout(3000);
          console.log(`Clicked Load More (${i + 1}), ${capturedStores.length} stores captured`);
        } else {
          break;
        }
      }
    } catch (e) {}

    // Scroll more after clicking load more
    for (let i = 0; i < 30; i++) {
      await page.evaluate(() => window.scrollBy(0, 800));
      await page.waitForTimeout(300);
    }
    await page.waitForTimeout(3000);

    // Wait for store cards to load - Fraser's Experience uses React components
    try {
      await page.waitForSelector('.cmp-store-card, .store-card, [class*="StoreCard"]', { timeout: 15000 });
      console.log('Store cards loaded');
    } catch (e) {
      console.log('Store cards selector not found, continuing anyway');
    }

    // Extract stores - Fraser's Experience uses a specific structure
    let stores = await page.evaluate(() => {
      const results = [];

      // Fraser's Experience mall websites use .cmp-store-card structure
      document.querySelectorAll('.cmp-store-card, .store-card, [class*="StoreCard"]').forEach(el => {
        // Name is usually in a .cmp-store-card__name or similar
        const nameEl = el.querySelector('.cmp-store-card__name, .store-card__name, [class*="name"], h3, h4');
        const name = nameEl?.textContent?.trim();

        const img = el.querySelector('img');
        let imgUrl = img?.src || img?.getAttribute('data-src') || img?.getAttribute('data-lazy-src');

        const levelEl = el.querySelector('.cmp-store-card__unit, .store-card__unit, [class*="unit"], [class*="level"]');
        const level = levelEl?.textContent?.trim() || '';

        if (name && name.length > 2 && name.length < 100) {
          results.push({ name, level, imageUrl: imgUrl || null });
        }
      });

      // If no store cards found, try the listing container
      if (results.length < 5) {
        document.querySelectorAll('[data-component="store-listing"] .cmp-store-listing__item, .store-listing__item').forEach(el => {
          const nameEl = el.querySelector('[class*="name"], h3, h4, a');
          const name = nameEl?.textContent?.trim();
          const img = el.querySelector('img');
          let imgUrl = img?.src || img?.getAttribute('data-src');

          if (name && name.length > 2 && name.length < 100) {
            results.push({ name, level: '', imageUrl: imgUrl || null });
          }
        });
      }

      // Try any anchor links to stores
      if (results.length < 5) {
        document.querySelectorAll('a[href*="/stores/"]').forEach(el => {
          // Extract store name from URL if not in text
          const href = el.getAttribute('href') || '';
          const urlMatch = href.match(/\/stores\/([^\/]+)/);
          let name = el.querySelector('h2, h3, h4, .name, [class*="name"]')?.textContent?.trim();

          // If name is empty, try extracting from URL
          if (!name && urlMatch) {
            name = urlMatch[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          }

          if (!name) {
            name = el.textContent?.trim()?.split('\n')[0];
          }

          const img = el.querySelector('img');
          let imgUrl = img?.src || img?.getAttribute('data-src');

          if (name && name.length > 2 && name.length < 80 &&
              !name.toLowerCase().includes('view') &&
              !name.toLowerCase().includes('filter') &&
              !name.toLowerCase().includes('clear')) {
            results.push({ name, level: '', imageUrl: imgUrl || null });
          }
        });
      }

      // Also look for store names in any visible text links
      if (results.length < 10) {
        // Get all links in the page that might be store names
        document.querySelectorAll('a[href*="tbp/en/stores/"]').forEach(el => {
          const href = el.getAttribute('href') || '';
          const urlMatch = href.match(/\/stores\/([^\/\.]+)/);
          if (urlMatch) {
            let name = urlMatch[1].replace(/-/g, ' ');
            // Capitalize each word
            name = name.replace(/\b\w/g, c => c.toUpperCase());

            const img = el.closest('.cmp-store-card, .store-card, [class*="card"]')?.querySelector('img');
            let imgUrl = img?.src || img?.getAttribute('data-src');

            if (name.length > 2 && name.length < 80) {
              results.push({ name, level: '', imageUrl: imgUrl || null });
            }
          }
        });
      }

      return results;
    });

    console.log(`Found ${stores.length} stores from DOM`);
    stores.forEach(s => allStores.push(s));

    // Add any stores captured via API interception
    console.log(`Captured ${capturedStores.length} stores from API`);
    capturedStores.forEach(s => allStores.push(s));

    // If too few results, try the eat page directly
    if (allStores.length < 20) {
      console.log('\nAlso trying eat page...');
      await page.goto('https://tiongbahruplaza.com.sg/eat', {
        waitUntil: 'domcontentloaded',
        timeout: 90000
      });
      await page.waitForTimeout(12000);

      // Scroll
      for (let i = 0; i < 30; i++) {
        await page.evaluate(() => window.scrollBy(0, 500));
        await page.waitForTimeout(300);
      }

      const stores2 = await page.evaluate(() => {
        const results = [];
        document.querySelectorAll('.store-card, .store-item, .tenant-card, a[href*="/stores/"]').forEach(el => {
          const nameEl = el.querySelector('h2, h3, h4, .store-name, .name, [class*="name"]');
          let name = nameEl?.textContent?.trim() || el.textContent?.trim()?.split('\n')[0];

          const img = el.querySelector('img');
          let imgUrl = img?.src || img?.getAttribute('data-src');

          if (name && name.length > 2 && name.length < 80) {
            results.push({ name, level: '', imageUrl: imgUrl || null });
          }
        });
        return results;
      });

      console.log(`Found ${stores2.length} stores from Stores page`);
      stores2.forEach(s => {
        if (!allStores.find(x => x.name.toLowerCase() === s.name.toLowerCase())) {
          allStores.push(s);
        }
      });
    }

    // Save screenshot for debugging
    await page.screenshot({ path: 'tbp-debug.png', fullPage: true });
    const html = await page.content();
    require('fs').writeFileSync('tbp-debug.html', html);
    console.log('Saved debug files');

    // Deduplicate and filter
    const uniqueStores = [];
    const seenNames = new Set();
    const junkNames = [
      'stores', 'home', 'about', 'contact', 'view all', 'load more',
      'filter', 'search', 'directory', 'tiong bahru', 'all stores',
      'food', 'fashion', 'services', 'entertainment', 'back to top',
      'filtersclear', 'shop', 'map', 'clear', 'filters', 'eat',
      'see all', 'explore', 'discover', 'featured', 'store details',
      'store details map'
    ];

    for (const store of allStores) {
      // Clean up the name - remove trailing # and "Store Details Map"
      let cleanName = store.name
        .replace(/#.*$/g, '')  // Remove # and anything after
        .replace(/Store Details Map/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

      // Capitalize words properly
      cleanName = cleanName.replace(/\b\w/g, c => c.toUpperCase());

      const key = cleanName.toLowerCase().trim();

      if (!seenNames.has(key) &&
          key.length > 2 &&
          !junkNames.includes(key) &&
          !key.startsWith('view ') &&
          !key.startsWith('see ') &&
          !key.startsWith('filter') &&
          !key.match(/^(shop|map|eat|home|stores)$/i)) {
        seenNames.add(key);
        uniqueStores.push({ ...store, name: cleanName });
      }
    }

    console.log(`\nTotal unique stores: ${uniqueStores.length}`);

    if (uniqueStores.length === 0) {
      console.log('No stores found. Check tbp-debug.png and tbp-debug.html');
      await browser.close();
      return;
    }

    // Show found stores
    console.log('\nStores found:');
    uniqueStores.forEach(s => console.log(`  - ${s.name}`));

    // Delete existing outlets for this mall
    console.log('\nRemoving existing outlets...');
    const { data: existing } = await supabase
      .from('mall_outlets')
      .select('id')
      .eq('mall_id', MALL_ID);

    if (existing?.length > 0) {
      await supabase.from('mall_outlets').delete().eq('mall_id', MALL_ID);
      console.log(`Deleted ${existing.length} existing outlets`);
    }

    // Import new outlets
    console.log('\nImporting outlets...');
    let imported = 0;
    for (const store of uniqueStores) {
      const { error } = await supabase
        .from('mall_outlets')
        .insert({
          id: generateId(store.name),
          name: store.name,
          mall_id: MALL_ID,
          level: store.level || '',
          category: getCategory(store.name),
          thumbnail_url: store.imageUrl,
          opening_hours: null,
          tags: []
        });

      if (!error) {
        imported++;
        console.log(`  Imported: ${store.name}`);
      } else {
        console.log(`  Error: ${store.name} - ${error.message}`);
      }
    }

    console.log(`\n=== COMPLETE ===`);
    console.log(`Imported: ${imported}`);

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'tbp-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

scrapeTiongBahruPlaza();
