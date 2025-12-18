const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Vista Point F&B from official data
const vistaPointRestaurants = [
  { name: "Subway", unit: "#01-23" },
  { name: "McDonald's Singapore", unit: "#01-20" },
  { name: "Kopitiam Foodcourts", unit: "#01-21" }
];

const MALL_ID = 'vista-point';

function getCategory(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('mcdonald') || nameLower.includes('subway')) {
    return 'fast food, food';
  }
  if (nameLower.includes('kopitiam') || nameLower.includes('food court')) {
    return 'food court, food';
  }

  return 'restaurant, food';
}

function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-vista-point';
}

async function importRestaurants() {
  console.log('=== VISTA POINT IMPORT ===\n');

  console.log('Step 1: Removing existing outlets...');
  const { data: existing } = await supabase
    .from('mall_outlets')
    .select('id')
    .eq('mall_id', MALL_ID);

  if (existing && existing.length > 0) {
    console.log(`Found ${existing.length} existing outlets to remove`);
    await supabase.from('mall_outlets').delete().eq('mall_id', MALL_ID);
  } else {
    console.log('No existing outlets found');
  }

  console.log('\nStep 2: Importing outlets...');
  let imported = 0;
  let failed = 0;

  for (const restaurant of vistaPointRestaurants) {
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

  console.log(`\nTotal outlets at Vista Point: ${finalCount?.length || 0}`);
}

importRestaurants().catch(console.error);
