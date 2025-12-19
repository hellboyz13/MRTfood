const { chromium } = require('playwright');
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const MALL_ID = 'shaw-centre';

function getCategory(name, cuisine) {
  const nameLower = (name + ' ' + cuisine).toLowerCase();

  if (nameLower.includes('coffee') || nameLower.includes('cafe') || nameLower.includes('café') ||
      nameLower.includes('starbucks') || nameLower.includes('toast') || nameLower.includes('ya kun') ||
      nameLower.includes('tarte') || nameLower.includes('dessert')) {
    return 'cafe, food';
  }
  if (nameLower.includes('bakery') || nameLower.includes('bread') || nameLower.includes('cake')) {
    return 'bakery, food';
  }
  if (nameLower.includes('mcdonald') || nameLower.includes('kfc') || nameLower.includes('burger') ||
      nameLower.includes('subway') || nameLower.includes('fast food')) {
    return 'fast food, food';
  }
  if (nameLower.includes('sushi') || nameLower.includes('ramen') || nameLower.includes('japanese') ||
      nameLower.includes('ippudo') || nameLower.includes('unagi') || nameLower.includes('tenjin') ||
      nameLower.includes('shabu') || nameLower.includes('wagyu') || nameLower.includes('zeniya')) {
    return 'japanese, food';
  }
  if (nameLower.includes('korean') || nameLower.includes('bbq') || nameLower.includes('gogi')) {
    return 'korean, food';
  }
  if (nameLower.includes('chinese') || nameLower.includes('dim sum') || nameLower.includes('mui kee') ||
      nameLower.includes('xi yan')) {
    return 'chinese, food';
  }
  if (nameLower.includes('thai')) {
    return 'thai, food';
  }
  if (nameLower.includes('french') || nameLower.includes('bistro') || nameLower.includes('les amis')) {
    return 'french, food';
  }
  if (nameLower.includes('italian') || nameLower.includes('picolino')) {
    return 'italian, food';
  }
  if (nameLower.includes('spanish') || nameLower.includes('tapas') || nameLower.includes('taperia')) {
    return 'spanish, food';
  }
  if (nameLower.includes('bar') || nameLower.includes('pub') || nameLower.includes('beer') ||
      nameLower.includes('grill') || nameLower.includes('scotts')) {
    return 'bar, food';
  }
  if (nameLower.includes('food court') || nameLower.includes('food republic') || nameLower.includes('kopitiam')) {
    return 'food court, food';
  }
  if (nameLower.includes('local')) {
    return 'local, food';
  }

  return 'restaurant, food';
}

function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-shaw-centre';
}

async function scrapeShawCentre() {
  console.log('=== SCRAPING SHAW CENTRE ===\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('Loading Shaw Centre dining page...');
    await page.goto('https://shawcentre.sg/dine/', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await page.waitForTimeout(5000);

    // Scroll to load all stores
    console.log('Scrolling to load all stores...');
    for (let i = 0; i < 15; i++) {
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(300);
    }
    await page.waitForTimeout(3000);

    // Extract stores
    const stores = await page.evaluate(() => {
      const results = [];

      // Shaw Centre structure: a.listing-products__card with h6 for name, img for image
      // The class also contains the cuisine type (e.g., "japanese", "chinese")
      const cards = document.querySelectorAll('a.listing-products__card');

      cards.forEach(card => {
        // Get name from h6
        const nameEl = card.querySelector('h6');
        const name = nameEl?.textContent?.trim();

        // Get cuisine from class (e.g., "japanese", "chinese", "french")
        const classes = card.className || '';
        const cuisineMatch = classes.match(/(japanese|chinese|korean|thai|french|italian|spanish|local-cuisines|cafes-and-desserts)/i);
        const cuisine = cuisineMatch ? cuisineMatch[1].replace(/-/g, ' ') : '';

        // Get image
        const img = card.querySelector('img');
        let imgUrl = img?.getAttribute('data-src') || img?.src;

        if (name && name.length > 2 && name.length < 100) {
          results.push({
            name,
            cuisine,
            imageUrl: imgUrl || null
          });
        }
      });

      return results;
    });

    console.log(`Found ${stores.length} raw stores`);

    // Deduplicate
    const uniqueStores = [];
    const seenNames = new Set();
    const junkNames = [
      'dine', 'home', 'about', 'contact', 'view all', 'load more',
      'filter', 'search', 'directory', 'shaw centre', 'all'
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

    // If too few stores, save debug
    if (uniqueStores.length < 5) {
      console.log('Too few stores, saving debug...');
      await page.screenshot({ path: 'shaw-centre-debug.png', fullPage: true });
      const html = await page.content();
      require('fs').writeFileSync('shaw-centre-debug.html', html);
      console.log('Saved debug files');
    }

    // Print found stores
    console.log('\nFound dining outlets:');
    for (const store of uniqueStores) {
      console.log(`  - ${store.name} (${store.cuisine || 'no cuisine'}) ${store.imageUrl ? '✓img' : ''}`);
    }

    if (uniqueStores.length === 0) {
      console.log('\nNo stores found.');
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
          level: '',
          category: getCategory(store.name, store.cuisine),
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
    await page.screenshot({ path: 'shaw-centre-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

scrapeShawCentre();
