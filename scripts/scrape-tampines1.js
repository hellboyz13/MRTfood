const { chromium } = require('playwright');
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const MALL_ID = 'tampines-1';
const BASE_URL = 'https://www.tampines1.com.sg';

// Get category based on restaurant name
function getCategory(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('koi') || nameLower.includes('liho') || nameLower.includes('heytea') ||
      nameLower.includes('playmade') || nameLower.includes('mr coconut') || nameLower.includes('chicha') ||
      nameLower.includes('chagee') || nameLower.includes('juice') || nameLower.includes('tea shop')) {
    return 'Drinks';
  }
  if (nameLower.includes('starbucks') || nameLower.includes('coffee bean') || nameLower.includes('toast') ||
      nameLower.includes('ya kun') || nameLower.includes('cafe') || nameLower.includes('café') ||
      nameLower.includes('coffee') || nameLower.includes('luckin')) {
    return 'Cafe';
  }
  if (nameLower.includes('bakery') || nameLower.includes('breadtalk') || nameLower.includes('polar') ||
      nameLower.includes('bengawan') || nameLower.includes('cookie') || nameLower.includes('cake') ||
      nameLower.includes('donut') || nameLower.includes('baguette') || nameLower.includes('cedele') ||
      nameLower.includes('delifrance')) {
    return 'Bakery';
  }
  if (nameLower.includes('mcdonald') || nameLower.includes('kfc') || nameLower.includes('burger king') ||
      nameLower.includes('subway') || nameLower.includes('long john') || nameLower.includes('jollibee') ||
      nameLower.includes('pizza hut') || nameLower.includes('popeyes') || nameLower.includes('wingstop') ||
      nameLower.includes('4fingers') || nameLower.includes('pezzo')) {
    return 'Fast Food';
  }
  if (nameLower.includes('sushi') || nameLower.includes('ramen') || nameLower.includes('japanese') ||
      nameLower.includes('yakiniku') || nameLower.includes('tonkatsu') || nameLower.includes('genki') ||
      nameLower.includes('don') || nameLower.includes('shokudo') || nameLower.includes('donki')) {
    return 'Japanese';
  }
  if (nameLower.includes('korean') || nameLower.includes('bibim') || nameLower.includes('ajumma') ||
      nameLower.includes('bbq') || nameLower.includes('shine korea')) {
    return 'Korean';
  }
  if (nameLower.includes('din tai fung') || nameLower.includes('crystal jade') || nameLower.includes('paradise') ||
      nameLower.includes('putien') || nameLower.includes('hotpot') || nameLower.includes('dim sum') ||
      nameLower.includes('ma la') || nameLower.includes('chinese')) {
    return 'Chinese';
  }
  if (nameLower.includes('thai') || nameLower.includes('sanook')) {
    return 'Thai';
  }
  if (nameLower.includes('western') || nameLower.includes('astons') || nameLower.includes('collin') ||
      nameLower.includes('fish & co') || nameLower.includes('grill') || nameLower.includes('steak') ||
      nameLower.includes('trattoria') || nameLower.includes('italian')) {
    return 'Western';
  }
  if (nameLower.includes('food court') || nameLower.includes('kopitiam') || nameLower.includes('food republic') ||
      nameLower.includes('foodcourt')) {
    return 'Food Court';
  }
  if (nameLower.includes('dessert') || nameLower.includes('ice cream') || nameLower.includes('llao') ||
      nameLower.includes('yogurt') || nameLower.includes('churn')) {
    return 'Desserts';
  }
  if (nameLower.includes('cold storage') || nameLower.includes('fairprice') || nameLower.includes('supermarket')) {
    return 'Supermarket';
  }
  if (nameLower.includes('egglet') || nameLower.includes('pau') || nameLower.includes('hawker')) {
    return 'Local';
  }

  return 'Restaurant';
}

// Generate slug ID
function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-tampines-1';
}

