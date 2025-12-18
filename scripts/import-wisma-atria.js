const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Wisma Atria F&B from CSV
const wismaRestaurants = [
  { name: "Awfully Chocolate Experience Cafe", unit: "#03-12/12A/13/13A" },
  { name: "Ben's Cookies", unit: "#B1-50" },
  { name: "Beryl's", unit: "#B1-06" },
  { name: "Century Bakkwa", unit: "#B1-44" },
  { name: "Chicken Pie Kitchen & Don Signature Crab", unit: "#B1-46" },
  { name: "Din Tai Fung", unit: "#04-00" },
  { name: "Embassy 1967", unit: "#03-32/33/34" },
  { name: "Famous Amos", unit: "#B1-43" },
  { name: "Food Republic", unit: "#04-02 to 29 & #04-31 to 38" },
  { name: "Fruce", unit: "#B1-45" },
  { name: "Fun Toast", unit: "#01-04/05pt" },
  { name: "Garrett Popcorn Shops", unit: "#B1-56 to 57" },
  { name: "Gochi-So Shokudo", unit: "#01-37 to 41" },
  { name: "Gokoku Japanese Bakery", unit: "#B1-52A/53/62/63" },
  { name: "Haidilao Hot Pot", unit: "#03-15" },
  { name: "Happy Lili Cafe", unit: "#01-42/49/50" },
  { name: "iTEA", unit: "#B1-02" },
  { name: "KOI Express", unit: "#B1-03" },
  { name: "LeTAO le chocolat", unit: "#B1-58" },
  { name: "llaollao", unit: "#B1-48" },
  { name: "Mr. Coconut", unit: "#B1-49" },
  { name: "Paradise Dynasty", unit: "#01-18/18B/18C/19/20" },
  { name: "Starbucks", unit: "#01-34 to 36" },
  { name: "SUBWAY", unit: "#B1-47" },
  { name: "Subway Niche", unit: "#B1-17" },
  { name: "Sugarfina", unit: "#B1-59" },
  { name: "Sushiro", unit: "#02-08 to 13" },
  { name: "The Coffee Bean & Tea Leaf", unit: "#02-18" },
  { name: "The Providore", unit: "#02-02 to 03/48 to 53" },
  { name: "Tiong Bahru Bakery", unit: "#B1-K5/K6 & #03-35 to 40" },
  { name: "Tun Xiang Hokkien Delights", unit: "#01-02/03" }
];

const MALL_ID = 'wisma-atria';

// Get category based on restaurant name/type
function getCategory(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('itea') || nameLower.includes('koi') || nameLower.includes('mr. coconut') || nameLower.includes('fruce')) {
    return 'drinks, food';
  }
  if (nameLower.includes('bakery') || nameLower.includes('cookies') || nameLower.includes('famous amos') ||
      nameLower.includes('bakkwa') || nameLower.includes('popcorn') || nameLower.includes('sugarfina') ||
      nameLower.includes('letao') || nameLower.includes('chocolat')) {
    return 'bakery, food';
  }
  if (nameLower.includes('starbucks') || nameLower.includes('coffee bean') ||
      nameLower.includes('cafe') || nameLower.includes('toast') || nameLower.includes('providore')) {
    return 'cafe, food';
  }
  if (nameLower.includes('subway')) {
    return 'fast food, food';
  }
  if (nameLower.includes('food republic')) {
    return 'food court, food';
  }
  if (nameLower.includes('llaollao') || nameLower.includes('chocolate')) {
    return 'desserts, food';
  }
  if (nameLower.includes('sushiro') || nameLower.includes('gochi-so') || nameLower.includes('gokoku')) {
    return 'japanese, food';
  }
  if (nameLower.includes('din tai fung') || nameLower.includes('paradise dynasty') ||
      nameLower.includes('haidilao') || nameLower.includes('hokkien')) {
    return 'chinese, food';
  }

  return 'restaurant, food';
}

// Generate slug ID
function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-wisma-atria';
}

async function importRestaurants() {
  console.log('=== WISMA ATRIA IMPORT ===\n');

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

  for (const restaurant of wismaRestaurants) {
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

  console.log(`\nTotal outlets at Wisma Atria: ${finalCount?.length || 0}`);
}

importRestaurants().catch(console.error);
