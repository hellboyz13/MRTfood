const { chromium } = require('playwright');
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MALL_ID = 'marina-square';

function getCategory(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('7-eleven') || nameLower.includes('convenience')) {
    return 'convenience, food';
  }
  if (nameLower.includes('starbucks') || nameLower.includes('coffee bean') || nameLower.includes('dal.komm') ||
      nameLower.includes('kith') || nameLower.includes('luckin') || nameLower.includes('tanamera') ||
      nameLower.includes('ya kun') || nameLower.includes('café') || nameLower.includes('cafe') ||
      nameLower.includes('luli tea')) {
    return 'cafe, food';
  }
  if (nameLower.includes('bakery') || nameLower.includes('paris baguette') || nameLower.includes('breadtalk') ||
      nameLower.includes('cookie') || nameLower.includes('nasty')) {
    return 'bakery, food';
  }
  if (nameLower.includes('juice') || nameLower.includes('chicha') || nameLower.includes('tea house') ||
      nameLower.includes('bubble tea')) {
    return 'drinks, food';
  }
  if (nameLower.includes('ice cream') || nameLower.includes('betsubara') || nameLower.includes('pancake') ||
      nameLower.includes('dessert')) {
    return 'desserts, food';
  }
  if (nameLower.includes('mcdonald') || nameLower.includes('burger king') || nameLower.includes('kfc') ||
      nameLower.includes('popeyes') || nameLower.includes('kenny rogers')) {
    return 'fast food, food';
  }
  if (nameLower.includes('sushi') || nameLower.includes('gyu-kaku') || nameLower.includes('japanese') ||
      nameLower.includes('kaisendon') || nameLower.includes('mazesoba') || nameLower.includes('sukiya') ||
      nameLower.includes('suki-ya') || nameLower.includes('tenkaichi')) {
    return 'japanese, food';
  }
  if (nameLower.includes('korean') || nameLower.includes('bhc') || nameLower.includes('seoul') ||
      nameLower.includes('hannaembi') || nameLower.includes('topokki') || nameLower.includes('shine korea')) {
    return 'korean, food';
  }
  if (nameLower.includes('dim sum') || nameLower.includes('hotpot') || nameLower.includes('hot pot') ||
      nameLower.includes('haidilao') || nameLower.includes('putien') || nameLower.includes('dian xiao') ||
      nameLower.includes('lao huo') || nameLower.includes('cantonese') || nameLower.includes('kai garden') ||
      nameLower.includes('tang tea') || nameLower.includes('jiang nan') || nameLower.includes('yi zun')) {
    return 'chinese, food';
  }
  if (nameLower.includes('turkish') || nameLower.includes('sofra')) {
    return 'middle eastern, food';
  }
  if (nameLower.includes('italian') || nameLower.includes('saizeriya') || nameLower.includes('pizza')) {
    return 'italian, food';
  }
  if (nameLower.includes('indonesian') || nameLower.includes('makan')) {
    return 'indonesian, food';
  }
  if (nameLower.includes('western') || nameLower.includes('astons') || nameLower.includes('collin') ||
      nameLower.includes('steak') || nameLower.includes('grill') || nameLower.includes('vermilion') ||
      nameLower.includes('mediterranean')) {
    return 'western, food';
  }
  if (nameLower.includes('nasi lemak') || nameLower.includes('crave') || nameLower.includes('nanyang') ||
      nameLower.includes('singapura') || nameLower.includes("han's") || nameLower.includes('encik tan')) {
    return 'local, food';
  }
  if (nameLower.includes('bar') || nameLower.includes('malts') || nameLower.includes('whisky')) {
    return 'bar, food';
  }
  if (nameLower.includes('food court') || nameLower.includes('gourmet paradise') || nameLower.includes('dining edition')) {
    return 'food court, food';
  }
  if (nameLower.includes('chicken') || nameLower.includes('chic-a-boo')) {
    return 'fast food, food';
  }

  return 'restaurant, food';
}

function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-marina-square';
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

