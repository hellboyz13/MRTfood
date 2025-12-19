const { chromium } = require('playwright');
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const MALL_ID = 'the-woodleigh-mall';

// Food-related categories from Woodleigh Mall
const FOOD_CATEGORIES = [
  'food court, restaurant & cafes',
  'confectionery, specialties & snacks',
  'supermarket'
];

function isFoodCategory(category) {
  if (!category) return false;
  const cat = category.toLowerCase();
  return cat.includes('food') || cat.includes('restaurant') ||
         cat.includes('cafe') || cat.includes('confection') ||
         cat.includes('snack');
}

function getCategory(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('coffee') || nameLower.includes('cafe') || nameLower.includes('café') ||
      nameLower.includes('starbucks') || nameLower.includes('toast') || nameLower.includes('ya kun')) {
    return 'cafe, food';
  }
  if (nameLower.includes('bakery') || nameLower.includes('bread') || nameLower.includes('cake') ||
      nameLower.includes('donut') || nameLower.includes('croissant') || nameLower.includes('patisserie')) {
    return 'bakery, food';
  }
  if (nameLower.includes('mcdonald') || nameLower.includes('kfc') || nameLower.includes('burger') ||
      nameLower.includes('subway') || nameLower.includes('jollibee') || nameLower.includes('popeyes')) {
    return 'fast food, food';
  }
  if (nameLower.includes('sushi') || nameLower.includes('ramen') || nameLower.includes('japanese') ||
      nameLower.includes('don') || nameLower.includes('udon') || nameLower.includes('izakaya')) {
    return 'japanese, food';
  }
  if (nameLower.includes('korean') || nameLower.includes('bibim') || nameLower.includes('bbq') ||
      nameLower.includes('kimbap') || nameLower.includes('gyu')) {
    return 'korean, food';
  }
  if (nameLower.includes('chinese') || nameLower.includes('dim sum') || nameLower.includes('hotpot') ||
      nameLower.includes('tang') || nameLower.includes('nonya')) {
    return 'chinese, food';
  }
  if (nameLower.includes('thai') || nameLower.includes('tom yum')) {
    return 'thai, food';
  }
  if (nameLower.includes('tea') || nameLower.includes('bubble') || nameLower.includes('boba') ||
      nameLower.includes('koi') || nameLower.includes('liho') || nameLower.includes('chagee')) {
    return 'bubble tea, drinks';
  }

  return 'restaurant, food';
}

function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-woodleigh-mall';
}

async function findExistingThumbnail(name) {
  const searchName = name.toLowerCase().trim();
  const { data } = await supabase
    .from('mall_outlets')
    .select('thumbnail_url, name')
    .not('thumbnail_url', 'is', null)
    .limit(500);

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
    .limit(500);

  if (data) {
    for (const outlet of data) {
      if (outlet.name.toLowerCase().trim() === searchName && outlet.opening_hours) {
        return outlet.opening_hours;
      }
    }
  }
  return null;
}

async function scrapeWoodleighMall() {
  console.log('=== SCRAPING THE WOODLEIGH MALL ===\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('Loading Woodleigh Mall stores page...');
    await page.goto('https://www.thewoodleighmall.com/stores', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    await page.waitForTimeout(5000);

    // Scroll to load all content
    for (let i = 0; i < 20; i++) {
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(200);
    }
    await page.waitForTimeout(2000);

    // Extract stores from the page
    const stores = await page.evaluate(() => {
      const results = [];

      // Food category IDs
      const foodCategoryIds = ['4qph6p8sbtzfj3t5z1gavnaxw6', '440w6n2r7ab9rspwrbcp1gvpcn'];

      // Look for dataCard elements with data-category
      document.querySelectorAll('.dataCard, [class*="dataCard"]').forEach(card => {
        const category = card.getAttribute('data-category') || '';
        const level = card.getAttribute('data-level') || '';

        // Check if it's food related
        const isFood = foodCategoryIds.some(id => category.includes(id));

        if (isFood) {
          const nameEl = card.querySelector('.store-card__name, h5, h4, h3');
          const imgEl = card.querySelector('img');

          if (nameEl) {
            results.push({
              name: nameEl.textContent?.trim(),
              level: level,
              imageUrl: imgEl?.src || null,
              category
            });
          }
        }
      });

      return results;
    });

    console.log(`Found ${stores.length} food stores from main page`);


    // Deduplicate
    const uniqueStores = [];
    const seenNames = new Set();
    for (const store of stores) {
      const key = store.name.toLowerCase().trim();
      if (!seenNames.has(key) && key.length > 2) {
        seenNames.add(key);
        uniqueStores.push(store);
      }
    }

    console.log(`\nUnique food stores: ${uniqueStores.length}`);

    if (uniqueStores.length === 0) {
      console.log('No stores found, saving debug...');
      await page.screenshot({ path: 'woodleigh-debug.png', fullPage: true });
      const html = await page.content();
      require('fs').writeFileSync('woodleigh-debug.html', html);
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
      let thumbnail = store.imageUrl;
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
          level: store.level || '',
          category: getCategory(store.name),
          thumbnail_url: thumbnail,
          opening_hours: hours,
          tags: []
        });

      if (!error) {
        imported++;
        console.log(`  Imported: ${store.name} (${store.level || 'no unit'})`);
      } else {
        console.log(`  Error importing ${store.name}: ${error.message}`);
      }
    }

    console.log(`\n=== COMPLETE ===`);
    console.log(`Imported: ${imported} outlets`);

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'woodleigh-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

scrapeWoodleighMall();
