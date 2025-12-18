const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Velocity @ Novena Square F&B from website
const velocityRestaurants = [
  { name: "A-Roy Thai Restaurant", unit: "#03-61/62/63/64" },
  { name: "BreadTalk", unit: "#01-26" },
  { name: "CHICHA San Chen", unit: "#01-07" },
  { name: "Cookhouse by Koufu", unit: "#03-47/56" },
  { name: "Curry Times", unit: "#02-33/34/41/42" },
  { name: "Din Tai Fung", unit: "#01-05/06" },
  { name: "FOND", unit: "#02-46A" },
  { name: "Four Leaves", unit: "#01-77/78" },
  { name: "Guzman Y Gomez", unit: "#01-68/69" },
  { name: "Han's Café", unit: "#01-19/21" },
  { name: "Hana K-Food", unit: "#02-25" },
  { name: "Ichiban Boshi", unit: "#02-13/14" },
  { name: "Josh's Grill", unit: "#02-68/72" },
  { name: "Kakoo", unit: "#02-19" },
  { name: "KFC", unit: "#01-16/18" },
  { name: "Love, Joy & Coffee", unit: "#02-K9" },
  { name: "Mei Heong Yuen Dessert", unit: "#02-03" },
  { name: "Mister Donut", unit: "#01-72/73" },
  { name: "Mmmm!", unit: "#01-79/81" },
  { name: "Monster Curry", unit: "#02-78/79" },
  { name: "Mr. Coconut", unit: "#02-53A" },
  { name: "Mun Zuk by Li Fang Congee", unit: "#01-86/87" },
  { name: "Munchi Pancakes", unit: "#02-10" },
  { name: "Old Chang Kee", unit: "#01-70/71" },
  { name: "Old Tea Hut", unit: "#03-K1" },
  { name: "Omoté", unit: "#03-09/10" },
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
  { name: "Xin Wang Hong Kong Cafe", unit: "#01-08/09" },
  { name: "Hundred Grains", unit: "#01-89/90" },
  { name: "Nong Geng Ji Hunan Cuisine", unit: "#03-11" }
];

const MALL_ID = 'velocity-novena-square';

function getCategory(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('chicha') || nameLower.includes('mr. coconut') || nameLower.includes('old tea hut')) {
    return 'drinks, food';
  }
  if (nameLower.includes('starbucks') || nameLower.includes('coffee bean') || nameLower.includes('café') ||
      nameLower.includes('cafe') || nameLower.includes('love, joy')) {
    return 'cafe, food';
  }
  if (nameLower.includes('breadtalk') || nameLower.includes('four leaves') || nameLower.includes('old chang kee') ||
      nameLower.includes('toast & roll') || nameLower.includes('swee heng') || nameLower.includes('donut')) {
    return 'bakery, food';
  }
  if (nameLower.includes('mei heong') || nameLower.includes('dessert') || nameLower.includes('pancake')) {
    return 'desserts, food';
  }
  if (nameLower.includes('kfc') || nameLower.includes('subway') || nameLower.includes('guzman')) {
    return 'fast food, food';
  }
  if (nameLower.includes('sushi') || nameLower.includes('ichiban') || nameLower.includes('tori-q') ||
      nameLower.includes('omoté')) {
    return 'japanese, food';
  }
  if (nameLower.includes('korean') || nameLower.includes('k-food') || nameLower.includes('hana')) {
    return 'korean, food';
  }
  if (nameLower.includes('din tai fung') || nameLower.includes('tunglok') || nameLower.includes('xin wang') ||
      nameLower.includes('hunan') || nameLower.includes('congee') || nameLower.includes('hundred grains')) {
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
      nameLower.includes("han's")) {
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

async function importRestaurants() {
  console.log('=== VELOCITY @ NOVENA SQUARE IMPORT ===\n');

  console.log('Step 1: Removing existing outlets...');
  const { data: existing } = await supabase
    .from('mall_outlets')
    .select('id')
    .eq('mall_id', MALL_ID);

  if (existing && existing.length > 0) {
    console.log(`Found ${existing.length} existing outlets to remove`);
    await supabase.from('mall_outlets').delete().eq('mall_id', MALL_ID);
    console.log(`Deleted ${existing.length} existing outlets`);
  } else {
    console.log('No existing outlets found');
  }

  console.log('\nStep 2: Importing outlets...');
  let imported = 0;
  let failed = 0;

  for (const restaurant of velocityRestaurants) {
    const category = getCategory(restaurant.name);
    const id = generateId(restaurant.name);

    const { error: insertError } = await supabase
      .from('mall_outlets')
      .insert({
        id: id,
        name: restaurant.name,
        mall_id: MALL_ID,
        level: restaurant.unit,
        category: category,
        tags: []
      });

    if (insertError) {
      console.log(`Error inserting ${restaurant.name}: ${insertError.message}`);
      failed++;
      continue;
    }

    console.log(`Imported: ${restaurant.name} (${category})`);
    imported++;
  }

  console.log(`\n=== IMPORT COMPLETE ===`);
  console.log(`Imported: ${imported}`);
  console.log(`Failed: ${failed}`);

  const { data: finalCount } = await supabase
    .from('mall_outlets')
    .select('id')
    .eq('mall_id', MALL_ID);

  console.log(`\nTotal outlets at Velocity @ Novena Square: ${finalCount?.length || 0}`);
}

importRestaurants().catch(console.error);
