const { chromium } = require('playwright');
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MALL_ID = 'velocity-novena-square';

function getCategory(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('chicha') || nameLower.includes('mr. coconut') || nameLower.includes('old tea hut') ||
      nameLower.includes('playmade') || nameLower.includes('nunsaram')) {
    return 'drinks, food';
  }
  if (nameLower.includes('starbucks') || nameLower.includes('coffee bean') || nameLower.includes('café') ||
      nameLower.includes('cafe') || nameLower.includes('love, joy')) {
    return 'cafe, food';
  }
  if (nameLower.includes('breadtalk') || nameLower.includes('four leaves') || nameLower.includes('old chang kee') ||
      nameLower.includes('toast & roll') || nameLower.includes('swee heng') || nameLower.includes('donut') ||
      nameLower.includes('twist & buckle')) {
    return 'bakery, food';
  }
  if (nameLower.includes('mei heong') || nameLower.includes('dessert') || nameLower.includes('pancake')) {
    return 'desserts, food';
  }
  if (nameLower.includes('kfc') || nameLower.includes('subway') || nameLower.includes('guzman') ||
      nameLower.includes('wok hey')) {
    return 'fast food, food';
  }
  if (nameLower.includes('sushi') || nameLower.includes('ichiban') || nameLower.includes('tori-q') ||
      nameLower.includes('omoté') || nameLower.includes('unatoto') || nameLower.includes('tomi')) {
    return 'japanese, food';
  }
  if (nameLower.includes('korean') || nameLower.includes('k-food') || nameLower.includes('hana')) {
    return 'korean, food';
  }
  if (nameLower.includes('din tai fung') || nameLower.includes('tunglok') || nameLower.includes('xin wang') ||
      nameLower.includes('hunan') || nameLower.includes('congee') || nameLower.includes('hundred grains') ||
      nameLower.includes('nong geng') || nameLower.includes('mun zuk')) {
    return 'chinese, food';
  }
  if (nameLower.includes('thai') || nameLower.includes('a-roy')) {
    return 'thai, food';
  }
  if (nameLower.includes('pho') || nameLower.includes('so pho')) {
    return 'vietnamese, food';
  }
  if (nameLower.includes('curry times') || nameLower.includes('monster curry')) {
    return 'local, food';
  }
  if (nameLower.includes('josh') || nameLower.includes('grill') || nameLower.includes('salad') ||
      nameLower.includes('soup spoon') || nameLower.includes('poke')) {
    return 'western, food';
  }
  if (nameLower.includes('bak kut teh') || nameLower.includes('song fa') || nameLower.includes('toast box') ||
      nameLower.includes("han's") || nameLower.includes('mmmm')) {
    return 'local, food';
  }
  if (nameLower.includes('cookhouse') || nameLower.includes('koufu') || nameLower.includes('food court')) {
    return 'food court, food';
  }

  return 'restaurant, food';
}

function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-velocity-novena-square';
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

async function scrapeVelocityNovena() {
  console.log('=== SCRAPING VELOCITY @ NOVENA SQUARE ===\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('Loading Velocity @ Novena F&B page...');
    await page.goto('https://www.velocitynovena.com/tenant-category/food-beverages/', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    await page.waitForTimeout(3000);

    // Scroll to load all stores
    console.log('Scrolling to load all stores...');
    for (let i = 0; i < 20; i++) {
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(300);
    }
    await page.waitForTimeout(2000);

    // Use the known F&B list from the website (scraped via WebFetch)
    console.log('Using verified F&B list from website...');
    const fnbStores = [
        { name: "A-Roy Thai Restaurant", unit: "#03-61/62/63/64" },
        { name: "BreadTalk", unit: "#01-26" },
        { name: "CHICHA San Chen", unit: "#01-07" },
        { name: "Cookhouse by Koufu", unit: "#03-47/56" },
        { name: "Curry Times", unit: "#02-33/34/41/42" },
        { name: "Din Tai Fung", unit: "#01-05/06" },
        { name: "Four Leaves", unit: "#01-77/78" },
        { name: "Guzman Y Gomez", unit: "#01-68/69" },
        { name: "Han's Café", unit: "#01-19/21" },
        { name: "Hana K-Food", unit: "#02-25" },
        { name: "Hundred Grains", unit: "#01-89/90" },
        { name: "Ichiban Boshi", unit: "#02-13/14" },
        { name: "Josh's Grill", unit: "#02-68/72" },
        { name: "KFC", unit: "#01-16/18" },
        { name: "Love, Joy & Coffee", unit: "#02-K9" },
        { name: "Mei Heong Yuen Dessert", unit: "#02-03" },
        { name: "Mister Donut", unit: "#01-72/73" },
        { name: "Mmmm!", unit: "#01-79/81" },
        { name: "Monster Curry", unit: "#02-78/79" },
        { name: "Mr. Coconut", unit: "#02-53A" },
        { name: "Mun Zuk by Li Fang Congee", unit: "#01-86/87" },
        { name: "Munchi Pancakes", unit: "#02-10" },
        { name: "Nong Geng Ji Hunan Cuisine", unit: "#03-11" },
        { name: "Nunsaram Korean Dessert Café", unit: "#01-54/55" },
        { name: "Old Chang Kee", unit: "#01-70/71" },
        { name: "Old Tea Hut", unit: "#03-K1" },
        { name: "Omoté", unit: "#03-09/10" },
        { name: "PlayMade", unit: "#02-52" },
        { name: "Poke Theory", unit: "#01-53" },
        { name: "SaladStop!", unit: "#02-24" },
        { name: "So Pho", unit: "#02-43/45" },
        { name: "Song Fa Bak Kut Teh", unit: "#01-56/57/58" },
        { name: "Starbucks Coffee", unit: "#02-K7/K8" },
        { name: "Subway", unit: "#02-28/29" },
        { name: "The Coffee Bean & Tea Leaf", unit: "#02-04/K1" },
        { name: "The Soup Spoon Union", unit: "#01-62/63" },
        { name: "Toast & Roll by Swee Heng", unit: "#01-91/92" },
        { name: "Toast Box", unit: "#01-15" },
        { name: "TOMI SUSHI", unit: "#02-73/77" },
        { name: "Tori-Q", unit: "#01-88" },
        { name: "TungLok Peking Duck", unit: "#02-11/12" },
        { name: "Twist & Buckle", unit: "#01-26A" },
        { name: "UNATOTO", unit: "#01-84/85" },
        { name: "Wok Hey", unit: "#01-23" },
        { name: "Xin Wang Hong Kong Cafe", unit: "#01-08/09" }
    ];

    console.log(`\nF&B outlets to import: ${fnbStores.length}`);

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

      // Try to find existing thumbnail if none scraped
      if (!thumbnail) {
        thumbnail = await findExistingThumbnail(store.name);
        if (thumbnail) console.log(`    Found existing thumbnail for ${store.name}`);
      }

      // Try to find existing opening hours
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
    await page.screenshot({ path: 'velocity-novena-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

scrapeVelocityNovena();
