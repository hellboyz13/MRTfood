const { chromium } = require('playwright');
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MALL_ID = 'jem';

function getCategory(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('7-eleven') || nameLower.includes('convenience') || nameLower.includes('cheers')) {
    return 'convenience, food';
  }
  if (nameLower.includes('starbucks') || nameLower.includes('coffee') || nameLower.includes('café') ||
      nameLower.includes('cafe') || nameLower.includes('toast') || nameLower.includes('ya kun') ||
      nameLower.includes('kopi') || nameLower.includes('espresso')) {
    return 'cafe, food';
  }
  if (nameLower.includes('bakery') || nameLower.includes('bread') || nameLower.includes('cake') ||
      nameLower.includes('baguette') || nameLower.includes('donut') || nameLower.includes('croissant')) {
    return 'bakery, food';
  }
  if (nameLower.includes('bubble tea') || nameLower.includes('boba') || nameLower.includes('tea house') ||
      nameLower.includes('chicha') || nameLower.includes('liho') || nameLower.includes('koi')) {
    return 'drinks, food';
  }
  if (nameLower.includes('ice cream') || nameLower.includes('dessert') || nameLower.includes('gelato') ||
      nameLower.includes('pancake')) {
    return 'desserts, food';
  }
  if (nameLower.includes('mcdonald') || nameLower.includes('burger king') || nameLower.includes('kfc') ||
      nameLower.includes('subway') || nameLower.includes('popeyes') || nameLower.includes('texas chicken') ||
      nameLower.includes('fast food')) {
    return 'fast food, food';
  }
  if (nameLower.includes('sushi') || nameLower.includes('japanese') || nameLower.includes('ramen') ||
      nameLower.includes('donburi') || nameLower.includes('izakaya') || nameLower.includes('tempura') ||
      nameLower.includes('genki') || nameLower.includes('sukiya')) {
    return 'japanese, food';
  }
  if (nameLower.includes('korean') || nameLower.includes('bbq') || nameLower.includes('kim') ||
      nameLower.includes('seoul') || nameLower.includes('bibim')) {
    return 'korean, food';
  }
  if (nameLower.includes('dim sum') || nameLower.includes('hotpot') || nameLower.includes('chinese') ||
      nameLower.includes('haidilao') || nameLower.includes('putien') || nameLower.includes('crystal jade') ||
      nameLower.includes('canton') || nameLower.includes('szechuan')) {
    return 'chinese, food';
  }
  if (nameLower.includes('thai') || nameLower.includes('soi')) {
    return 'thai, food';
  }
  if (nameLower.includes('italian') || nameLower.includes('pizza') || nameLower.includes('pasta') ||
      nameLower.includes('saizeriya')) {
    return 'italian, food';
  }
  if (nameLower.includes('indian') || nameLower.includes('curry') || nameLower.includes('tandoor')) {
    return 'indian, food';
  }
  if (nameLower.includes('western') || nameLower.includes('steak') || nameLower.includes('grill') ||
      nameLower.includes('astons') || nameLower.includes('collin')) {
    return 'western, food';
  }
  if (nameLower.includes('nasi lemak') || nameLower.includes('local') || nameLower.includes('hawker') ||
      nameLower.includes('kopitiam') || nameLower.includes('nanyang') || nameLower.includes('crave')) {
    return 'local, food';
  }
  if (nameLower.includes('food court') || nameLower.includes('food republic') || nameLower.includes('kopitiam')) {
    return 'food court, food';
  }
  if (nameLower.includes('bar') || nameLower.includes('pub') || nameLower.includes('beer') ||
      nameLower.includes('wine')) {
    return 'bar, food';
  }

  return 'restaurant, food';
}

function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-jem';
}

async function findExistingThumbnail(name) {
  const searchName = name.toLowerCase().trim();
  const { data } = await supabase
    .from('mall_outlets')
    .select('thumbnail_url, name')
    .not('thumbnail_url', 'is', null)
    .limit(1000);

  if (data) {
    for (const outlet of data) {
      if (outlet.name.toLowerCase().trim() === searchName && outlet.thumbnail_url) {
        return outlet.thumbnail_url;
      }
    }
    for (const outlet of data) {
      const outletName = outlet.name.toLowerCase().trim();
      if ((searchName.includes(outletName) || outletName.includes(searchName)) &&
          outlet.thumbnail_url && searchName.length > 3 && outletName.length > 3) {
        return outlet.thumbnail_url;
      }
    }
  }
  return null;
}

async function findExistingOpeningHours(name) {
  const searchName = name.toLowerCase().trim();
  const { data } = await supabase
    .from('mall_outlets')
    .select('opening_hours, name')
    .not('opening_hours', 'is', null)
    .limit(1000);

  if (data) {
    for (const outlet of data) {
      if (outlet.name.toLowerCase().trim() === searchName && outlet.opening_hours) {
        return outlet.opening_hours;
      }
    }
  }
  return null;
}

