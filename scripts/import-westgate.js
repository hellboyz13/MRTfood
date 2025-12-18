const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Westgate F&B from CSV
const westgateRestaurants = [
  { name: "328 Katong Laksa", unit: "B2-06" },
  { name: "Ajumma's", unit: "01-07" },
  { name: "An Acai Affair", unit: "B1-30" },
  { name: "Anjappar", unit: "04-08" },
  { name: "Astons Specialities", unit: "04-04 to 05" },
  { name: "Bao's Pastry", unit: "B1-03 to 05" },
  { name: "Bebek Goreng Pak Ndut", unit: "B1-11" },
  { name: "BreadTalk", unit: "02-03" },
  { name: "Brotzeit", unit: "01-04" },
  { name: "Buta Kizoku", unit: "01-02" },
  { name: "Cat & the Fiddle", unit: "01-11" },
  { name: "CHAFFIC", unit: "B1-24A" },
  { name: "Chateraise", unit: "B1-24" },
  { name: "Coffeesmith", unit: "02-24" },
  { name: "COLLIN'S", unit: "01-05" },
  { name: "Curry Times", unit: "02-08" },
  { name: "DONQ ÉDITER", unit: "B2-01A" },
  { name: "EAT.", unit: "B2-K13 to K14" },
  { name: "Eighteen Plum", unit: "B1-K6" },
  { name: "FLIPPER'S", unit: "01-42" },
  { name: "Fong Sheng Hao", unit: "01-08" },
  { name: "Food Junction", unit: "B1-29" },
  { name: "Fun Toast", unit: "04-38" },
  { name: "Genki Sushi", unit: "03-05" },
  { name: "Giraffa", unit: "02-05A" },
  { name: "Gochi-So Shokudo", unit: "01-02" },
  { name: "Green Delights", unit: "B2-K15 to K16" },
  { name: "Greendot", unit: "01-06" },
  { name: "Guzman Y Gomez", unit: "02-06" },
  { name: "Ha Jun", unit: "B2-K9 to K11" },
  { name: "HEYTEA", unit: "01-25" },
  { name: "Hundred Acre Creamery", unit: "04-07" },
  { name: "Ippudo", unit: "03-03" },
  { name: "Ji De Chi", unit: "B2-07" },
  { name: "JINJJA Chicken", unit: "02-05" },
  { name: "Kind Kones", unit: "01-09A" },
  { name: "KOI Thé", unit: "B1-K12" },
  { name: "Kushiya", unit: "B2-K4 to K5" },
  { name: "Long John Silver's", unit: "B1-10" },
  { name: "Luckin Coffee", unit: "B1-22A" },
  { name: "Läderach Chocolatier Suisse", unit: "01-10" },
  { name: "Miam Miam", unit: "02-27 & 29" },
  { name: "Milan Shokudo", unit: "02-07" },
  { name: "Mincheng Bibimbap", unit: "B2-K6 to K7" },
  { name: "Mini One", unit: "B2-01A" },
  { name: "Mr. Coconut", unit: "B2-K17" },
  { name: "MUN ZUK", unit: "B2-K1 to K3" },
  { name: "My Kampung", unit: "B2-K8" },
  { name: "Nasty Cookie", unit: "01-09" },
  { name: "NEXT SHIKAKU", unit: "B1-28" },
  { name: "Nunsaram Korean Dessert Cafe", unit: "04-37" },
  { name: "Oriental Kopi", unit: "02-28 & 49" },
  { name: "Paradise Dynasty", unit: "02-13" },
  { name: "Paradise Hotpot", unit: "03-10" },
  { name: "PlayMade", unit: "01-K1" },
  { name: "Poulét", unit: "B1-09" },
  { name: "PUTIEN Restaurant", unit: "03-08" },
  { name: "Rotiboy", unit: "B2-09" },
  { name: "ROYCE'", unit: "01-12" },
  { name: "Sagye Lite", unit: "B1-27" },
  { name: "Sanook Kitchen", unit: "B1-25" },
  { name: "Shabu Sai", unit: "B1-12" },
  { name: "Shake Shack", unit: "01-20 to 22 & 33" },
  { name: "Shoo Loong Kan", unit: "03-04" },
  { name: "Starbucks", unit: "02-04" },
  { name: "Sushi Express", unit: "B1-26" },
  { name: "Sushi Zushi", unit: "03-01" },
  { name: "Tai Chong Kok", unit: "B2-05" },
  { name: "TAN YU", unit: "B1-02" },
  { name: "Tim Ho Wan", unit: "01-13 to 14" },
  { name: "Toast Box", unit: "02-02" },
  { name: "Tokyo Shokudo", unit: "03-09" },
  { name: "Tongue Tip Lanzhou Beef Noodles", unit: "B1-28A" },
  { name: "Tonkatsu Bistro by Ma Maison", unit: "04-06" },
  { name: "Wang Fu Dim Sum", unit: "B2-08" },
  { name: "Wine Connection", unit: "01-03" },
  { name: "Xi Men Jie", unit: "B2-03 to 04" },
  { name: "Xiang Xiang Hunan Cuisine", unit: "04-42 & K5" },
  { name: "Ya Kun Kaya Toast", unit: "B1-K1 to K4" },
  { name: "Yakiniku Like", unit: "03-06" },
  { name: "YGF Malatang", unit: "B2-K12" },
  { name: "Yolé", unit: "03-02" },
  { name: "Yun Nans", unit: "03-07" },
  { name: "ZUS Coffee", unit: "02-25 to 26" }
];

