const { chromium } = require('playwright');
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MALL_ID = 'bugis-junction';

// Get category based on restaurant name
function getCategory(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('koi') || nameLower.includes('liho') || nameLower.includes('heytea') ||
      nameLower.includes('playmade') || nameLower.includes('mr coconut') || nameLower.includes('chicha') ||
      nameLower.includes('chagee') || nameLower.includes('gong cha') || nameLower.includes('each a cup') ||
      nameLower.includes('tealive') || nameLower.includes('tiger sugar')) {
    return 'drinks, food';
  }
  if (nameLower.includes('starbucks') || nameLower.includes('coffee bean') || nameLower.includes('toast') ||
      nameLower.includes('ya kun') || nameLower.includes('cafe') || nameLower.includes('café') ||
      nameLower.includes('espresso') || nameLower.includes('coffee')) {
    return 'cafe, food';
  }
  if (nameLower.includes('bakery') || nameLower.includes('breadtalk') || nameLower.includes('polar') ||
      nameLower.includes('bengawan') || nameLower.includes('cookie') || nameLower.includes('cake') ||
      nameLower.includes('donut') || nameLower.includes('baguette') || nameLower.includes('cedele') ||
      nameLower.includes('old chang kee') || nameLower.includes('bread')) {
    return 'bakery, food';
  }
  if (nameLower.includes('mcdonald') || nameLower.includes('kfc') || nameLower.includes('burger king') ||
      nameLower.includes('subway') || nameLower.includes('long john') || nameLower.includes('jollibee') ||
      nameLower.includes('pizza hut') || nameLower.includes('popeyes') || nameLower.includes('wendy') ||
      nameLower.includes('texas chicken') || nameLower.includes('mos burger')) {
    return 'fast food, food';
  }
  if (nameLower.includes('sushi') || nameLower.includes('ramen') || nameLower.includes('japanese') ||
      nameLower.includes('yakiniku') || nameLower.includes('tonkatsu') || nameLower.includes('genki') ||
      nameLower.includes('tempura') || nameLower.includes('don') || nameLower.includes('ichiran') ||
      nameLower.includes('ippudo') || nameLower.includes('nakajima')) {
    return 'japanese, food';
  }
  if (nameLower.includes('korean') || nameLower.includes('bibim') || nameLower.includes('ajumma') ||
      nameLower.includes('kimchi') || nameLower.includes('bbq')) {
    return 'korean, food';
  }
  if (nameLower.includes('din tai fung') || nameLower.includes('crystal jade') || nameLower.includes('paradise') ||
      nameLower.includes('putien') || nameLower.includes('hotpot') || nameLower.includes('dim sum') ||
      nameLower.includes('ma la') || nameLower.includes('hai di lao') || nameLower.includes('szechuan') ||
      nameLower.includes('cantonese') || nameLower.includes('teochew')) {
    return 'chinese, food';
  }
  if (nameLower.includes('thai') || nameLower.includes('sanook') || nameLower.includes('nara')) {
    return 'thai, food';
  }
  if (nameLower.includes('western') || nameLower.includes('astons') || nameLower.includes('collin') ||
      nameLower.includes('fish & co') || nameLower.includes('pasta') || nameLower.includes('steak') ||
      nameLower.includes('grill')) {
    return 'western, food';
  }
  if (nameLower.includes('food court') || nameLower.includes('kopitiam') || nameLower.includes('food republic') ||
      nameLower.includes('koufu') || nameLower.includes('foodcourt')) {
    return 'food court, food';
  }
  if (nameLower.includes('dessert') || nameLower.includes('ice cream') || nameLower.includes('gelato') ||
      nameLower.includes('llao llao') || nameLower.includes('sweet')) {
    return 'desserts, food';
  }
  if (nameLower.includes('nasi') || nameLower.includes('malay') || nameLower.includes('padang') ||
      nameLower.includes('murtabak') || nameLower.includes('prata')) {
    return 'malay, food';
  }
  if (nameLower.includes('indian') || nameLower.includes('curry') || nameLower.includes('biryani')) {
    return 'indian, food';
  }

  return 'restaurant, food';
}

// Generate slug ID
function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-bugis-junction';
}

