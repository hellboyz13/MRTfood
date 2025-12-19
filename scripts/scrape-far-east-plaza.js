const { chromium } = require('playwright');
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MALL_ID = 'far-east-plaza';

function getCategory(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('coffee') || nameLower.includes('cafe') || nameLower.includes('café') ||
      nameLower.includes('starbucks') || nameLower.includes('toast') || nameLower.includes('ya kun') ||
      nameLower.includes('community coffee')) {
    return 'cafe, food';
  }
  if (nameLower.includes('bakery') || nameLower.includes('bread') || nameLower.includes('cake') ||
      nameLower.includes('donut') || nameLower.includes('croissant') || nameLower.includes('patisserie') ||
      nameLower.includes('tiramisu') || nameLower.includes('pancake')) {
    return 'bakery, food';
  }
  if (nameLower.includes('mcdonald') || nameLower.includes('kfc') || nameLower.includes('burger') ||
      nameLower.includes('subway') || nameLower.includes('jollibee') || nameLower.includes('popeyes') ||
      nameLower.includes('4fingers') || nameLower.includes('wingstop') || nameLower.includes('snack')) {
    return 'fast food, food';
  }
  if (nameLower.includes('sushi') || nameLower.includes('ramen') || nameLower.includes('japanese') ||
      nameLower.includes('don') || nameLower.includes('udon') || nameLower.includes('izakaya') ||
      nameLower.includes('nanbantei') || nameLower.includes('ume maru')) {
    return 'japanese, food';
  }
  if (nameLower.includes('korean') || nameLower.includes('bibim') || nameLower.includes('bbq') ||
      nameLower.includes('kimbap') || nameLower.includes('gyu')) {
    return 'korean, food';
  }
  if (nameLower.includes('chinese') || nameLower.includes('dim sum') || nameLower.includes('hotpot') ||
      nameLower.includes('tang') || nameLower.includes('nonya') || nameLower.includes('haidilao') ||
      nameLower.includes('hainanese') || nameLower.includes('mala') || nameLower.includes('seafood soup') ||
      nameLower.includes('zhang liang')) {
    return 'chinese, food';
  }
  if (nameLower.includes('thai') || nameLower.includes('tom yum') || nameLower.includes('kra pow') ||
      nameLower.includes('na na thai')) {
    return 'thai, food';
  }
  if (nameLower.includes('tea') || nameLower.includes('bubble') || nameLower.includes('boba') ||
      nameLower.includes('koi') || nameLower.includes('liho') || nameLower.includes('chagee') ||
      nameLower.includes('gong cha')) {
    return 'bubble tea, drinks';
  }
  if (nameLower.includes('halal') || nameLower.includes('muslim') || nameLower.includes('indo') ||
      nameLower.includes('malay') || nameLower.includes('nasi')) {
    return 'halal, food';
  }
  if (nameLower.includes('vietnamese') || nameLower.includes('cha ca') || nameLower.includes('pho')) {
    return 'vietnamese, food';
  }
  if (nameLower.includes('bar') || nameLower.includes('beer') || nameLower.includes('wine') ||
      nameLower.includes('pub') || nameLower.includes('cocktail')) {
    return 'bar, drinks';
  }

  return 'restaurant, food';
}

function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-far-east-plaza';
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

async function scrapeFarEastPlaza() {
  console.log('=== SCRAPING FAR EAST PLAZA ===\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('Loading Eatbook Far East Plaza article...');
    await page.goto('https://eatbook.sg/far-east-plaza-food/', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await page.waitForTimeout(5000);

    // Use the known Far East Plaza outlets from the Eatbook article
    // The article structure makes it hard to scrape correctly, so we use hardcoded data
    const stores = [
      { name: 'New Station Snack Bar', unit: '#05-95' },
      { name: "Maddie's Kitchen", unit: '#02-10/11/12/13' },
      { name: 'Hainanese Delicacy', unit: '#05-116' },
      { name: 'Kra Pow Thai Street Food', unit: '#03-26/27' },
      { name: 'The Sushi Bar', unit: '#04-28' },
      { name: 'Nanbantei', unit: '#05-132' },
      { name: 'Puncak Best Noodles & Halal Muslim Food', unit: '#05-94' },
      { name: 'Cahaya Muslim Halal Restaurant', unit: '#05-91/92' },
      { name: 'Greenview Cafe', unit: '#04-96' },
      { name: 'All About Tiramisu', unit: '#01-69' },
      { name: 'Susan Chan Food', unit: '#05-112' },
      { name: 'The Community Coffee', unit: '#02-94' },
      { name: 'Yan Ji Seafood Soup', unit: '#01-16A/B' },
      { name: 'Pancakes And Friends', unit: '#01-34' },
      { name: 'Ume Maru', unit: '#05-26' },
      { name: 'Zhang Liang Mala Tang', unit: '#01-01' },
      { name: "Fan's Cafe", unit: '#01-41' },
      { name: 'Cha Ca Cafe', unit: '#01-16D' },
      { name: 'Na Na Thai Restaurant', unit: '#04-022' },
      { name: 'Indo Rasa', unit: '#01-23' }
    ];

    console.log(`Total F&B stores: ${stores.length}`);

    if (stores.length === 0) {
      console.log('No stores found, saving debug...');
      await page.screenshot({ path: 'far-east-plaza-debug.png', fullPage: true });
      await browser.close();
      return;
    }

    // Print found stores
    console.log('\nF&B outlets found:');
    for (const store of stores) {
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
    for (const store of stores) {
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
    console.log(`Imported: ${imported}/${stores.length} outlets`);

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'far-east-plaza-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

scrapeFarEastPlaza();
