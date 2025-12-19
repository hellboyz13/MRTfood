const { chromium } = require('playwright');
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const MALL_ID = 'the-seletar-mall';

// Known Seletar Mall food outlets from directory
const SELETAR_FOOD_OUTLETS = [
  { name: 'Boon Tong Kee', level: '#01-29/30/31' },
  { name: 'BreadTalk', level: '#B1-K3/K4' },
  { name: 'Burger King', level: '#B1-K9/K10' },
  { name: 'Cedele', level: '#01-15/16' },
  { name: 'Chateraise', level: '#B2-19/20' },
  { name: 'CRAVE', level: '#B2-K1' },
  { name: 'Crolo By Swee Heng', level: '#B1-24' },
  { name: "D'Penyetz", level: '#B1-K7/K8' },
  { name: 'Daiso', level: '#02-21/22/23' },
  { name: 'Delibowl', level: '#01-12 to 14' },
  { name: 'Dian Xiao Er', level: '#B1-28/29' },
  { name: 'Din Tai Fung', level: '#02-07 to 10' },
  { name: 'Dough Culture', level: '#B2-K2' },
  { name: 'EAT 3 BOWLS', level: '#01-37/38' },
  { name: 'Eighteen Chefs', level: '#02-14 to 16' },
  { name: 'Fish & Co.', level: '#02-17/18' },
  { name: 'Four Leaves', level: '#B1-K5' },
  { name: 'Fun Toast', level: '#B2-01/02' },
  { name: 'Gong Cha', level: '#B2-K4' },
  { name: 'Haidilao', level: '#02-11/12/13' },
  { name: 'HEYTEA', level: '#B1-K13' },
  { name: 'IPPUDO', level: '#01-17/18' },
  { name: 'Itacho Sushi', level: '#01-39/40/41' },
  { name: 'KFC', level: '#B1-K1/K2' },
  { name: 'Kith Cafe', level: '#01-42 to 45' },
  { name: 'Kopitiam', level: '#B2-03 to 15' },
  { name: "McDonald's", level: '#B1-32/33/34' },
  { name: 'Mr Bean', level: '#B1-K6' },
  { name: 'Mrs Pho', level: '#01-27/28' },
  { name: 'Nam Kee Pau', level: '#B1-K15' },
  { name: 'Old Chang Kee', level: '#B1-K20' },
  { name: 'Paradise Dynasty', level: '#01-19 to 25' },
  { name: 'Paris Baguette', level: '#B1-26/27' },
  { name: 'PastaMania', level: '#01-32/33' },
  { name: 'Pizza Hut', level: '#02-05/06' },
  { name: 'Boost Juice Bars', level: '#B2-21' },
  { name: 'Starbucks', level: '#01-34/35/36' },
  { name: 'Subway', level: '#B1-30/31' },
  { name: 'Sushi Tei', level: '#02-01 to 04' },
  { name: 'Sweet Talk', level: '#B2-K5' },
  { name: 'Thai Express', level: '#01-10/11' },
  { name: 'The Coffee Bean & Tea Leaf', level: '#B1-K11/K12' },
  { name: 'Toast Box', level: '#B1-K16/K17' },
  { name: 'Tonkotsu Kazan', level: '#01-26' },
  { name: 'Wingstop', level: '#B1-K18/K19' },
  { name: 'Ya Kun Kaya Toast', level: '#B1-K14' },
  { name: 'Cellarbration', level: '#01-48' },
];

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
    + '-seletar-mall';
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

async function scrapeSeletarMall() {
  console.log('=== SCRAPING THE SELETAR MALL ===\n');

  // Use known outlets list since website is hard to scrape
  const uniqueStores = SELETAR_FOOD_OUTLETS;
  console.log(`Using ${uniqueStores.length} known food outlets`);

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
    let thumbnail = await findExistingThumbnail(store.name);
    let hours = await findExistingOpeningHours(store.name);

    if (thumbnail) console.log(`    Found existing thumbnail for ${store.name}`);
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
}

scrapeSeletarMall();
