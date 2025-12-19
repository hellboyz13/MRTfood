const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Thomson Plaza F&B from official website
const thomsonPlazaRestaurants = [
  { name: "Afresh&co", unit: "#01-22/30" },
  { name: "Astons Specialities", unit: "#01-124" },
  { name: "Bengawan Solo", unit: "#01-98" },
  { name: "Betsubara", unit: "#01-K3" },
  { name: "Bistro Box by Uncle Penyet", unit: "#01-107" },
  { name: "Boost Express", unit: "#01-K4" },
  { name: "Burger King", unit: "#01-115" },
  { name: "Cellar Deluxe", unit: "#01-79" },
  { name: "Chateraise", unit: "#01-02" },
  { name: "Chirashizushi Shou", unit: "#02-09" },
  { name: "Cut Butchery", unit: "#03-43" },
  { name: "DJ Bakery", unit: "#01-73" },
  { name: "Duke Bakery", unit: "#01-K2" },
  { name: "Four Leaves", unit: "#01-03/04" },
  { name: "Fragrance", unit: "#01-K10" },
  { name: "Hajime Tonkatsu & Ramen", unit: "#01-110" },
  { name: "Han's", unit: "#01-121" },
  { name: "Harvest Union Market Cafe & Bar", unit: "#01-37A" },
  { name: "Honeyworld", unit: "#01-117" },
  { name: "iVegan", unit: "#01-109" },
  { name: "Juice Farm", unit: "#01-K6" },
  { name: "KOI THÉ", unit: "#01-18" },
  { name: "Koufu", unit: "#01-106" },
  { name: "Lee Mart (Wonderful Bapsang)", unit: "#01-112/113/114" },
  { name: "LiHO", unit: "#01-K11" },
  { name: "Mr Bean", unit: "#01-K5" },
  { name: "Nam Kee Pau & Hong Kong Egglet", unit: "#01-K8" },
  { name: "NAN YANG DAO", unit: "#03-46-47" },
  { name: "Now Pizza", unit: "#01-K9" },
  { name: "Old Chang Kee", unit: "#01-K7" },
  { name: "Omoté", unit: "#03-24A" },
  { name: "Peach Garden", unit: "#01-87/88" },
  { name: "Rocky Master", unit: "#01-38/39" },
  { name: "San Ren Xing", unit: "#01-122/123" },
  { name: "Sanook Kitchen", unit: "#01-104/105" },
  { name: "Shi Li Fang Hot Pot", unit: "#01-40/41/42" },
  { name: "Shift by Common Folks Bar", unit: "#01-59" },
  { name: "Social Winery", unit: "#01-57" },
  { name: "Subway", unit: "#01-97" },
  { name: "Sushi Tei", unit: "#03-48/49" },
  { name: "SUSHIRO", unit: "#03-51" },
  { name: "Swensen's", unit: "#03-23/23A" },
  { name: "Tai Chong Kok", unit: "#01-K1" },
  { name: "The Cheese Shop", unit: "#03-34/34A" },
  { name: "The Coriander Cafe", unit: "#02-08" },
  { name: "The Grumpy Bear", unit: "#02-10" },
  { name: "Tsukuda Nojo", unit: "#03-50" },
  { name: "Tun Xiang Hokkien Delights", unit: "#01-108" },
  { name: "Wang Cafe", unit: "#03-42" },
  { name: "Wing Joo Loong", unit: "#03-35" },
  { name: "Ya Kun Kaya Toast", unit: "#01-95" },
  { name: "Yew Kee Specialities", unit: "#01-96" }
];

const MALL_ID = 'thomson-plaza';

function getCategory(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('koi') || nameLower.includes('liho') || nameLower.includes('boost') ||
      nameLower.includes('juice') || nameLower.includes('mr bean')) {
    return 'drinks, food';
  }
  if (nameLower.includes('ya kun') || nameLower.includes('toast') || nameLower.includes('cafe') ||
      nameLower.includes('wang cafe') || nameLower.includes('han\'s') || nameLower.includes('grumpy bear')) {
    return 'cafe, food';
  }
  if (nameLower.includes('bengawan') || nameLower.includes('bakery') || nameLower.includes('four leaves') ||
      nameLower.includes('old chang kee') || nameLower.includes('chateraise') || nameLower.includes('duke') ||
      nameLower.includes('tai chong') || nameLower.includes('nam kee pau')) {
    return 'bakery, food';
  }
  if (nameLower.includes('burger') || nameLower.includes('subway') || nameLower.includes('pizza')) {
    return 'fast food, food';
  }
  if (nameLower.includes('sushi') || nameLower.includes('ramen') || nameLower.includes('tonkatsu') ||
      nameLower.includes('chirashi') || nameLower.includes('omoté') || nameLower.includes('tsukuda') ||
      nameLower.includes('betsubara')) {
    return 'japanese, food';
  }
  if (nameLower.includes('korean') || nameLower.includes('bapsang')) {
    return 'korean, food';
  }
  if (nameLower.includes('peach garden') || nameLower.includes('hot pot') || nameLower.includes('shi li fang') ||
      nameLower.includes('san ren xing') || nameLower.includes('hokkien') || nameLower.includes('nan yang')) {
    return 'chinese, food';
  }
  if (nameLower.includes('thai') || nameLower.includes('sanook')) {
    return 'thai, food';
  }
  if (nameLower.includes('penyet') || nameLower.includes('uncle')) {
    return 'indonesian, food';
  }
  if (nameLower.includes('astons') || nameLower.includes('swensen') || nameLower.includes('cheese shop') ||
      nameLower.includes('rocky master')) {
    return 'western, food';
  }
  if (nameLower.includes('vegan') || nameLower.includes('ivegan')) {
    return 'vegetarian, food';
  }
  if (nameLower.includes('winery') || nameLower.includes('bar') || nameLower.includes('cellar')) {
    return 'bar, food';
  }
  if (nameLower.includes('koufu') || nameLower.includes('food court')) {
    return 'food court, food';
  }

  return 'restaurant, food';
}

function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-thomson-plaza';
}

async function importRestaurants() {
  console.log('=== THOMSON PLAZA IMPORT ===\n');

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

  for (const restaurant of thomsonPlazaRestaurants) {
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

  console.log(`\nTotal outlets at Thomson Plaza: ${finalCount?.length || 0}`);
}

importRestaurants().catch(console.error);
