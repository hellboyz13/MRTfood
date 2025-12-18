const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// White Sands F&B - updated list
const whiteSandsRestaurants = [
  { name: "Ayam Penyet President", unit: "L3" },
  { name: "Chewy Junior", unit: "B1" },
  { name: "DABBA STREET", unit: "B1" },
  { name: "Fun Toast", unit: "L3" },
  { name: "KFC", unit: "L1" },
  { name: "Long John Silver's", unit: "L2" },
  { name: "McDonald's", unit: "L1" },
  { name: "Men Men Don Don", unit: "B1" },
  { name: "Saizeriya", unit: "L3" },
  { name: "SG Ramen", unit: "L3" },
  { name: "Shi Li Fang Hot Pot & One Pot", unit: "L2" },
  { name: "Subway", unit: "L3" },
  { name: "Sushi Express", unit: "L3" },
  { name: "ThaiExpress", unit: "L2" },
  { name: "The Soup Spoon Union", unit: "L2" },
  { name: "Wingstop", unit: "L2" },
  { name: "Xin Wang Hong Kong Café", unit: "L2" },
  { name: "Zheng Nan Qi Bai", unit: "L1" }
];

const MALL_ID = 'white-sands';

// Get category based on restaurant name/type
function getCategory(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('chewy junior')) {
    return 'bakery, food';
  }
  if (nameLower.includes('fun toast') || nameLower.includes('café') || nameLower.includes('cafe')) {
    return 'cafe, food';
  }
  if (nameLower.includes('mcdonald') || nameLower.includes('subway') || nameLower.includes('kfc') ||
      nameLower.includes('long john') || nameLower.includes('wingstop')) {
    return 'fast food, food';
  }
  if (nameLower.includes('sushi') || nameLower.includes('men men don') || nameLower.includes('ramen')) {
    return 'japanese, food';
  }
  if (nameLower.includes('thai')) {
    return 'thai, food';
  }
  if (nameLower.includes('saizeriya')) {
    return 'western, food';
  }
  if (nameLower.includes('hong kong') || nameLower.includes('xin wang')) {
    return 'hong kong, food';
  }
  if (nameLower.includes('ayam penyet')) {
    return 'indonesian, food';
  }
  if (nameLower.includes('hot pot') || nameLower.includes('shi li fang')) {
    return 'chinese, food';
  }
  if (nameLower.includes('dabba')) {
    return 'indian, food';
  }

  return 'restaurant, food';
}

// Generate slug ID
function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-white-sands';
}

async function importRestaurants() {
  console.log('=== WHITE SANDS IMPORT ===\n');

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

  for (const restaurant of whiteSandsRestaurants) {
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

  console.log(`\nTotal outlets at White Sands: ${finalCount?.length || 0}`);
}

importRestaurants().catch(console.error);