async function scrapeJem() {
  console.log('=== SCRAPING JEM ===\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('Loading JEM store directory...');
    await page.goto('https://www.jem.sg/store-directory/', {
      waitUntil: 'domcontentloaded',
      timeout: 90000
    });

    await page.waitForTimeout(5000);

    // Try to find and click on Food & Beverages category filter
    console.log('Looking for F&B filter...');
    try {
      const fnbFilter = await page.$('text=Food & Beverages, text=F&B, text=Dining, [data-category*="food"], button:has-text("Food")');
      if (fnbFilter) {
        await fnbFilter.click();
        console.log('Clicked F&B filter');
        await page.waitForTimeout(3000);
      }
    } catch (e) {
      console.log('No F&B filter found, will filter manually');
    }

    // Scroll to load all stores
    console.log('Scrolling to load all stores...');
    for (let i = 0; i < 30; i++) {
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(300);
    }
    await page.waitForTimeout(3000);

    // Try clicking "Load More" if exists
    for (let i = 0; i < 20; i++) {
      try {
        const loadMore = await page.$('button:has-text("Load More"), a:has-text("Load More"), [class*="load-more"]');
        if (loadMore) {
          await loadMore.click();
          console.log(`  Clicked Load More (${i + 1})`);
          await page.waitForTimeout(2000);
        } else {
          break;
        }
      } catch (e) {
        break;
      }
    }

    // Extract stores - JEM uses .directory-card with specific structure
    const stores = await page.evaluate(() => {
      const results = [];
      const seen = new Set();

      // JEM structure: .directory-card with category badge, store name in a > span, unit after location-dot icon
      document.querySelectorAll('.directory-card').forEach(card => {
        // Get category from badge
        const categoryEl = card.querySelector('.rounded-full');
        const category = categoryEl?.textContent?.trim().toLowerCase() || '';

        // Get name - it's in the link text
        const nameLink = card.querySelector('a.inline-flex span, a[href*="store-directory"] span');
        const name = nameLink?.textContent?.trim();

        if (!name || name.length < 2) return;

        // Get unit - it's in a span after the location-dot icon
        const locationSpans = card.querySelectorAll('.flex span');
        let unit = '';
        for (const span of locationSpans) {
          const text = span.textContent?.trim();
          if (text && text.startsWith('#')) {
            unit = text;
            break;
          }
        }

        // Get image
        const img = card.querySelector('img');
        let imageUrl = img?.src;
        if (imageUrl && imageUrl.startsWith('data:')) imageUrl = null;

        const key = name.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          results.push({
            name,
            unit,
            category,
            imageUrl
          });
        }
      });

      return results;
    });

    console.log(`Found ${stores.length} stores`);

    // Filter for F&B only - JEM uses "Food & Beverages" category badge
    const junkNames = ['home', 'about', 'contact', 'store directory', 'events', 'news'];

    const fnbStores = stores.filter(s => {
      const nameLower = s.name.toLowerCase();
      if (junkNames.some(j => nameLower === j)) return false;
      if (s.name.length < 2) return false;

      // Check if category indicates F&B (JEM uses "food & beverages")
      if (s.category.includes('food') || s.category.includes('beverage')) return true;

      return false;
    });

    if (fnbStores.length === 0) {
      console.log('No F&B stores found via scraping, saving debug...');
      await page.screenshot({ path: 'jem-debug.png', fullPage: true });
      const html = await page.content();
      require('fs').writeFileSync('jem-debug.html', html);
      await browser.close();
      return;
    }

    // Print found stores
    console.log(`\nF&B outlets: ${fnbStores.length}`);
    for (const store of fnbStores) {
      console.log(`  - ${store.name} (${store.unit || 'no unit'}) ${store.imageUrl ? '✓img' : ''}`);
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
    for (const store of fnbStores) {
      let thumbnail = store.imageUrl || null;
      let hours = null;

      if (!thumbnail) {
        thumbnail = await findExistingThumbnail(store.name);
        if (thumbnail) console.log(`    Found existing thumbnail for ${store.name}`);
      }

      hours = await findExistingOpeningHours(store.name);
      if (hours) console.log(`    Found existing hours for ${store.name}`);

      const { error } = await supabase
        .from('mall_outlets')
        .insert({
          id: generateId(store.name),
          name: store.name,
          mall_id: MALL_ID,
          level: store.unit || '',
          category: getCategory(store.name),
          thumbnail_url: thumbnail,
          opening_hours: hours,
          tags: []
        });

      if (!error) {
        imported++;
        console.log(`  ✓ ${store.name} (${store.unit || 'no unit'})`);
      } else {
        console.log(`  ✗ ${store.name} - ${error.message}`);
      }
    }

    console.log(`\n=== COMPLETE ===`);
    console.log(`Imported: ${imported}/${fnbStores.length} outlets`);

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'jem-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

scrapeJem();
