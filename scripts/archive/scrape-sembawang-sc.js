const { chromium } = require('playwright');
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const MALL_ID = 'sembawang-shopping-centre';

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
    + '-sembawang-sc';
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

async function scrapeSembawangSC() {
  console.log('=== SCRAPING SEMBAWANG SHOPPING CENTRE ===\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Load the Food and Beverage category (term-id 6)
    console.log('Loading Sembawang SC Food & Beverage stores...');
    await page.goto('https://www.sembawangsc.com.sg/store/', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await page.waitForTimeout(3000);

    // Scroll to load all content
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(200);
    }
    await page.waitForTimeout(2000);

    // Extract only F&B stores (store-term-id-6)
    const stores = await page.evaluate(() => {
      const results = [];

      document.querySelectorAll('.shop-2').forEach(shop => {
        // Check if it's Food and Beverage (term-id-6)
        if (!shop.classList.contains('store-term-id-6')) return;

        const nameEl = shop.querySelector('.name');
        const unitEl = shop.querySelector('.unit-number');
        const hoursEl = shop.querySelector('.opening-hours');
        const imgEl = shop.querySelector('.logo img');

        if (nameEl) {
          results.push({
            name: nameEl.textContent?.trim(),
            level: unitEl?.textContent?.trim() || '',
            openingHours: hoursEl?.textContent?.trim() || '',
            imageUrl: imgEl?.src || null
          });
        }
      });

      return results;
    });

    console.log(`Found ${stores.length} food outlets`);

    if (stores.length === 0) {
      console.log('No stores found, saving debug...');
      await page.screenshot({ path: 'sembawang-debug.png', fullPage: true });
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
    for (const store of stores) {
      let thumbnail = store.imageUrl;
      let hours = store.openingHours;

      if (!thumbnail) {
        thumbnail = await findExistingThumbnail(store.name);
        if (thumbnail) console.log(`    Found existing thumbnail for ${store.name}`);
      }
      if (!hours) {
        hours = await findExistingOpeningHours(store.name);
        if (hours) console.log(`    Found existing hours for ${store.name}`);
      }

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
    await page.screenshot({ path: 'sembawang-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

scrapeSembawangSC();
