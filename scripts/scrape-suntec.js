const { chromium } = require('playwright');
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const MALL_ID = 'suntec-city';

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
    + '-suntec';
}

async function scrapeSuntec() {
  console.log('=== SCRAPING SUNTEC CITY ===\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('Loading Suntec City dining page...');
    await page.goto('https://sunteccity.com.sg/store_categories/dining', {
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

    // Try to click "Load More" if exists
    try {
      for (let i = 0; i < 10; i++) {
        const loadMore = await page.$('button:has-text("Load More"), .load-more, a:has-text("Load More"), [class*="load-more"]');
        if (loadMore) {
          await loadMore.click();
          await page.waitForTimeout(2000);
          console.log(`Clicked Load More (${i + 1})`);
        } else {
          break;
        }
      }
    } catch (e) {}

    // Extract stores from DOM - Suntec uses .explore-item structure
    const stores = await page.evaluate(() => {
      const results = [];

      // Suntec City specific structure
      document.querySelectorAll('.explore-item').forEach(el => {
        const nameEl = el.querySelector('.info .name a');
        const name = nameEl?.textContent?.trim();

        const addressEl = el.querySelector('.address');
        const level = addressEl?.textContent?.trim() || '';

        const img = el.querySelector('.thumb-img img');
        let imgUrl = img?.src || img?.getAttribute('data-src');
        // Skip fallback images
        if (imgUrl && imgUrl.includes('logo-fallback.png')) {
          imgUrl = null;
        }

        if (name && name.length > 2 && name.length < 100) {
          results.push({ name, level, hours: '', imageUrl: imgUrl || null });
        }
      });

      return results;
    });

    console.log(`Found ${stores.length} stores from DOM`);

    // If too few, take a screenshot for debugging
    if (stores.length < 5) {
      console.log('Too few stores, saving debug...');
      await page.screenshot({ path: 'suntec-debug.png', fullPage: true });
      const html = await page.content();
      require('fs').writeFileSync('suntec-debug.html', html);
      console.log('Saved suntec-debug.png and suntec-debug.html');
    }

    // Deduplicate and filter
    const uniqueStores = [];
    const seenNames = new Set();
    const junkNames = [
      'dining', 'stores', 'home', 'about', 'contact', 'view all', 'load more',
      'filter', 'search', 'directory', 'suntec city', 'all stores'
    ];

    for (const store of stores) {
      const key = store.name.toLowerCase().trim();
      if (!seenNames.has(key) &&
          key.length > 2 &&
          !junkNames.includes(key) &&
          !key.startsWith('view ')) {
        seenNames.add(key);
        uniqueStores.push(store);
      }
    }

    console.log(`Unique stores: ${uniqueStores.length}`);

    if (uniqueStores.length === 0) {
      console.log('No stores found. Check debug files.');
      await browser.close();
      return;
    }

    // Delete existing
    console.log('\nRemoving existing outlets...');
    const { data: existing } = await supabase
      .from('mall_outlets')
      .select('id')
      .eq('mall_id', MALL_ID);

    if (existing?.length > 0) {
      await supabase.from('mall_outlets').delete().eq('mall_id', MALL_ID);
      console.log(`Deleted ${existing.length} existing outlets`);
    }

    // Import
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
          opening_hours: store.hours || null,
          tags: []
        });

      if (!error) {
        imported++;
        console.log(`  Imported: ${store.name}${store.hours ? ` (${store.hours})` : ''}`);
      } else {
        console.log(`  Error: ${store.name} - ${error.message}`);
      }
    }

    console.log(`\n=== COMPLETE ===`);
    console.log(`Imported: ${imported}`);

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'suntec-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

scrapeSuntec();
