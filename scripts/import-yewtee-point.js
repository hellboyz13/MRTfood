const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Yew Tee Point F&B from CSV
const yewteeRestaurants = [
  { name: "Burger King", unit: "#B1-29/30" },
  { name: "Cococane", unit: "#B1-47" },
  { name: "Eastern Rice Dumpling", unit: "#B1-45" },
  { name: "Ecreative Cake", unit: "#B1-41" },
  { name: "Encik Tan", unit: "#B1-28" },
  { name: "Four Leaves", unit: "#B1-33/34" },
  { name: "Fragrance", unit: "#B1-39" },
  { name: "Fro~Yo!", unit: "#B1-32" },
  { name: "Gong Yuan Ma La Tang", unit: "#01-18" },
  { name: "Ji De Chi Dessert", unit: "#01-51" },
  { name: "Jian Bo Tiong Bahru Shui Kueh", unit: "#B1-TS3" },
  { name: "KFC", unit: "#01-19/20" },
  { name: "Koo Kee", unit: "#01-07" },
  { name: "Koufu Foodcourt", unit: "#B1-17/22" },
  { name: "LiHO TEA", unit: "#B1-43" },
  { name: "Long John Silver's", unit: "#01-36/38/39" },
  { name: "Mixue", unit: "#B1-TS2" },
  { name: "Mr Bean", unit: "#01-52/53" },
  { name: "Nam Kee Pau / HK Egglet", unit: "#01-49/50" },
  { name: "Nine Fresh", unit: "#B1-42" },
  { name: "Old Chang Kee", unit: "#01-37" },
  { name: "Penang Savour", unit: "#01-04" },
  { name: "Power Cafe", unit: "#B1-49" },
  { name: "Saizeriya", unit: "#01-17" },
  { name: "SF Fruits", unit: "#B1-46" },
  { name: "Starbucks", unit: "#01-16" },
  { name: "Stuff'd", unit: "#B1-50" },
  { name: "Subway", unit: "#01-35" },
  { name: "Sukiya", unit: "#01-22" },
  { name: "Takagi Ramen", unit: "#01-05/06" },
  { name: "Take-Out Salad", unit: "#B1-40" },
  { name: "Tenderfresh", unit: "#B1-37" },
  { name: "The Coffee Bean & Tea Leaf", unit: "#01-28" },
  { name: "Toastbox", unit: "#01-03" },
  { name: "Wang Ji Dim Sum", unit: "#B1-48" },
  { name: "Woowfles by Bakery Cuisine", unit: "#B1-44" },
  { name: "Xi De Li", unit: "#B1-38" },
  { name: "Ya Kun Kaya Toast", unit: "#01-46" },
  { name: "Yew Kee Specialities", unit: "#01-21" }
];

const MALL_ID = 'yewtee-point';

// Get category based on restaurant name/type
function getCategory(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('liho') || nameLower.includes('cococane') || nameLower.includes('mixue')) {
    return 'drinks, food';
  }
  if (nameLower.includes('bakery') || nameLower.includes('four leaves') ||
      nameLower.includes('woowfles') || nameLower.includes('cake') ||
      nameLower.includes('nam kee pau') || nameLower.includes('old chang kee')) {
    return 'bakery, food';
  }
  if (nameLower.includes('starbucks') || nameLower.includes('coffee bean') ||
      nameLower.includes('toastbox') || nameLower.includes('ya kun') ||
      nameLower.includes('power cafe')) {
    return 'cafe, food';
  }
  if (nameLower.includes('burger king') || nameLower.includes('subway') ||
      nameLower.includes('kfc') || nameLower.includes('long john')) {
    return 'fast food, food';
  }
  if (nameLower.includes('koufu') || nameLower.includes('foodcourt')) {
    return 'food court, food';
  }
  if (nameLower.includes('dessert') || nameLower.includes('fro~yo') ||
      nameLower.includes('nine fresh') || nameLower.includes('mr bean')) {
    return 'desserts, food';
  }
  if (nameLower.includes('fruits')) {
    return 'fruits, food';
  }
  if (nameLower.includes('ramen') || nameLower.includes('sukiya')) {
    return 'japanese, food';
  }
  if (nameLower.includes('saizeriya')) {
    return 'western, food';
  }

  return 'restaurant, food';
}

// Generate slug ID
function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-yewtee-point';
}

async function importRestaurants() {
  console.log('=== YEW TEE POINT IMPORT ===\n');

  // Step 1: Delete existing outlets at Yew Tee Point
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

  for (const restaurant of yewteeRestaurants) {
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

  console.log(`\nTotal outlets at Yew Tee Point: ${finalCount?.length || 0}`);
}

importRestaurants().catch(console.error);
