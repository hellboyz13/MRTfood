const { chromium } = require('playwright');
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MALL_ID = 'jewel-changi-airport';

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
      nameLower.includes('subway') || nameLower.includes('jollibee') || nameLower.includes('popeyes')) {
    return 'fast food, food';
  }
  if (nameLower.includes('sushi') || nameLower.includes('ramen') || nameLower.includes('japanese') ||
      nameLower.includes('don') || nameLower.includes('udon')) {
    return 'japanese, food';
  }
  if (nameLower.includes('korean') || nameLower.includes('bibim') || nameLower.includes('bbq')) {
    return 'korean, food';
  }
  if (nameLower.includes('chinese') || nameLower.includes('dim sum') || nameLower.includes('hotpot')) {
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
    + '-jewel';
}

async function scrapeJewel() {
  console.log('=== SCRAPING JEWEL CHANGI AIRPORT ===\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('Loading Jewel dine page...');
    await page.goto('https://www.jewelchangiairport.com/en/dine.html', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await page.waitForTimeout(8000);

    // Scroll to load all
    console.log('Scrolling to load all stores...');
    for (let i = 0; i < 30; i++) {
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(200);
    }
    await page.waitForTimeout(3000);

    // Try to click "Load More" if exists
    try {
      for (let i = 0; i < 10; i++) {
        const loadMore = await page.$('button:has-text("Load More"), .load-more, [class*="load-more"]');
        if (loadMore) {
          await loadMore.click();
          await page.waitForTimeout(2000);
        } else {
          break;
        }
      }
    } catch (e) {}

    // Extract stores from DOM
    const stores = await page.evaluate(() => {
      const results = [];

      // Try various selectors for Jewel's website
      const selectors = [
        '.store-card',
        '.dine-card',
        '[class*="store"]',
        '[class*="dine"]',
        '.listing-item',
        'article',
        '.card'
      ];

      for (const selector of selectors) {
        document.querySelectorAll(selector).forEach(el => {
          const nameEl = el.querySelector('h2, h3, h4, .title, [class*="title"], [class*="name"]');
          const name = nameEl?.textContent?.trim();

          const levelEl = el.querySelector('[class*="level"], [class*="location"], [class*="unit"]');
          const level = levelEl?.textContent?.trim() || '';

          const img = el.querySelector('img');
          const imgUrl = img?.src || img?.getAttribute('data-src');

          if (name && name.length > 2 && name.length < 100) {
            results.push({ name, level, imageUrl: imgUrl || null });
          }
        });
      }

      // Also try finding store links
      document.querySelectorAll('a[href*="/dine/"], a[href*="/store/"]').forEach(link => {
        const name = link.textContent?.trim();
        if (name && name.length > 2 && name.length < 80) {
          const img = link.querySelector('img');
          results.push({
            name,
            level: '',
            imageUrl: img?.src || null
          });
        }
      });

      return results;
    });

    console.log(`Found ${stores.length} stores from DOM`);

    // Deduplicate
    const uniqueStores = [];
    const seenNames = new Set();
    for (const store of stores) {
      const key = store.name.toLowerCase().trim();
      if (!seenNames.has(key) &&
          key.length > 2 &&
          !key.includes('load more') &&
          !key.includes('view all')) {
        seenNames.add(key);
        uniqueStores.push(store);
      }
    }

    console.log(`Unique stores: ${uniqueStores.length}`);

    if (uniqueStores.length < 5) {
      console.log('Too few stores found, saving debug...');
      await page.screenshot({ path: 'jewel-debug.png', fullPage: true });
      const html = await page.content();
      require('fs').writeFileSync('jewel-debug.html', html);
      console.log('Saved jewel-debug.png and jewel-debug.html');
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
          tags: []
        });

      if (!error) {
        imported++;
        console.log(`  Imported: ${store.name}`);
      }
    }

    console.log(`\n=== COMPLETE ===`);
    console.log(`Imported: ${imported}`);

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'jewel-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

scrapeJewel();
