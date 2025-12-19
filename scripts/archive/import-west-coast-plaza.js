const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// West Coast Plaza F&B - 23 outlets
const westCoastPlazaRestaurants = [
  { name: "Amps Tea", unit: "#02-01" },
  { name: "Au Croissant", unit: "#B1-49" },
  { name: "Ba Guo Grilled Fish", unit: "#02-25" },
  { name: "Chaoniu Hot Pot", unit: "#01-02" },
  { name: "Fish Mart Sakuraya", unit: "#B1-52" },
  { name: "Fun Toast", unit: "#02-26" },
  { name: "Ginkakuji Onishi", unit: "#B1-22" },
  { name: "Homestyle China", unit: "#B1-06" },
  { name: "Mixue", unit: "#B1-54A" },
  { name: "New Nanyang", unit: "#B1-07" },
  { name: "Oishii Bakery", unit: "#B1-21" },
  { name: "Overscoop", unit: "#B1-57" },
  { name: "Popeyes", unit: "#B1-48" },
  { name: "Saigon Legend", unit: "-" },
  { name: "Sanook Kitchen", unit: "#B1-04" },
  { name: "Sha Xian Delicacies", unit: "#B1-09" },
  { name: "Starbucks Coffee", unit: "#01-01" },
  { name: "Subway", unit: "#B1-13" },
  { name: "Sunny Korean Cuisine", unit: "#B1-08" },
  { name: "Sushi Tei", unit: "#01-87" },
  { name: "Toast Box", unit: "#B1-01/02" },
  { name: "US Pizza", unit: "#B1-55/56" },
  { name: "West Co'z Cafe", unit: "#02-23" }
];

const MALL_ID = 'west-coast-plaza';

// Get category based on restaurant name/type
function getCategory(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('amps tea') || nameLower.includes('mixue')) {
    return 'drinks, food';
  }
  if (nameLower.includes('bakery') || nameLower.includes('croissant')) {
    return 'bakery, food';
  }
  if (nameLower.includes('starbucks') || nameLower.includes('toast') || nameLower.includes('cafe') ||
      nameLower.includes('fun toast')) {
    return 'cafe, food';
  }
  if (nameLower.includes('subway') || nameLower.includes('popeyes') || nameLower.includes('pizza')) {
    return 'fast food, food';
  }
  if (nameLower.includes('overscoop')) {
    return 'desserts, food';
  }
  if (nameLower.includes('sushi') || nameLower.includes('sakuraya') || nameLower.includes('ginkakuji') ||
      nameLower.includes('onishi')) {
    return 'japanese, food';
  }
  if (nameLower.includes('sanook')) {
    return 'thai, food';
  }
  if (nameLower.includes('korean') || nameLower.includes('sunny korean')) {
    return 'korean, food';
  }
  if (nameLower.includes('saigon')) {
    return 'vietnamese, food';
  }
  if (nameLower.includes('hot pot') || nameLower.includes('ba guo') || nameLower.includes('homestyle china') ||
      nameLower.includes('sha xian') || nameLower.includes('nanyang')) {
    return 'chinese, food';
  }

  return 'restaurant, food';
}

// Generate slug ID
function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-west-coast-plaza';
}

async function importRestaurants() {
  console.log('=== WEST COAST PLAZA IMPORT ===\n');

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

  for (const restaurant of westCoastPlazaRestaurants) {
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

  console.log(`\nTotal outlets at West Coast Plaza: ${finalCount?.length || 0}`);
}

importRestaurants().catch(console.error);
