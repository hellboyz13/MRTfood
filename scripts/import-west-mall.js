const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// West Mall F&B - 58 outlets
const westMallRestaurants = [
  { name: "A-One Signature", unit: "#01-38/39" },
  { name: "Bee Cheng Hiang", unit: "#B1-07" },
  { name: "Bengawan Solo", unit: "#B1-02" },
  { name: "Blackball", unit: "#B1-K13" },
  { name: "BreadTalk", unit: "#01-45/46" },
  { name: "Burger King", unit: "#01-28/29/30" },
  { name: "Butter & Cream", unit: "#B1-K11" },
  { name: "Châteraisé", unit: "#01-06" },
  { name: "CHICHA San Chen", unit: "#B1-15" },
  { name: "CRAVE", unit: "#B1-K15" },
  { name: "Dunkin' Donuts", unit: "#01-K1/K5" },
  { name: "Encik Tan", unit: "#01-01/36" },
  { name: "Four Leaves", unit: "#01-34/35" },
  { name: "Gochiya", unit: "#B1-14" },
  { name: "Hatsumi Donburi & Soba", unit: "#B1-K19/K20" },
  { name: "I Love Taimei Story", unit: "#B1-K17" },
  { name: "Ichiban Sushi", unit: "#03-02" },
  { name: "Ji De Chi Dessert", unit: "#B1-16" },
  { name: "Jo Ju Bang", unit: "#B1-K18" },
  { name: "Kebabs Faktory", unit: "#01-42" },
  { name: "KFC", unit: "#01-25/43" },
  { name: "Kopi & Tarts", unit: "#B1-K12" },
  { name: "Kopi Korner", unit: "#02-10A" },
  { name: "Kopitiam", unit: "#04-01" },
  { name: "Little Pond", unit: "#B1-24" },
  { name: "Luckin Coffee", unit: "#B1-K22" },
  { name: "Maki-San", unit: "#B1-K21" },
  { name: "Men Don Tei", unit: "#01-02" },
  { name: "Mixue", unit: "#01-07" },
  { name: "Mr Bean", unit: "#01-07A" },
  { name: "Munchi Pancakes", unit: "#01-K10" },
  { name: "Nam Kee Pau", unit: "#B1-04" },
  { name: "Nan Yang Dao", unit: "#B1-19" },
  { name: "Papa Ayam", unit: "#B1-K14" },
  { name: "Paris Baguette", unit: "#B1-18" },
  { name: "PastaMania", unit: "#01-40" },
  { name: "Pizza Hut", unit: "#01-26" },
  { name: "Polar Puffs & Cakes", unit: "#01-K7" },
  { name: "Ramen King", unit: "#B1-K10/K23" },
  { name: "Ritz Apple Strudel", unit: "#B1-K2" },
  { name: "Sanook Kitchen", unit: "#03-03" },
  { name: "Starbucks", unit: "#01-32" },
  { name: "Subway", unit: "#01-18/19" },
  { name: "Sushi Express", unit: "#B1-23" },
  { name: "Swee Heng 1989 Classic", unit: "#01-03" },
  { name: "Swensen's", unit: "#02-05" },
  { name: "Take-Out Salad", unit: "#B1-18A" },
  { name: "The Coffee Bean & Tea Leaf", unit: "#01-09" },
  { name: "Toast & Roll by Swee Heng", unit: "#B1-12" },
  { name: "Toast Box", unit: "#01-44" },
  { name: "Tun Xiang Hokkien Delights", unit: "#B1-14" },
  { name: "Woowfles by Bakery Cuisine", unit: "#B1-K1" },
  { name: "Ya Kun Family Café", unit: "#01-10/41" },
  { name: "Yew Kee Specialities", unit: "#B1-K16" },
  { name: "Yi Qian Wanton Noodle House", unit: "#B1-17" },
  { name: "Yolé", unit: "#01-K6" },
  { name: "ZhangLiang MaLatang", unit: "#B1-21" }
];

const MALL_ID = 'west-mall';

// Get category based on restaurant name/type
function getCategory(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('chicha') || nameLower.includes('mixue') || nameLower.includes('blackball')) {
    return 'drinks, food';
  }
  if (nameLower.includes('bakery') || nameLower.includes('breadtalk') || nameLower.includes('four leaves') ||
      nameLower.includes('bengawan') || nameLower.includes('polar puffs') || nameLower.includes('paris baguette') ||
      nameLower.includes('swee heng') || nameLower.includes('woowfles') || nameLower.includes('bee cheng hiang') ||
      nameLower.includes('nam kee pau') || nameLower.includes('ritz apple') || nameLower.includes('dunkin') ||
      nameLower.includes('butter & cream') || nameLower.includes('munchi pancakes')) {
    return 'bakery, food';
  }
  if (nameLower.includes('starbucks') || nameLower.includes('coffee bean') || nameLower.includes('luckin') ||
      nameLower.includes('ya kun') || nameLower.includes('toast box') || nameLower.includes('kopi') ||
      nameLower.includes('toast & roll')) {
    return 'cafe, food';
  }
  if (nameLower.includes('burger king') || nameLower.includes('subway') || nameLower.includes('kfc') ||
      nameLower.includes('pizza hut') || nameLower.includes('kebabs')) {
    return 'fast food, food';
  }
  if (nameLower.includes('kopitiam')) {
    return 'food court, food';
  }
  if (nameLower.includes('châteraisé') || nameLower.includes('ji de chi') || nameLower.includes('yolé') ||
      nameLower.includes('swensen')) {
    return 'desserts, food';
  }
  if (nameLower.includes('sushi') || nameLower.includes('maki-san') || nameLower.includes('ramen') ||
      nameLower.includes('donburi') || nameLower.includes('gochiya') || nameLower.includes('men don tei')) {
    return 'japanese, food';
  }
  if (nameLower.includes('sanook')) {
    return 'thai, food';
  }
  if (nameLower.includes('pastamania')) {
    return 'western, food';
  }
  if (nameLower.includes('taimei') || nameLower.includes('i love taimei')) {
    return 'taiwanese, food';
  }
  if (nameLower.includes('jo ju bang')) {
    return 'korean, food';
  }
  if (nameLower.includes('papa ayam') || nameLower.includes('encik tan')) {
    return 'malay, food';
  }

  return 'restaurant, food';
}

// Generate slug ID
function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-west-mall';
}

async function importRestaurants() {
  console.log('=== WEST MALL IMPORT ===\n');

  // Step 1: Delete existing outlets
  console.log('Step 1: Removing existing outlets...');
  const { data: existing, error: selectError } = await supabase
    .from('mall_outlets')
    .select('id, name')
    .eq('mall_id', MALL_ID);

  if (selectError) {
    console.log('Error selecting:', selectError);
  } else if (existing && existing.length > 0) {
    console.log(`Found ${existing.length} existing outlets to remove`);

    const { error: deleteError } = await supabase
      .from('mall_outlets')
      .delete()
      .eq('mall_id', MALL_ID);

    if (deleteError) {
      console.log('Error deleting:', deleteError);
    } else {
      console.log(`Deleted ${existing.length} existing outlets`);
    }
  } else {
    console.log('No existing outlets found');
  }

  // Step 2: Import new outlets
  console.log('\nStep 2: Importing outlets...');
  let imported = 0;
  let failed = 0;

  for (const restaurant of westMallRestaurants) {
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

  // Get final count
  const { data: finalCount } = await supabase
    .from('mall_outlets')
    .select('id')
    .eq('mall_id', MALL_ID);

  console.log(`\nTotal outlets at West Mall: ${finalCount?.length || 0}`);
}

importRestaurants().catch(console.error);
