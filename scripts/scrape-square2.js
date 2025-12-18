const { chromium } = require('playwright');
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const MALL_ID = 'square-2';

function getCategory(name, storeType) {
  const text = (name + ' ' + storeType).toLowerCase();

  if (text.includes('cafe') || text.includes('dessert') || text.includes('coffee') ||
      text.includes('starbucks') || text.includes('toast') || text.includes('ya kun')) {
    return 'cafe, food';
  }
  if (text.includes('bakery') || text.includes('confectionery') || text.includes('bread') ||
      text.includes('cake') || text.includes('donut')) {
    return 'bakery, food';
  }
  if (text.includes('fast food') || text.includes('mcdonald') || text.includes('kfc') ||
      text.includes('burger') || text.includes('subway')) {
    return 'fast food, food';
  }
  if (text.includes('japanese') || text.includes('sushi') || text.includes('ramen') ||
      text.includes('don') || text.includes('genki')) {
    return 'japanese, food';
  }
  if (text.includes('korean') || text.includes('bbq') || text.includes('bibim')) {
    return 'korean, food';
  }
  if (text.includes('chinese') || text.includes('dim sum') || text.includes('hotpot')) {
    return 'chinese, food';
  }
  if (text.includes('thai')) {
    return 'thai, food';
  }
  if (text.includes('light bites') || text.includes('kiosk') || text.includes('snack')) {
    return 'snacks, food';
  }
  if (text.includes('food court') || text.includes('kopitiam') || text.includes('food republic')) {
    return 'food court, food';
  }
  if (text.includes('convenience') || text.includes('7-eleven') || text.includes('cheers')) {
    return 'convenience, food';
  }

  return 'restaurant, food';
}

function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-square2';
}

async function scrapeSquare2() {
  console.log('=== SCRAPING SQUARE 2 ===\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('Loading Square 2 shops page...');
    await page.goto('https://www.fareastmalls.com.sg/en/square-2/shops?s=', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await page.waitForTimeout(5000);

    // Click Load More repeatedly to load all shops
    console.log('Loading all shops...');
    for (let i = 0; i < 25; i++) {
      try {
        const loadMore = await page.$('button:has-text("Load More"), .load-more, [class*="load-more"]');
        if (loadMore) {
          await loadMore.click();
          console.log(`  Clicked Load More (${i + 1})`);
          await page.waitForTimeout(1500);
        } else {
          break;
        }
      } catch (e) {
        break;
      }
    }
    await page.waitForTimeout(2000);

    // Extract all stores
    const stores = await page.evaluate(() => {
      const results = [];

      // Square 2 structure: div with a link containing .b-store-title, .b-store-unit, .b-store-type
      // The container is #b-store section with .b-row > .b-col-* divs
      const cards = document.querySelectorAll('#b-store .b-row > div[class*="b-col"]');

      cards.forEach(card => {
        const link = card.querySelector('a');
        if (!link) return;

        // Get name from .b-store-title
        const titleEl = card.querySelector('.b-store-title');
        let name = '';
        if (titleEl) {
          // Get just the text node, not nested elements
          const textNodes = [];
          titleEl.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
              textNodes.push(node.textContent.trim());
            }
          });
          name = textNodes.join(' ').trim();
        }

        // Get unit
        const unitEl = card.querySelector('.b-store-unit');
        const unit = unitEl?.textContent?.trim() || '';

        // Get type (category)
        const typeEl = card.querySelector('.b-store-type');
        const storeType = typeEl?.textContent?.trim() || '';

        // Get image
        const img = card.querySelector('img.b-img-responsive');
        let imgUrl = img?.src;
        if (imgUrl && imgUrl.startsWith('/')) {
          imgUrl = 'https://www.fareastmalls.com.sg' + imgUrl;
        }

        // Check if it's F&B
        const isFood = storeType.toLowerCase().includes('food') ||
                       storeType.toLowerCase().includes('beverage') ||
                       storeType.toLowerCase().includes('convenience');

        if (name && name.length > 1) {
          results.push({
            name,
            unit,
            storeType,
            isFood,
            imageUrl: imgUrl || null
          });
        }
      });

      return results;
    });

    console.log(`Found ${stores.length} total stores`);

    // Filter for F&B only and deduplicate
    const uniqueStores = [];
    const seenNames = new Set();
    const junkNames = ['home', 'about', 'contact', 'view all', 'load more', 'filter', 'search'];

    for (const store of stores) {
      if (!store.isFood) continue;

      const key = store.name.toLowerCase().trim();
      if (!seenNames.has(key) &&
          key.length > 1 &&
          !junkNames.includes(key)) {
        seenNames.add(key);
        uniqueStores.push(store);
      }
    }

    console.log(`F&B stores: ${uniqueStores.length}`);

    // Print found stores
    console.log('\nFound F&B outlets:');
    for (const store of uniqueStores) {
      console.log(`  - ${store.name} (${store.unit || 'no unit'}) ${store.imageUrl ? '✓img' : ''}`);
    }

    if (uniqueStores.length === 0) {
      console.log('\nNo F&B stores found.');
      await page.screenshot({ path: 'square2-error.png', fullPage: true });
      await browser.close();
      return;
    }

    // Delete existing outlets
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
          level: store.unit || '',
          category: getCategory(store.name, store.storeType),
          thumbnail_url: store.imageUrl,
          opening_hours: null,
          tags: []
        });

      if (!error) {
        imported++;
        console.log(`  ✓ ${store.name}`);
      } else {
        console.log(`  ✗ ${store.name} - ${error.message}`);
      }
    }

    console.log(`\n=== COMPLETE ===`);
    console.log(`Imported: ${imported}/${uniqueStores.length}`);

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'square2-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

scrapeSquare2();
