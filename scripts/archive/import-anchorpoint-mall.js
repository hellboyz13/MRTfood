const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Anchorpoint Mall restaurants from directory
const anchorpointRestaurants = [
  { name: "Deliz Street", unit: "#01-02/03/04" },
  { name: "Folks & Stories", unit: "#01-01" },
  { name: "Go-Ang Pratunam Chicken Rice", unit: "#01-07/08" },
  { name: "Jack's Place", unit: "#01-09/10" },
  { name: "KFC", unit: "#01-15/16" },
  { name: "KOI Thé", unit: "#01-37" },
  { name: "Ma Maison", unit: "#01-12" },
  { name: "McDonald's", unit: "#01-31/32/33" },
  { name: "Overbrød (Scandinavian Deli)", unit: "#01-14A" },
  { name: "Starbucks", unit: "#01-05/06" },
  { name: "Subway", unit: "#01-11" },
  { name: "The Marmalade Pantry", unit: "#01-23" },
  { name: "Tiong Bahru Bakery", unit: "#01-13" },
  { name: "Yoshinoya", unit: "#01-01" },
  { name: "Bengawan Solo", unit: "#B1-45" },
  { name: "Fish Mart SAKURAYA", unit: "#B1-14/15" },
  { name: "Koufu", unit: "#B1-20/21" },
  { name: "Melvados", unit: "#B1-13" },
  { name: "Mr Coconut", unit: "#B1-53/54" },
  { name: "Wine Connection", unit: "#B1-35" },
  { name: "Woowfles by Bakery Cuisine", unit: "#B1-46" },
  { name: "Yi Jia Cafe by Ultra Bake", unit: "#B1-44" },
  { name: "2ThumbsUp Hainanese Curry Rice", unit: "#B1-47/48" }
];

const MALL_ID = 'anchorpoint';

// Get category based on restaurant name/type
function getCategory(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('koi') || nameLower.includes('mr coconut')) {
    return 'drinks, food';
  }
  if (nameLower.includes('bakery') || nameLower.includes('bengawan') ||
      nameLower.includes('woowfles') || nameLower.includes('ultra bake') ||
      nameLower.includes('melvados') || nameLower.includes('overbrød') ||
      nameLower.includes('scandinavian')) {
    return 'bakery, food';
  }
  if (nameLower.includes('starbucks') || nameLower.includes('marmalade') ||
      nameLower.includes('cafe') || nameLower.includes('folks')) {
    return 'cafe, food';
  }
  if (nameLower.includes('mcdonald') || nameLower.includes('subway') ||
      nameLower.includes('kfc')) {
    return 'fast food, food';
  }
  if (nameLower.includes('koufu')) {
    return 'food court, food';
  }
  if (nameLower.includes('wine connection')) {
    return 'bar, food';
  }

  return 'restaurant, food';
}

// Generate slug ID
function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-anchorpoint';
}

async function importRestaurants() {
  console.log('Starting Anchorpoint Mall outlets import...');
  console.log(`Total restaurants to process: ${anchorpointRestaurants.length}`);

  // Get existing outlets at Anchorpoint
  const { data: existing } = await supabase
    .from('mall_outlets')
    .select('name, name_normalized')
    .eq('mall_id', MALL_ID);

  const existingNames = new Set((existing || []).map(r => r.name_normalized || r.name.toLowerCase()));
  console.log(`Existing outlets at Anchorpoint: ${existingNames.size}`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const restaurant of anchorpointRestaurants) {
    const nameNormalized = restaurant.name.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

    // Check if exists (fuzzy match)
    const exists = Array.from(existingNames).some(existing => {
      const existingNorm = existing.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
      return existingNorm.includes(nameNormalized) || nameNormalized.includes(existingNorm) ||
             existingNorm.split(' ')[0] === nameNormalized.split(' ')[0];
    });

    if (exists) {
      console.log(`Skipping (exists): ${restaurant.name}`);
      skipped++;
      continue;
    }

    const category = getCategory(restaurant.name);
    const id = generateId(restaurant.name);

    // Insert outlet
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
  console.log(`Skipped (existing): ${skipped}`);
  console.log(`Failed: ${failed}`);

  // Get new total count
  const { data: finalCount } = await supabase
    .from('mall_outlets')
    .select('id')
    .eq('mall_id', MALL_ID);

  console.log(`\nTotal outlets at Anchorpoint: ${finalCount?.length || 0}`);
}

importRestaurants().catch(console.error);
