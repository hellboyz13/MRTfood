const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Waterway Point F&B from CSV
const waterwayPointRestaurants = [
  { name: "A-One Signature", unit: "East Wing Level 1" },
  { name: "Ajumma's", unit: "West Wing Level 2" },
  { name: "Buddy Hoagies Café & Grill", unit: "West Wing Level 2" },
  { name: "Burger King", unit: "East Wing Level 1" },
  { name: "Cedele Bakery Kitchen", unit: "West Wing Level 1" },
  { name: "CHAGEE", unit: "West Wing Basement 1" },
  { name: "Daily Chicken", unit: "West Wing Level 1" },
  { name: "Délifrance", unit: "West Wing Level 1" },
  { name: "Din Tai Fung", unit: "West Wing Level 1" },
  { name: "Fish & Co.", unit: "East Wing Basement 1" },
  { name: "Gong Yuan Ma La Tang", unit: "West Wing Level 2" },
  { name: "Henri Charpentier", unit: "West Wing Level 1" },
  { name: "PUTIEN", unit: "East Wing Basement 1" },
  { name: "Red Ginger Coffeehouse", unit: "East Wing Basement 1" },
  { name: "Sanook Kitchen", unit: "West Wing Basement 1" },
  { name: "So Do Fun", unit: "West Wing Level 1" },
  { name: "So Pho", unit: "East Wing Level 1" },
  { name: "Song Fa Bak Kut Teh", unit: "East Wing Level 1" },
  { name: "Subway", unit: "East Wing Basement 1" },
  { name: "SUKIYA", unit: "East Wing Basement 1" },
  { name: "Sushi Express", unit: "East Wing Level 1" },
  { name: "Sushiro", unit: "East Wing Level 1" },
  { name: "Swensen's", unit: "West Wing Level 2" },
  { name: "The Coffee Bean & Tea Leaf", unit: "East Wing Level 1" },
  { name: "Tokyo Shokudo", unit: "West Wing Basement 1" },
  { name: "Towkay Kia", unit: "West Wing Level 2" },
  { name: "Wanglu Hot Pot", unit: "West Wing Basement 2" },
  { name: "Wen Zhang Lao Mian", unit: "East Wing Basement 2" },
  { name: "White Restaurant", unit: "West Wing Basement 1" }
];

const MALL_ID = 'waterway-point';

// Get category based on restaurant name
function getCategory(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('chagee')) {
    return 'drinks, food';
  }
  if (nameLower.includes('coffee bean') || nameLower.includes('coffeehouse') || nameLower.includes('café') ||
      nameLower.includes('cafe')) {
    return 'cafe, food';
  }
  if (nameLower.includes('cedele') || nameLower.includes('bakery') || nameLower.includes('délifrance')) {
    return 'bakery, food';
  }
  if (nameLower.includes('burger king') || nameLower.includes('subway')) {
    return 'fast food, food';
  }
  if (nameLower.includes('sushi') || nameLower.includes('sukiya') || nameLower.includes('tokyo shokudo')) {
    return 'japanese, food';
  }
  if (nameLower.includes('ajumma')) {
    return 'korean, food';
  }
  if (nameLower.includes('din tai fung') || nameLower.includes('putien') || nameLower.includes('hot pot') ||
      nameLower.includes('ma la') || nameLower.includes('bak kut teh') || nameLower.includes('white restaurant') ||
      nameLower.includes('lao mian')) {
    return 'chinese, food';
  }
  if (nameLower.includes('sanook') || nameLower.includes('so do fun')) {
    return 'thai, food';
  }
  if (nameLower.includes('pho') || nameLower.includes('so pho')) {
    return 'vietnamese, food';
  }
  if (nameLower.includes('fish & co') || nameLower.includes('swensen') || nameLower.includes('henri charpentier')) {
    return 'western, food';
  }

  return 'restaurant, food';
}

// Generate slug ID
function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-waterway-point';
}

async function importRestaurants() {
  console.log('=== WATERWAY POINT IMPORT ===\n');

  // Get existing outlets
  const { data: existing } = await supabase
    .from('mall_outlets')
    .select('name')
    .eq('mall_id', MALL_ID);

  const existingNames = new Set((existing || []).map(r => r.name.toLowerCase().trim()));
  console.log(`Existing outlets: ${existingNames.size}\n`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const restaurant of waterwayPointRestaurants) {
    const normalizedName = restaurant.name.toLowerCase().trim();

    if (existingNames.has(normalizedName)) {
      console.log(`Skipping (exists): ${restaurant.name}`);
      skipped++;
      continue;
    }

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
      if (insertError.code === '23505') {
        console.log(`Skipping (duplicate id): ${restaurant.name}`);
        skipped++;
      } else {
        console.log(`Error inserting ${restaurant.name}: ${insertError.message}`);
        failed++;
      }
      continue;
    }

    console.log(`Imported: ${restaurant.name} (${category})`);
    imported++;
  }

  console.log(`\n=== IMPORT COMPLETE ===`);
  console.log(`Imported: ${imported}`);
  console.log(`Skipped (existing): ${skipped}`);
  console.log(`Failed: ${failed}`);

  // Get final count
  const { data: finalCount } = await supabase
    .from('mall_outlets')
    .select('id')
    .eq('mall_id', MALL_ID);

  console.log(`\nTotal outlets at Waterway Point: ${finalCount?.length || 0}`);
}

importRestaurants().catch(console.error);