// Normalize name for matching
function normalizeName(name) {
  return name.toLowerCase()
    .replace(/[''`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function findMatchingOutlet(name) {
  const searchTerms = [
    name.toLowerCase(),
    name.toLowerCase().split(' ')[0],
    name.toLowerCase().replace(/[''s]/g, '')
  ];

  const { data: outlets } = await supabase
    .from('mall_outlets')
    .select('name, thumbnail_url, opening_hours, category')
    .or('thumbnail_url.not.is.null,opening_hours.not.is.null');

  if (!outlets) return null;

  for (const term of searchTerms) {
    const match = outlets.find(o =>
      normalizeName(o.name).includes(term) ||
      term.includes(normalizeName(o.name).split(' ')[0])
    );
    if (match && (match.thumbnail_url || match.opening_hours)) {
      return match;
    }
  }

  return null;
}

async function scrapeAndImport() {
  console.log('=== SCRAPING TAMPINES 1 (Official Website) ===\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // First scrape the main eat page
    console.log('Loading main eat page...');
    await page.goto('https://www.tampines1.com.sg/content/frasersexperience/t1/en/eat.html', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    await page.waitForTimeout(8000);

    // Extract store data from JSON data attributes
    let stores = await page.evaluate((baseUrl) => {
      const results = [];
      const seenIds = new Set();

      // Find all elements with data-category-preview-storeconfigdata attributes
      document.querySelectorAll('[data-category-preview-storeconfigdata]').forEach(el => {
        try {
          const jsonStr = el.getAttribute('data-category-preview-storeconfigdata');
          if (jsonStr) {
            const storeData = JSON.parse(jsonStr);
            storeData.forEach(store => {
              if (store.storeID && !seenIds.has(store.storeID)) {
                seenIds.add(store.storeID);
                results.push({
                  name: store.storeName,
                  unit: store.unitNo,
                  logo: store.storeLogo ? baseUrl + store.storeLogo : null
                });
              }
            });
          }
        } catch (e) {}
      });

      // Also check storeconfigdata1 and storeconfigdata2
      document.querySelectorAll('[data-category-preview-storeconfigdata1], [data-category-preview-storeconfigdata2]').forEach(el => {
        ['data-category-preview-storeconfigdata1', 'data-category-preview-storeconfigdata2'].forEach(attr => {
          try {
            const jsonStr = el.getAttribute(attr);
            if (jsonStr) {
              const storeData = JSON.parse(jsonStr);
              storeData.forEach(store => {
                if (store.storeID && !seenIds.has(store.storeID)) {
                  seenIds.add(store.storeID);
                  results.push({
                    name: store.storeName,
                    unit: store.unitNo,
                    logo: store.storeLogo ? baseUrl + store.storeLogo : null
                  });
                }
              });
            }
          } catch (e) {}
        });
      });

      return results;
    }, BASE_URL);

    console.log(`Found ${stores.length} stores from eat page`);

    // Now scrape the full stores page with food tags
    console.log('\nLoading full stores page...');
    await page.goto('https://www.tampines1.com.sg/content/frasersexperience/t1/en/stores.html?tag=cafe,fast-food,restaurant,snacks,quick-bites,drinks,fresh-food,bakery,halal', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    await page.waitForTimeout(8000);

    // Scroll to load all stores
    console.log('Scrolling to load all stores...');
    for (let i = 0; i < 30; i++) {
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(200);
    }
    await page.waitForTimeout(3000);

    // Try to click "Load More" buttons
    try {
      for (let i = 0; i < 10; i++) {
        const loadMore = await page.$('button:has-text("Load More"), .load-more, a:has-text("Load More"), [class*="load-more"], button:has-text("Show More")');
        if (loadMore) {
          await loadMore.click();
          await page.waitForTimeout(2000);
          console.log(`Clicked Load More (${i + 1})`);
        } else {
          break;
        }
      }
    } catch (e) {}

    // Extract more stores from stores page
    const moreStores = await page.evaluate((baseUrl) => {
      const results = [];
      const seenIds = new Set();

      // Look for store listing items
      document.querySelectorAll('.store-listing-item, .store-item, [class*="store-listing"] .item').forEach(el => {
        const nameEl = el.querySelector('.store-name, .title, h3, h4');
        const name = nameEl?.textContent?.trim();
        const unitEl = el.querySelector('.unit, .location, [class*="unit"]');
        const unit = unitEl?.textContent?.trim() || '';
        const img = el.querySelector('img');
        const logo = img?.src;

        if (name && name.length > 2 && name.length < 100) {
          results.push({ name, unit, logo });
        }
      });

      // Also extract from data attributes on stores page
      document.querySelectorAll('[data-store-config], [data-stores]').forEach(el => {
        ['data-store-config', 'data-stores'].forEach(attr => {
          try {
            const jsonStr = el.getAttribute(attr);
            if (jsonStr) {
              const storeData = JSON.parse(jsonStr);
              const storeArray = Array.isArray(storeData) ? storeData : [storeData];
              storeArray.forEach(store => {
                if (store.storeName && !seenIds.has(store.storeID)) {
                  seenIds.add(store.storeID);
                  results.push({
                    name: store.storeName,
                    unit: store.unitNo || '',
                    logo: store.storeLogo ? baseUrl + store.storeLogo : null
                  });
                }
              });
            }
          } catch (e) {}
        });
      });

      return results;
    }, BASE_URL);

    console.log(`Found ${moreStores.length} additional stores from stores page`);

    // Combine and deduplicate
    const allStores = [...stores, ...moreStores];
    const uniqueStores = [];
    const seenNames = new Set();

    for (const store of allStores) {
      const normalizedName = store.name.toLowerCase().trim();
      if (!seenNames.has(normalizedName) && normalizedName.length > 2) {
        seenNames.add(normalizedName);
        uniqueStores.push(store);
      }
    }

    console.log(`\nTotal unique stores: ${uniqueStores.length}`);

    if (uniqueStores.length < 5) {
      console.log('\nToo few stores found. Saving debug files...');
      await page.screenshot({ path: 'tampines1-debug.png', fullPage: true });
      const html = await page.content();
      require('fs').writeFileSync('tampines1-debug.html', html);
      console.log('Saved debug files');
    }

    // List found stores
    console.log('\nFound stores:');
    uniqueStores.forEach(s => console.log(`  - ${s.name} (${s.unit})`));

    // Delete existing outlets
    console.log('\n--- Removing existing outlets ---');
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
    console.log('\n--- Importing outlets ---');
    let imported = 0;
    let failed = 0;
    let withThumbnail = 0;
    let withHours = 0;

    for (const store of uniqueStores) {
      const category = getCategory(store.name);
      const id = generateId(store.name);

      // Try to find matching thumbnail and hours from existing database if no logo
      const match = await findMatchingOutlet(store.name);

      const outletData = {
        id: id,
        name: store.name,
        mall_id: MALL_ID,
        level: store.unit || '',
        category: category,
        thumbnail_url: store.logo || match?.thumbnail_url || null,
        opening_hours: match?.opening_hours || null,
        tags: [category]
      };

      const { error: insertError } = await supabase
        .from('mall_outlets')
        .insert(outletData);

      if (insertError) {
        if (insertError.code === '23505') {
          console.log(`Skipping (duplicate): ${store.name}`);
        } else {
          console.log(`Error inserting ${store.name}: ${insertError.message}`);
          failed++;
        }
        continue;
      }

      const thumbStatus = outletData.thumbnail_url ? '✓ thumb' : '✗ thumb';
      const hoursStatus = outletData.opening_hours ? '✓ hours' : '✗ hours';
      console.log(`Imported: ${store.name} (${category}) [${thumbStatus}] [${hoursStatus}]`);

      imported++;
      if (outletData.thumbnail_url) withThumbnail++;
      if (outletData.opening_hours) withHours++;
    }

    console.log(`\n=== IMPORT COMPLETE ===`);
    console.log(`Imported: ${imported}`);
    console.log(`With thumbnail: ${withThumbnail}`);
    console.log(`With opening hours: ${withHours}`);
    console.log(`Failed: ${failed}`);

    // Get final count
    const { data: finalCount } = await supabase
      .from('mall_outlets')
      .select('id')
      .eq('mall_id', MALL_ID);

    console.log(`\nTotal outlets at Tampines 1: ${finalCount?.length || 0}`);

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'tampines1-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

scrapeAndImport();
