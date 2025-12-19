const { chromium } = require('playwright');
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MALL_ID = 'northshore-plaza-i-ii';

function getCategory(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('coffee bean') || nameLower.includes('grove cafe') ||
      nameLower.includes('daily staple') || nameLower.includes('vs cafe')) {
    return 'cafe, food';
  }
  if (nameLower.includes('fun toast') || nameLower.includes('swee heng') ||
      nameLower.includes('bakery')) {
    return 'bakery, food';
  }
  if (nameLower.includes('creamier') || nameLower.includes('blackball') ||
      nameLower.includes('koi') || nameLower.includes('dessert')) {
    return 'desserts, food';
  }
  if (nameLower.includes('mcdonald') || nameLower.includes('a&w') ||
      nameLower.includes('4fingers') || nameLower.includes('little caesars') ||
      nameLower.includes('pizza')) {
    return 'fast food, food';
  }
  if (nameLower.includes('sushi') || nameLower.includes('gaku') ||
      nameLower.includes('tsuta') || nameLower.includes('ramen')) {
    return 'japanese, food';
  }
  if (nameLower.includes('pho') || nameLower.includes('mrs pho')) {
    return 'vietnamese, food';
  }
  if (nameLower.includes('thai') || nameLower.includes('took lae dee')) {
    return 'thai, food';
  }
  if (nameLower.includes('hai di lao') || nameLower.includes('hotpot') ||
      nameLower.includes('hot pot')) {
    return 'chinese, food';
  }
  if (nameLower.includes('gurney') || nameLower.includes('nasi lemak') ||
      nameLower.includes('ayam') || nameLower.includes('oyster cake') ||
      nameLower.includes('super wok')) {
    return 'local, food';
  }
  if (nameLower.includes('crab') || nameLower.includes('dancing crab') ||
      nameLower.includes('seafood')) {
    return 'seafood, food';
  }
  if (nameLower.includes('slappy') || nameLower.includes('pancake') ||
      nameLower.includes('wrapps') || nameLower.includes('downstairs') ||
      nameLower.includes('well collective')) {
    return 'western, food';
  }
  if (nameLower.includes('nomstar') || nameLower.includes('cantine') ||
      nameLower.includes('food court')) {
    return 'food court, food';
  }

  return 'restaurant, food';
}

function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-northshore-plaza';
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

async function scrapeNorthshorePlaza() {
  console.log('=== SCRAPING NORTHSHORE PLAZA I & II ===\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Consolidated F&B list from all Northshore Plaza pages
    // Northshore Plaza 1 outlets
    const plaza1Outlets = [
      { name: "Little Caesars Pizza", unit: "Northshore Plaza 1", plaza: 1 },
      { name: "McDonald's", unit: "Northshore Plaza 1", plaza: 1 },
      { name: "Grove Cafe", unit: "Northshore Plaza 1", plaza: 1 },
      { name: "Downstairs", unit: "Northshore Plaza 1", plaza: 1 },
      { name: "Daily Staple", unit: "Northshore Plaza 1", plaza: 1 },
      { name: "Hai Di Lao Hot Pot", unit: "Northshore Plaza 1", plaza: 1 },
      { name: "The Coffee Bean & Tea Leaf", unit: "Northshore Plaza 1", plaza: 1 },
      { name: "Fun Toast", unit: "Northshore Plaza 1", plaza: 1 },
      { name: "Swee Heng 1989 Classic", unit: "Northshore Plaza 1", plaza: 1 },
      { name: "KOI Thé", unit: "Northshore Plaza 1", plaza: 1 },
      { name: "Blackball", unit: "Northshore Plaza 1", plaza: 1 },
      { name: "Sixth Floor Oyster Cake", unit: "Northshore Plaza 1", plaza: 1 },
      { name: "Simply Wrapps", unit: "Northshore Plaza 1", plaza: 1 },
      { name: "Super Wok", unit: "Northshore Plaza 1", plaza: 1 },
      { name: "Thai Lae Dee", unit: "Northshore Plaza 1", plaza: 1 }
    ];

    // Northshore Plaza 2 outlets
    const plaza2Outlets = [
      { name: "4Fingers Crispy Chicken", unit: "Northshore Plaza 2", plaza: 2 },
      { name: "Gaku Sushi Bar", unit: "Northshore Plaza 2", plaza: 2 },
      { name: "Dancing Crab Singapore", unit: "Northshore Plaza 2", plaza: 2 },
      { name: "A&W", unit: "Northshore Plaza 2", plaza: 2 },
      { name: "Gurney Drive", unit: "Northshore Plaza 2", plaza: 2 },
      { name: "Mrs Pho", unit: "Northshore Plaza 2", plaza: 2 },
      { name: "VS Cafe", unit: "Northshore Plaza 2", plaza: 2 },
      { name: "Slappy Cakes", unit: "Northshore Plaza 2", plaza: 2 },
      { name: "Took Lae Dee", unit: "Northshore Plaza 2", plaza: 2 },
      { name: "Tsuta Ramen", unit: "Northshore Plaza 2", plaza: 2 },
      { name: "Nasi Lemak Ayam Taliwang", unit: "Northshore Plaza 2", plaza: 2 },
      { name: "Creamier", unit: "Northshore Plaza 2", plaza: 2 },
      { name: "Well Collective", unit: "Northshore Plaza 2", plaza: 2 },
      { name: "Nomstar", unit: "Northshore Plaza 2", plaza: 2 },
      { name: "Cantine", unit: "Northshore Plaza 2", plaza: 2 }
    ];

    const fnbStores = [...plaza1Outlets, ...plaza2Outlets];

    console.log(`Total F&B outlets: ${fnbStores.length}`);
    console.log(`  Plaza 1: ${plaza1Outlets.length}`);
    console.log(`  Plaza 2: ${plaza2Outlets.length}`);

    // Try to scrape individual pages for more details (images, unit numbers)
    console.log('\nAttempting to scrape outlet details...');

    for (const store of fnbStores) {
      try {
        const slug = store.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
        const url = `https://northshoreplazasg.com/listing/${slug}/`;

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
        await page.waitForTimeout(500);

        const details = await page.evaluate(() => {
          // Try to find unit number
          const unitEl = document.querySelector('.listing-address, .unit, [class*="address"], [class*="location"]');
          const unit = unitEl?.textContent?.trim();

          // Try to find image
          const img = document.querySelector('.listing-featured-image img, .featured-image img, article img');
          const imageUrl = img?.src && !img.src.startsWith('data:') ? img.src : null;

          return { unit, imageUrl };
        });

        if (details.unit && details.unit.includes('#')) {
          store.unit = details.unit;
        }
        if (details.imageUrl) {
          store.imageUrl = details.imageUrl;
        }
      } catch (e) {
        // Individual page failed, continue with basic data
      }
    }

    // Print found stores
    console.log('\nF&B outlets:');
    for (const store of fnbStores) {
      console.log(`  - ${store.name} (${store.unit}) ${store.imageUrl ? '✓img' : ''}`);
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
    await page.screenshot({ path: 'northshore-plaza-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

scrapeNorthshorePlaza();
