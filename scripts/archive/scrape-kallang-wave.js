const { chromium } = require('playwright');
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MALL_ID = 'kallang-wave-mall';

function getCategory(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('tea') || nameLower.includes('chicha') || nameLower.includes('juice') ||
      nameLower.includes('boost') || nameLower.includes('lickers') || nameLower.includes('amps')) {
    return 'drinks, food';
  }
  if (nameLower.includes('coffee') || nameLower.includes('cafe') || nameLower.includes('café') ||
      nameLower.includes('starbucks') || nameLower.includes('toast')) {
    return 'cafe, food';
  }
  if (nameLower.includes('bakery') || nameLower.includes('bread') || nameLower.includes('cake')) {
    return 'bakery, food';
  }
  if (nameLower.includes('bar') || nameLower.includes('sake') || nameLower.includes('beer') ||
      nameLower.includes('pub') || nameLower.includes('grill')) {
    return 'bar, food';
  }
  if (nameLower.includes('sushi') || nameLower.includes('japanese') || nameLower.includes('ramen') ||
      nameLower.includes('don') || nameLower.includes('izakaya')) {
    return 'japanese, food';
  }
  if (nameLower.includes('korean') || nameLower.includes('bbq') || nameLower.includes('kim')) {
    return 'korean, food';
  }
  if (nameLower.includes('chinese') || nameLower.includes('dim sum') || nameLower.includes('hotpot')) {
    return 'chinese, food';
  }
  if (nameLower.includes('thai')) {
    return 'thai, food';
  }
  if (nameLower.includes('penyet') || nameLower.includes('indonesian') || nameLower.includes('ayam')) {
    return 'indonesian, food';
  }
  if (nameLower.includes('western') || nameLower.includes('astons') || nameLower.includes('steak') ||
      nameLower.includes('capone')) {
    return 'western, food';
  }
  if (nameLower.includes('fast food') || nameLower.includes('mcdonald') || nameLower.includes('kfc')) {
    return 'fast food, food';
  }
  if (nameLower.includes('food court') || nameLower.includes('kopitiam') || nameLower.includes('foodcourt')) {
    return 'food court, food';
  }

  return 'restaurant, food';
}

function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-kallang-wave-mall';
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

async function scrapeKallangWave() {
  console.log('=== SCRAPING KALLANG WAVE MALL ===\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const allStores = [];
    const seen = new Set();

    // Scrape all 5 pages
    for (let pageNum = 0; pageNum < 5; pageNum++) {
      console.log(`Loading page ${pageNum + 1}...`);
      const url = `https://www.thekallang.com.sg/shop-dine/stores?store_id=181&venue=All&payment_methods=All&earning_rate=All&combine=&custom_az_filter=character_asc&page=${pageNum}`;

      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 90000
      });

      await page.waitForTimeout(5000);

      // Extract stores from current page
      const stores = await page.evaluate(() => {
        const results = [];

        // Find store cards - they typically have store name and unit number
        document.querySelectorAll('.store-item, .shop-item, article, [class*="store"], [class*="card"]').forEach(card => {
          const nameEl = card.querySelector('h2, h3, h4, .title, .name, [class*="title"], [class*="name"]');
          const name = nameEl?.textContent?.trim();

          if (!name || name.length < 2) return;

          // Get unit number
          let unit = '';
          const unitMatch = card.textContent?.match(/#[\dB][\d-A-Za-z\/&\s]+/);
          if (unitMatch) {
            unit = unitMatch[0].trim();
          }

          // Get image
          const img = card.querySelector('img');
          const imageUrl = img?.src && !img.src.startsWith('data:') ? img.src : null;

          results.push({ name, unit, imageUrl });
        });

        return results;
      });

      console.log(`  Found ${stores.length} stores on page ${pageNum + 1}`);

      for (const store of stores) {
        const key = store.name.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          allStores.push(store);
        }
      }
    }

    console.log(`\nTotal unique stores: ${allStores.length}`);

    // Filter for F&B only
    const junkNames = ['home', 'about', 'contact', 'shop', 'stores', 'mall'];
    const fnbStores = allStores.filter(s =>
      s.name.length > 2 &&
      !junkNames.some(j => s.name.toLowerCase() === j)
    );

    if (fnbStores.length === 0) {
      console.log('No stores found, saving debug screenshot...');
      await page.screenshot({ path: 'kallang-wave-debug.png', fullPage: true });
      await browser.close();
      return;
    }

    // Print found stores
    console.log('\nF&B outlets:');
    for (const store of fnbStores) {
      console.log(`  - ${store.name} (${store.unit || 'no unit'}) ${store.imageUrl ? '✓img' : ''}`);
    }

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
    for (const store of fnbStores) {
      let thumbnail = store.imageUrl || null;
      let hours = null;

      if (!thumbnail) {
        thumbnail = await findExistingThumbnail(store.name);
        if (thumbnail) console.log(`    Found existing thumbnail for ${store.name}`);
      }

      hours = await findExistingOpeningHours(store.name);
      if (hours) console.log(`    Found existing hours for ${store.name}`);

      const category = getCategory(store.name);

      const { error } = await supabase
        .from('mall_outlets')
        .insert({
          id: generateId(store.name),
          name: store.name,
          mall_id: MALL_ID,
          level: store.unit || '',
          category: category,
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
    await page.screenshot({ path: 'kallang-wave-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

scrapeKallangWave();
