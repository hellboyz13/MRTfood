const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MALL_ID = 'i12-katong';

function getCategory(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('bottle shop') || nameLower.includes('wine')) {
    return 'bar, food';
  }
  if (nameLower.includes('coffee') || nameLower.includes('cafe') || nameLower.includes('café') ||
      nameLower.includes('starbucks') || nameLower.includes('tim hortons') || nameLower.includes('greybox')) {
    return 'cafe, food';
  }
  if (nameLower.includes('bakery') || nameLower.includes('patisserie') || nameLower.includes('bread') ||
      nameLower.includes('toast') || nameLower.includes('cake')) {
    return 'bakery, food';
  }
  if (nameLower.includes('juice') || nameLower.includes('boost') || nameLower.includes('tea') ||
      nameLower.includes('itea') || nameLower.includes('boba')) {
    return 'drinks, food';
  }
  if (nameLower.includes('ice cream') || nameLower.includes('gelat') || nameLower.includes('dessert')) {
    return 'desserts, food';
  }
  if (nameLower.includes('sushi') || nameLower.includes('japanese') || nameLower.includes('ramen') ||
      nameLower.includes('genki') || nameLower.includes('ippudo') || nameLower.includes('maki')) {
    return 'japanese, food';
  }
  if (nameLower.includes('korean') || nameLower.includes('bbq') || nameLower.includes('kim')) {
    return 'korean, food';
  }
  if (nameLower.includes('dim sum') || nameLower.includes('hotpot') || nameLower.includes('chinese') ||
      nameLower.includes('crystal jade') || nameLower.includes('la mian') || nameLower.includes('yang guo fu') ||
      nameLower.includes('char chan tang') || nameLower.includes('xi tang')) {
    return 'chinese, food';
  }
  if (nameLower.includes('thai') || nameLower.includes('yum yum')) {
    return 'thai, food';
  }
  if (nameLower.includes('indian') || nameLower.includes('rollgaadi') || nameLower.includes('kebab')) {
    return 'indian, food';
  }
  if (nameLower.includes('italian') || nameLower.includes('pizza') || nameLower.includes('pasta') ||
      nameLower.includes('saizeriya')) {
    return 'italian, food';
  }
  if (nameLower.includes('mexican') || nameLower.includes('guzman')) {
    return 'mexican, food';
  }
  if (nameLower.includes('western') || nameLower.includes('steak') || nameLower.includes('fish') ||
      nameLower.includes('chips') || nameLower.includes('burger')) {
    return 'western, food';
  }
  if (nameLower.includes('hawker') || nameLower.includes('food court') || nameLower.includes('kopitiam')) {
    return 'food court, food';
  }
  if (nameLower.includes('gold class')) {
    return 'snacks, food';
  }

  return 'restaurant, food';
}

function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-i12-katong';
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

async function scrapeI12Katong() {
  console.log('=== IMPORTING i12 KATONG F&B ===\n');

  // F&B data from official website
  const fnbStores = [
    { name: "1855 The Bottle Shop", unit: "#B1-21" },
    { name: "Boost Juice Bars", unit: "#B1-42" },
    { name: "Coucou Hotpot‧Brew Tea", unit: "#04-05/06" },
    { name: "Crystal Jade La Mian Xiao Long Bao", unit: "#02-21" },
    { name: "Edith Patisserie", unit: "#B1-30" },
    { name: "Fun Toast", unit: "#B1-48/49" },
    { name: "Gelatissimo", unit: "#01-22" },
    { name: "Genki Sushi", unit: "#02-03" },
    { name: "Gold Class @ Golden Village", unit: "#05-01/02" },
    { name: "Greybox Coffee", unit: "#02-23/24" },
    { name: "Guzman Y Gomez", unit: "#01-27 & 31" },
    { name: "Ishiro Fusion Bowl", unit: "#B1-35" },
    { name: "IPPUDO", unit: "#01-04" },
    { name: "iTea", unit: "#B1-34" },
    { name: "Luckin Coffee", unit: "#02-22" },
    { name: "Maki-San", unit: "#B1-43" },
    { name: "PS.Cafe", unit: "#01-01/03" },
    { name: "Saizeriya", unit: "#01-11/12/13" },
    { name: "SG Hawker", unit: "#B1-06/08" },
    { name: "So Good Bakery", unit: "#01-19" },
    { name: "So Good Char Chan Tang", unit: "#04-08/09" },
    { name: "Tea Pulse", unit: "#B1-47" },
    { name: "The Fish & Chips Shop", unit: "#B1-44/45" },
    { name: "Tim Hortons", unit: "#01-28" },
    { name: "Wine Connection", unit: "#01-10" },
    { name: "Xi Tang", unit: "#01-21" },
    { name: "Yang Guo Fu", unit: "#01-17/18" },
    { name: "Yum Yum Thai", unit: "#B1-50" },
    { name: "BingXue Tea & Ice Cream", unit: "#B1-36" },
    { name: "Cookboys", unit: "#B1-10/37" },
    { name: "Nainai Flavor", unit: "#02-13/14 & #02-26/27" },
    { name: "Pizza Maru Express & OMOOMO", unit: "#01-20" },
    { name: "Rollgaadi", unit: "#B1-41" }
  ];

  console.log(`Total F&B outlets: ${fnbStores.length}`);

  // Print found stores
  console.log('\nF&B outlets:');
  for (const store of fnbStores) {
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
  for (const store of fnbStores) {
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
  console.log(`Imported: ${imported}/${fnbStores.length} outlets`);
}

scrapeI12Katong();