const MALL_ID = 'westgate';

// Get category based on restaurant name/type
function getCategory(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('koi') || nameLower.includes('heytea') || nameLower.includes('playmade') ||
      nameLower.includes('mr. coconut')) {
    return 'drinks, food';
  }
  if (nameLower.includes('coffee') || nameLower.includes('starbucks') || nameLower.includes('toast') ||
      nameLower.includes('ya kun') || nameLower.includes('oriental kopi') || nameLower.includes('zus')) {
    return 'cafe, food';
  }
  if (nameLower.includes('bakery') || nameLower.includes('breadtalk') || nameLower.includes('bao\'s pastry') ||
      nameLower.includes('rotiboy') || nameLower.includes('cookie') || nameLower.includes('cat & the fiddle') ||
      nameLower.includes('royce') || nameLower.includes('läderach') || nameLower.includes('chocolat') ||
      nameLower.includes('donq')) {
    return 'bakery, food';
  }
  if (nameLower.includes('acai') || nameLower.includes('chateraise') || nameLower.includes('yolé') ||
      nameLower.includes('kind kones') || nameLower.includes('creamery') || nameLower.includes('nunsaram')) {
    return 'desserts, food';
  }
  if (nameLower.includes('long john')) {
    return 'fast food, food';
  }
  if (nameLower.includes('sushi') || nameLower.includes('ramen') || nameLower.includes('ippudo') ||
      nameLower.includes('yakiniku') || nameLower.includes('tonkatsu') || nameLower.includes('shokudo') ||
      nameLower.includes('genki') || nameLower.includes('buta kizoku') || nameLower.includes('kushiya') ||
      nameLower.includes('shikaku') || nameLower.includes('gochi-so')) {
    return 'japanese, food';
  }
  if (nameLower.includes('korean') || nameLower.includes('bibimbap') || nameLower.includes('ajumma') ||
      nameLower.includes('jinjja') || nameLower.includes('ha jun') || nameLower.includes('sagye')) {
    return 'korean, food';
  }
  if (nameLower.includes('paradise') || nameLower.includes('tim ho wan') || nameLower.includes('putien') ||
      nameLower.includes('dim sum') || nameLower.includes('hotpot') || nameLower.includes('hunan') ||
      nameLower.includes('lanzhou') || nameLower.includes('malatang') || nameLower.includes('yun nans') ||
      nameLower.includes('shoo loong') || nameLower.includes('tan yu') || nameLower.includes('xi men') ||
      nameLower.includes('tai chong') || nameLower.includes('ji de chi') || nameLower.includes('fong sheng')) {
    return 'chinese, food';
  }
  if (nameLower.includes('thai') || nameLower.includes('sanook')) {
    return 'thai, food';
  }
  if (nameLower.includes('indian') || nameLower.includes('anjappar') || nameLower.includes('curry times')) {
    return 'indian, food';
  }
  if (nameLower.includes('bebek') || nameLower.includes('kampung')) {
    return 'indonesian, food';
  }
  if (nameLower.includes('laksa') || nameLower.includes('katong')) {
    return 'local, food';
  }
  if (nameLower.includes('astons') || nameLower.includes('collin') || nameLower.includes('brotzeit') ||
      nameLower.includes('shake shack') || nameLower.includes('guzman') || nameLower.includes('miam miam') ||
      nameLower.includes('wine connection') || nameLower.includes('flipper')) {
    return 'western, food';
  }
  if (nameLower.includes('food junction')) {
    return 'food court, food';
  }
  if (nameLower.includes('greendot') || nameLower.includes('green delight')) {
    return 'vegetarian, food';
  }

  return 'restaurant, food';
}

// Generate slug ID
function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-westgate';
}

async function importRestaurants() {
  console.log('=== WESTGATE IMPORT ===\n');

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

  for (const restaurant of westgateRestaurants) {
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

  console.log(`\nTotal outlets at Westgate: ${finalCount?.length || 0}`);
}

importRestaurants().catch(console.error);
