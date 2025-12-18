const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// 111 Somerset restaurants from CSV
const somersetRestaurants = [
  { name: "50 年 Fresh & Fluffy", unit: "#01-K9", category: "Desserts" },
  { name: "Akami", unit: "#01-03/31 to 32", category: "Japanese" },
  { name: "Brot & Tee", unit: "#01-35", category: "Bakery" },
  { name: "Cafe Usagi", unit: "#01-42", category: "Cafe" },
  { name: "Chocolate Origin", unit: "#01-36", category: "Desserts" },
  { name: "EAT.", unit: "#01-20", category: "Western" },
  { name: "Fortune Court", unit: "#02-18 to 19", category: "Chinese" },
  { name: "Fun Toast", unit: "#01-19", category: "Cafe" },
  { name: "Great Nanyang Heritage Cafe", unit: "#01-09/K1 to K2", category: "Cafe" },
  { name: "Han's Cafe", unit: "#01-11 to 12", category: "Cafe" },
  { name: "Hong Kong Egglet", unit: "#01-48", category: "Desserts" },
  { name: "Hvala", unit: "#01-10", category: "Cafe" },
  { name: "Imperial Treasure Steamboat Restaurant", unit: "#02-14 to 17", category: "Chinese" },
  { name: "Jakarta Ropang Project", unit: "#01-08", category: "Indonesian" },
  { name: "Kei Kaisendon", unit: "#01-45", category: "Japanese" },
  { name: "Lan Ting Xu", unit: "#01-18", category: "Chinese" },
  { name: "Lucine By LUNA", unit: "#01-06/37 to 38", category: "Western" },
  { name: "Moe Moe' Soft Soufflé", unit: "#01-41", category: "Desserts" },
  { name: "Nam Kee Pau", unit: "#01-48", category: "Chinese" },
  { name: "Old Tea Hut", unit: "#01-39", category: "Cafe" },
  { name: "Piadini Italian Streats", unit: "#01-K8", category: "Western" },
  { name: "Poke Theory", unit: "#01-04", category: "Hawaiian" },
  { name: "Pu3 Restaurant", unit: "#02-20", category: "Chinese" },
  { name: "Rama Bear Cafe", unit: "#01-K6", category: "Cafe" },
  { name: "Rise Bakehouse", unit: "#01-05", category: "Bakery" },
  { name: "Sawarak Delicacy", unit: "#01-40", category: "Malaysian" },
  { name: "Shake Shake In A Tub", unit: "#01-K11", category: "Seafood" },
  { name: "So Good Bakery", unit: "#01-17", category: "Bakery" },
  { name: "So Good Char Chan Tang", unit: "#01-16", category: "Chinese" },
  { name: "The Lunar Rabbit Boulangerie", unit: "#01-K5", category: "Bakery" },
  { name: "Tiong Bahru Hainanese Boneless Chicken Rice", unit: "#01-K10/43/44", category: "Chinese" },
  { name: "Verandah @ Rael's", unit: "#01-07", category: "Western" },
  { name: "Xing Hua Vegetarian Restaurant", unit: "#01-K3 to K4", category: "Vegetarian" },
  { name: "Yi Jia Ren Delights", unit: "#01-K7", category: "Chinese" }
];

const MALL_ID = '111-somerset';

// Generate slug from name
function generateSlug(name, mallId) {
  const slug = name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug}-${mallId}`;
}

async function importToMallOutlets() {
  console.log('=== 111 SOMERSET IMPORT TO mall_outlets ===\n');

  // First, delete wrongly imported data from food_listings
  console.log('Step 1: Removing wrongly imported data from food_listings...');
  const { data: toDelete, error: selectError } = await supabase
    .from('food_listings')
    .select('id, name')
    .eq('landmark', '111 Somerset');

  if (selectError) {
    console.log('Error selecting:', selectError);
  } else if (toDelete && toDelete.length > 0) {
    console.log(`Found ${toDelete.length} listings to remove from food_listings`);

    const { error: deleteError } = await supabase
      .from('food_listings')
      .delete()
      .eq('landmark', '111 Somerset');

    if (deleteError) {
      console.log('Error deleting:', deleteError);
    } else {
      console.log(`Deleted ${toDelete.length} listings from food_listings`);
    }
  } else {
    console.log('No wrongly imported listings found in food_listings');
  }

  // Get existing outlets
  console.log('\nStep 2: Checking existing mall_outlets...');
  const { data: existing } = await supabase
    .from('mall_outlets')
    .select('name')
    .eq('mall_id', MALL_ID);

  const existingNames = new Set((existing || []).map(o => o.name.toLowerCase()));
  console.log(`Existing outlets: ${existingNames.size}`);

  // Import to mall_outlets
  console.log('\nStep 3: Importing to mall_outlets...');
  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const restaurant of somersetRestaurants) {
    // Check if exists (case-insensitive)
    if (existingNames.has(restaurant.name.toLowerCase())) {
      console.log(`Skipping (exists): ${restaurant.name}`);
      skipped++;
      continue;
    }

    const outletId = generateSlug(restaurant.name, MALL_ID);

    const { error: insertError } = await supabase
      .from('mall_outlets')
      .insert({
        id: outletId,
        name: restaurant.name,
        mall_id: MALL_ID,
        level: restaurant.unit,
        category: restaurant.category,
        tags: [restaurant.category]
      });

    if (insertError) {
      // Check if duplicate key error
      if (insertError.code === '23505') {
        console.log(`Skipping (duplicate): ${restaurant.name}`);
        skipped++;
      } else {
        console.log(`Error inserting ${restaurant.name}: ${insertError.message}`);
        failed++;
      }
      continue;
    }

    console.log(`Imported: ${restaurant.name} (${restaurant.category})`);
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

  console.log(`\nTotal outlets at 111 Somerset: ${finalCount?.length || 0}`);
}

importToMallOutlets().catch(console.error);