async function scrapeAndImport() {
  console.log('=== SCRAPING BUGIS JUNCTION ===\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Capture API responses
  const apiStores = [];
  const apiResponses = [];
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('tenants') || url.includes('stores') || url.includes('graphql')) {
      try {
        const contentType = response.headers()['content-type'] || '';
        if (contentType.includes('application/json')) {
          const json = await response.json();
          console.log('Found API response:', url.substring(0, 120));
          apiResponses.push({ url, json });

          // CapitaLand API structure: { totalcount, properties: [...] }
          if (json.properties && Array.isArray(json.properties)) {
            json.properties.forEach(item => {
              // Only process items with jcr:title (actual store names)
              if (item['jcr:title'] && item.entityType === 'tenants') {
                // Extract unit number from the path like "capitalanddatabasemanagement:sg/tenant-unit-numbers/bugisjunction/b1-03d"
                let unit = '';
                if (item.unitnumber && Array.isArray(item.unitnumber) && item.unitnumber[0]) {
                  const unitPath = item.unitnumber[0];
                  const unitMatch = unitPath.match(/\/([^\/]+)$/);
                  if (unitMatch) {
                    unit = '#' + unitMatch[1].toUpperCase().replace(/-/g, '-');
                  }
                }

                // Extract category from marketingcategory
                let category = 'restaurant, food';
                if (item.marketingcategory && Array.isArray(item.marketingcategory)) {
                  const cat = item.marketingcategory[0] || '';
                  if (cat.includes('cafe')) category = 'cafe, food';
                  else if (cat.includes('bakery')) category = 'bakery, food';
                  else if (cat.includes('fastfood')) category = 'fast food, food';
                  else if (cat.includes('kiosk')) category = 'snacks, food';
                }

                // Get thumbnail
                const thumbnail = item.thumbnail
                  ? 'https://www.capitaland.com' + item.thumbnail
                  : null;

                apiStores.push({
                  name: item['jcr:title'],
                  unit: unit,
                  imageUrl: thumbnail,
                  category: category
                });
              }
            });
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  });

  try {
    console.log('Loading CapitaLand Bugis Junction page...');
    await page.goto('https://www.capitaland.com/sg/malls/bugisjunction/en/stores.html?category=foodandbeverage', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    // Wait extra time for JavaScript to render content and API calls
    console.log('Waiting for page to load and make API calls...');
    await page.waitForTimeout(10000);

    // Scroll to trigger lazy loading
    console.log('Scrolling to load all stores...');
    for (let i = 0; i < 20; i++) {
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(300);
    }
    await page.waitForTimeout(3000);

    // Click "Load More" or "Show More" if it exists
    try {
      let loadMoreClicks = 0;
      while (loadMoreClicks < 10) {
        const loadMoreBtn = await page.$('button:has-text("Load More"), button:has-text("Show More"), a:has-text("Load More")');
        if (loadMoreBtn) {
          await loadMoreBtn.click();
          await page.waitForTimeout(2000);
          loadMoreClicks++;
          console.log(`Clicked Load More (${loadMoreClicks})`);
        } else {
          break;
        }
      }
    } catch (e) {
      // No load more button
    }

    console.log(`Captured ${apiStores.length} stores from API responses`);

    // Debug: save API responses for inspection
    if (apiResponses.length > 0) {
      console.log('\nAPI Response structures:');
      apiResponses.forEach(({ url, json }) => {
        console.log(`\nURL: ${url.substring(0, 100)}`);
        console.log('Keys:', Object.keys(json));
        if (json.data) console.log('  data keys:', Object.keys(json.data));
      });
      require('fs').writeFileSync('bugis-api-debug.json', JSON.stringify(apiResponses, null, 2));
      console.log('\nSaved API responses to bugis-api-debug.json');
    }

    // Extract store information from DOM
    const stores = await page.evaluate(() => {
      const results = [];

      // CapitaLand uses various selectors for store cards
      const selectors = [
        '.store-card',
        '.cmp-store-listing__item',
        '[class*="store-listing"] [class*="item"]',
        '.store-item',
        '[data-component="storecard"]',
        '.stores-list .store',
        'article[class*="store"]',
        '.cmp-store-card',
        '[class*="StoreCard"]'
      ];

      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          // Try to get store name
          const nameEl = el.querySelector('h2, h3, h4, .store-name, [class*="title"], [class*="name"], .cmp-store-card__title');
          const name = nameEl?.textContent?.trim();

          // Try to get unit number
          const unitEl = el.querySelector('.store-unit, .unit, [class*="location"], [class*="level"], .cmp-store-card__location');
          const unit = unitEl?.textContent?.trim() || '';

          // Try to get image
          const img = el.querySelector('img');
          const imgUrl = img?.src || img?.getAttribute('data-src') || null;

          if (name && name.length > 1 && name.length < 100) {
            results.push({
              name: name,
              unit: unit,
              imageUrl: imgUrl
            });
          }
        });
      }

      // Also try to find store links
      const links = document.querySelectorAll('a[href*="/stores/"]');
      links.forEach(link => {
        const name = link.textContent?.trim();
        const href = link.getAttribute('href');
        if (name && name.length > 2 && name.length < 100 && !name.includes('View All')) {
          const img = link.querySelector('img') || link.closest('[class*="store"]')?.querySelector('img');
          results.push({
            name: name,
            unit: '',
            imageUrl: img?.src || null
          });
        }
      });

      return results;
    });

    console.log(`Found ${stores.length} stores from DOM selectors`);

    // Combine API and DOM results - prefer API data
    const allStores = apiStores.length > 0 ? [...apiStores] : [...stores];

    // If API got data, add any DOM stores not already captured
    if (apiStores.length > 0 && stores.length > 0) {
      const apiNames = new Set(apiStores.map(s => s.name.toLowerCase()));
      stores.forEach(s => {
        if (!apiNames.has(s.name.toLowerCase())) {
          allStores.push(s);
        }
      });
    }

    // Deduplicate
    const uniqueStores = [];
    const seenNames = new Set();

    for (const store of allStores) {
      const normalizedName = store.name.toLowerCase().trim();
      // Filter out junk entries
      if (seenNames.has(normalizedName) ||
          normalizedName.includes('skip') ||
          normalizedName.includes('accessibility') ||
          normalizedName.includes('filter') ||
          normalizedName.includes('clear') ||
          normalizedName.includes('view all') ||
          normalizedName.includes('show more') ||
          normalizedName.includes('load more') ||
          normalizedName === 'singapore' ||
          normalizedName === 'bugis junction' ||
          normalizedName.length < 2) {
        continue;
      }
      seenNames.add(normalizedName);
      uniqueStores.push(store);
    }

    console.log(`Total unique stores: ${uniqueStores.length}\n`);

    // List found stores
    uniqueStores.forEach(s => console.log(`- ${s.name}${s.unit ? ` (${s.unit})` : ''}`));

    if (uniqueStores.length < 3) {
      console.log('\nToo few stores found. Saving screenshot for debugging...');
      await page.screenshot({ path: 'bugis-junction-debug.png', fullPage: true });

      // Get page HTML for debugging
      const html = await page.content();
      require('fs').writeFileSync('bugis-junction-debug.html', html);
      console.log('Saved debug files: bugis-junction-debug.png and bugis-junction-debug.html');
      console.log('Please check these files to understand the page structure.');
      return;
    }

    // Delete existing outlets
    console.log('\nStep 1: Removing existing outlets...');
    const { data: existing } = await supabase
      .from('mall_outlets')
      .select('id')
      .eq('mall_id', MALL_ID);

    if (existing && existing.length > 0) {
      console.log(`Found ${existing.length} existing outlets to remove`);
      await supabase.from('mall_outlets').delete().eq('mall_id', MALL_ID);
      console.log(`Deleted ${existing.length} existing outlets`);
    } else {
      console.log('No existing outlets found');
    }

    // Import new outlets
    console.log('\nStep 2: Importing outlets...');
    let imported = 0;
    let failed = 0;

    for (const store of uniqueStores) {
      // Use category from API if available, otherwise use getCategory function
      const category = store.category || getCategory(store.name);
      const id = generateId(store.name);

      const { error: insertError } = await supabase
        .from('mall_outlets')
        .insert({
          id: id,
          name: store.name,
          mall_id: MALL_ID,
          level: store.unit || '',
          category: category,
          thumbnail_url: store.imageUrl,
          tags: []
        });

      if (insertError) {
        console.log(`Error inserting ${store.name}: ${insertError.message}`);
        failed++;
        continue;
      }

      console.log(`Imported: ${store.name} (${category})${store.unit ? ` - ${store.unit}` : ''}`);
      imported++;
    }

    console.log(`\n=== IMPORT COMPLETE ===`);
    console.log(`Imported: ${imported}`);
    console.log(`Failed: ${failed}`);

    // Get final count
    const { data: finalCount } = await supabase
      .from('mall_outlets')
      .select('id')
      .eq('mall_id', MALL_ID);

    console.log(`\nTotal outlets at Bugis Junction: ${finalCount?.length || 0}`);

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'bugis-junction-error.png', fullPage: true });
    console.log('Saved error screenshot: bugis-junction-error.png');
  } finally {
    await browser.close();
  }
}

scrapeAndImport();