async function scrapeMarinasquare() {
  console.log('=== SCRAPING MARINA SQUARE ===\n');

  // F&B data from website
  const fnbStores = [
    { name: "365 Juices Bar", unit: "#02-253B" },
    { name: "7-Eleven", unit: "#01-206" },
    { name: "7-Eleven", unit: "#03-206" },
    { name: "ASTONS Steak & Salad", unit: "#03-145/146" },
    { name: "Betsubara", unit: "#02-300" },
    { name: "Beyond Pancakes", unit: "#03-131A" },
    { name: "BHC Chicken", unit: "#02-332A/332F" },
    { name: "Burger King", unit: "#02-105" },
    { name: "CHICHA San Chen", unit: "#02-208" },
    { name: "CHIC-A-BOO", unit: "#03-147/148" },
    { name: "COLLIN'S", unit: "#01-204/205" },
    { name: "Crave", unit: "#02-233" },
    { name: "dal.komm COFFEE", unit: "#02-272/273/278/279" },
    { name: "Dian Xiao Er", unit: "#02-200" },
    { name: "Encik Tan", unit: "#02-275" },
    { name: "Popeyes", unit: "#02-275" },
    { name: "Gourmet Paradise", unit: "#02-180/183" },
    { name: "Gyu-Kaku Japanese BBQ", unit: "#02-106" },
    { name: "Haidilao Hot Pot", unit: "#01-19/25" },
    { name: "Han's", unit: "#02-206" },
    { name: "Hannaembi", unit: "#02-105B" },
    { name: "Hong Kong Zhai Dim Sum", unit: "#02-234/235/236" },
    { name: "Hot Pot Valley", unit: "#02-102/102A" },
    { name: "Kai Garden", unit: "#03-128A/128B" },
    { name: "Kei Kaisendon", unit: "#02-226A/B" },
    { name: "KEITAKU", unit: "#02-301" },
    { name: "Kenny Rogers Roasters", unit: "#02-130/104A" },
    { name: "Kith Café", unit: "#01-10" },
    { name: "Lao Huo Tang", unit: "#02-202" },
    { name: "Luckin Coffee", unit: "#02-153" },
    { name: "Luli Tea & Coffee", unit: "#02-184/185" },
    { name: "MAKAN MAKAN", unit: "#02-201" },
    { name: "Malts", unit: "#01-07/08" },
    { name: "McDonald's", unit: "#02-156/157/166" },
    { name: "Nasty Cookie & Bakehouse", unit: "#02-271/271A" },
    { name: "Paris Baguette", unit: "#02-152/152K" },
    { name: "Pizza Hut", unit: "#03-211" },
    { name: "PUTIEN", unit: "#02-205" },
    { name: "Rolling Rice", unit: "#02-105A" },
    { name: "Saizeriya", unit: "#02-207" },
    { name: "Seoul Garden", unit: "#03-210" },
    { name: "Shine Korea Supermarket", unit: "#02-218A" },
    { name: "Singapura Nanyang Coffee", unit: "#02-220A/222A" },
    { name: "SOFRA Turkish Café", unit: "#03-129A" },
    { name: "Starbucks Coffee", unit: "#03-217/218" },
    { name: "Suki-Ya", unit: "#02-183B/183C" },
    { name: "SUKIYA", unit: "#02-183A" },
    { name: "Sushi-GO", unit: "#02-277" },
    { name: "Tang Tea House", unit: "#03-212/213/214" },
    { name: "TANAMERA COFFEE", unit: "#02-192" },
    { name: "Tenkaichi Japanese BBQ", unit: "#03-129" },
    { name: "The Tree Cafe", unit: "#02-100A/100B" },
    { name: "The Vermilion House", unit: "#02-03/04" },
    { name: "Yechun Xiao Jiang Nan", unit: "#02-106A/B" },
    { name: "Yi Zun Noodle", unit: "#02-103" },
    { name: "Ya Kun Kaya Toast", unit: "#02-207A" }
  ];

  // Deduplicate by name (keep first occurrence, e.g., 7-Eleven at L1)
  const seen = new Set();
  const uniqueStores = [];
  for (const store of fnbStores) {
    const key = store.name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      uniqueStores.push(store);
    }
  }

  console.log(`Total F&B outlets: ${uniqueStores.length}`);

  // Print found stores
  console.log('\nF&B outlets:');
  for (const store of uniqueStores) {
    console.log(`  - ${store.name} (${store.unit})`);
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
  for (const store of uniqueStores) {
    let thumbnail = null;
    let hours = null;

    // Try to find existing thumbnail
    thumbnail = await findExistingThumbnail(store.name);
    if (thumbnail) console.log(`    Found existing thumbnail for ${store.name}`);

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
      console.log(`  ✓ ${store.name} (${store.unit})`);
    } else {
      console.log(`  ✗ ${store.name} - ${error.message}`);
    }
  }

  console.log(`\n=== COMPLETE ===`);
  console.log(`Imported: ${imported}/${uniqueStores.length} outlets`);
}

scrapeMarinasquare();
