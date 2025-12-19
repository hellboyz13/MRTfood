const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Hillion Mall restaurants from CSV
const hillionRestaurants = [
  { name: "An Acai Affair", unit: "#B2-46A", level: "B2", category: "Desserts" },
  { name: "Auntie Anne", unit: "#B2-31", level: "B2", category: "Fast Food" },
  { name: "Ayam Penyet President", unit: "#B2-57/58", level: "B2", category: "Indonesian" },
  { name: "Bake Inc", unit: "#B2-41/42", level: "B2", category: "Bakery" },
  { name: "Barcook Bakery", unit: "#B2-32", level: "B2", category: "Bakery" },
  { name: "Big Fish Small Fish", unit: "#01-27/35/39", level: "01", category: "Western" },
  { name: "Blackball Dessert", unit: "#B2-47", level: "B2", category: "Desserts" },
  { name: "Chateraise", unit: "#B1-44", level: "B1", category: "Desserts" },
  { name: "Cha Tra Mue", unit: "#B2-62", level: "B2", category: "Drinks" },
  { name: "CHICHA San Chen", unit: "#B2-17", level: "B2", category: "Drinks" },
  { name: "Common Grill by COLLIN'S", unit: "#B2-66", level: "B2", category: "Western" },
  { name: "Crystal Jade La Mian Xiao Long Bao", unit: "#01-11", level: "01", category: "Chinese" },
  { name: "Dian Xiao Er", unit: "#01-08/09/10", level: "01", category: "Chinese" },
  { name: "Dough Culture", unit: "#B2-43", level: "B2", category: "Bakery" },
  { name: "Dunkin' Donuts", unit: "#01-26", level: "01", category: "Fast Food" },
  { name: "D'Penyetz & D'Cendol", unit: "#01-42", level: "01", category: "Indonesian" },
  { name: "Eat 3 Bowls", unit: "#B2-06", level: "B2", category: "Chinese" },
  { name: "Fragrance Foodstuff", unit: "#B2-39", level: "B2", category: "Local" },
  { name: "Genki Sushi", unit: "#01-14", level: "01", category: "Japanese" },
  { name: "Gong Yuan Mala Tang", unit: "#01-03/04", level: "01", category: "Chinese" },
  { name: "Han's", unit: "#B2-28/29/30", level: "B2", category: "Cafe" },
  { name: "Ichikokudo Hokkaido Ramen", unit: "#01-01/02", level: "01", category: "Japanese" },
  { name: "I Love Taimei", unit: "#01-25", level: "01", category: "Taiwanese" },
  { name: "Ji De Chi Dessert", unit: "#01-23", level: "01", category: "Desserts" },
  { name: "Kazo", unit: "#B2-11", level: "B2", category: "Japanese" },
  { name: "Kei Kaisendon", unit: "#B1-41", level: "B1", category: "Japanese" },
  { name: "Keitaku Mazesoba", unit: "#B1-24", level: "B1", category: "Japanese" },
  { name: "King of Prawn Noodles", unit: "#B2-03/04/05", level: "B2", category: "Chinese" },
  { name: "KOI Thé", unit: "#B2-53", level: "B2", category: "Drinks" },
  { name: "Kopi & Tarts", unit: "#01-22", level: "01", category: "Cafe" },
  { name: "Krispy Kreme", unit: "#B1-45A", level: "B1", category: "Desserts" },
  { name: "Kopitiam", unit: "#02-15/16/17/18/19/20", level: "02", category: "Food Court" },
  { name: "llaollao", unit: "#B1-45", level: "B1", category: "Desserts" },
  { name: "Long John Silver's", unit: "#B1-57/58/59", level: "B1", category: "Fast Food" },
  { name: "Maki-San", unit: "#B2-07", level: "B2", category: "Japanese" },
  { name: "McDonald's", unit: "#B1-25/26/27", level: "B1", category: "Fast Food" },
  { name: "Melvados", unit: "#B2-10", level: "B2", category: "Western" },
  { name: "MOS Burger", unit: "#B2-60", level: "B2", category: "Fast Food" },
  { name: "Mr Coconut", unit: "#B2-35", level: "B2", category: "Drinks" },
  { name: "Nam Kee Pau", unit: "#B2-34", level: "B2", category: "Chinese" },
  { name: "Nan Yang Dao", unit: "#B2-26/27", level: "B2", category: "Chinese" },
  { name: "Nippon Bite", unit: "#B2-36", level: "B2", category: "Japanese" },
  { name: "Paris Baguette", unit: "#B1-16", level: "B1", category: "Bakery" },
  { name: "PastaGo", unit: "#B2-37", level: "B2", category: "Western" },
  { name: "POCHA! Korean Street Dining", unit: "#B2-55/56", level: "B2", category: "Korean" },
  { name: "Pontian Wanton Noodles", unit: "#B2-25", level: "B2", category: "Chinese" },
  { name: "Qi Ji", unit: "#B2-16", level: "B2", category: "Chinese" },
  { name: "Saizeriya", unit: "#B1-20/21/22", level: "B1", category: "Western" },
  { name: "Sanook Kitchen", unit: "#01-17/18", level: "01", category: "Thai" },
  { name: "SF Fruits", unit: "#B2-38", level: "B2", category: "Fruits" },
  { name: "Shihlin Taiwan Street Snacks", unit: "#B2-33", level: "B2", category: "Taiwanese" },
  { name: "Souperstar", unit: "#B2-52A", level: "B2", category: "Soup" },
  { name: "Starbucks", unit: "#B1-28/29/30", level: "B1", category: "Cafe" },
  { name: "Subway", unit: "#02-21", level: "02", category: "Fast Food" },
  { name: "Sukiya", unit: "#B2-54", level: "B2", category: "Japanese" },
  { name: "Sushi Express", unit: "#01-19/20/21", level: "01", category: "Japanese" },
  { name: "Stuff'd", unit: "#B2-40", level: "B2", category: "Western" },
  { name: "The Hainan Story", unit: "#01-15/16", level: "01", category: "Chinese" },
  { name: "The Hainan Story Bakery", unit: "#01-43", level: "01", category: "Bakery" },
  { name: "The Soup Spoon Union", unit: "#01-05/06", level: "01", category: "Soup" },
  { name: "Tongue Tip Lanzhou Beef Noodles", unit: "#01-07", level: "01", category: "Chinese" },
  { name: "ToriGO", unit: "#B1-37/38/39/40", level: "B1", category: "Japanese" },
  { name: "Tori-Q", unit: "#01-13", level: "01", category: "Japanese" },
  { name: "Uncle Didi", unit: "#B2-53A", level: "B2", category: "Local" },
  { name: "Wingstop", unit: "#01-40/41", level: "01", category: "Western" },
  { name: "Wok The FISH!", unit: "#B2-45/46", level: "B2", category: "Western" },
  { name: "Ya Kun Kaya Toast", unit: "#B2-23/24", level: "B2", category: "Cafe" },
  { name: "Yamazaki", unit: "#B2-18", level: "B2", category: "Bakery" }
];

const MALL_ID = 'hillion-mall';

// Generate slug from name
function generateSlug(name, mallId) {
  const slug = name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug}-${mallId}`;
}

async function importToMallOutlets() {
  console.log('=== HILLION MALL IMPORT TO mall_outlets ===\n');

  // First, delete wrongly imported data from food_listings
  console.log('Step 1: Removing wrongly imported data from food_listings...');
  const { data: toDelete, error: selectError } = await supabase
    .from('food_listings')
    .select('id, name')
    .eq('landmark', 'Hillion Mall');

  if (selectError) {
    console.log('Error selecting:', selectError);
  } else if (toDelete && toDelete.length > 0) {
    console.log(`Found ${toDelete.length} listings to remove from food_listings`);

    const { error: deleteError } = await supabase
      .from('food_listings')
      .delete()
      .eq('landmark', 'Hillion Mall');

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

  for (const restaurant of hillionRestaurants) {
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

  console.log(`\nTotal outlets at Hillion Mall: ${finalCount?.length || 0}`);
}

importToMallOutlets().catch(console.error);
