const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// VivoCity F&B from CSV
const vivocityRestaurants = [
  { name: "4Fingers Crispy Chicken", unit: "#02-120" },
  { name: "A&W", unit: "#B2-43/58" },
  { name: "Aburi-En", unit: "#01-159" },
  { name: "Ah Mah Homemade Cake", unit: "#B2-K8" },
  { name: "Alijiang Silk Road Cuisine and Western Mahua", unit: "#03-11" },
  { name: "Astons Specialities", unit: "#02-113" },
  { name: "Auntie Anne's", unit: "#B2-K6" },
  { name: "Awfully Chocolate", unit: "#01-155" },
  { name: "Barossa Bar & Grill", unit: "#01-161" },
  { name: "Battercatch", unit: "#01-171" },
  { name: "Ben & Jerry's", unit: "#02-K1" },
  { name: "Birds of Paradise Gelato Boutique", unit: "#B2-35" },
  { name: "Bliss Nest Capsules", unit: "#01-91" },
  { name: "Boost Express", unit: "#B2-K7" },
  { name: "Boost Juice", unit: "#02-134" },
  { name: "Bornga", unit: "#02-123" },
  { name: "BreadTalk", unit: "#B2-50" },
  { name: "Brotzeit German Bier Bar & Restaurant", unit: "#01-149" },
  { name: "Bulgogi Syo", unit: "#B2-29" },
  { name: "Burger King", unit: "#B2-41/56" },
  { name: "Cakebar", unit: "#B2-52" },
  { name: "Candy Empire", unit: "#B2-03" },
  { name: "Canton Paradise+", unit: "#B2-37" },
  { name: "Cedele", unit: "#01-113" },
  { name: "CHAGEE", unit: "#01-98" },
  { name: "Chimichanga", unit: "#01-157" },
  { name: "Chou Niang Jiu Niang", unit: "#B2-05" },
  { name: "COLLIN'S", unit: "#01-52A" },
  { name: "Crystal Jade Pavilion", unit: "#01-112" },
  { name: "Da Paolo Gastronomia", unit: "#01-108" },
  { name: "Dancing Crab", unit: "#03-10" },
  { name: "DaXi Taiwan Noodle & Dumpling", unit: "#02-83" },
  { name: "Dian Xiao Er", unit: "#02-138" },
  { name: "Din Tai Fung", unit: "#B2-38" },
  { name: "DipnDip", unit: "#01-51" },
  { name: "Dough Magic", unit: "#B2-K21" },
  { name: "Eat Pizza", unit: "#B2-K24" },
  { name: "Encik Tan", unit: "#B2-45" },
  { name: "Flipper's", unit: "#01-188A" },
  { name: "Food Republic", unit: "#03-01" },
  { name: "Fragrance", unit: "#B2-K22" },
  { name: "Fruit Paradise", unit: "#01-59" },
  { name: "Garrett Popcorn Shops", unit: "#02-63" },
  { name: "Genki Sushi", unit: "#02-65" },
  { name: "Giraffa", unit: "#B2-48" },
  { name: "Go Noodle House", unit: "#B2-24" },
  { name: "Go-Ang Pratunam Chicken Rice", unit: "#B2-30" },
  { name: "Gokoku Japanese Bakery", unit: "#B2-09" },
  { name: "Gong Yuan Ma La Tang", unit: "#B2-31" },
  { name: "Guzman Y Gomez", unit: "#B2-33A" },
  { name: "Gyogyo", unit: "#02-48" },
  { name: "Gyu-Kaku", unit: "#02-01/02" },
  { name: "HaiDiLao HotPot", unit: "#03-09" },
  { name: "Henri Charpentier", unit: "#02-K4" },
  { name: "HEYTEA", unit: "#01-111" },
  { name: "Hokkaido-Ya", unit: "#02-153" },
  { name: "Hundred Grains", unit: "#B2-23F" },
  { name: "I Love Taimei", unit: "#B2-K14" },
  { name: "Jiak Ba Food Heaven", unit: "#B2-K27" },
  { name: "Jollibee", unit: "#B2-42/57" },
  { name: "Kazo", unit: "#B2-K9" },
  { name: "Kei Kaisendon", unit: "#02-136" },
  { name: "Keitaku Mazesoba", unit: "#02-135" },
  { name: "Kenangan Coffee", unit: "#02-98A" },
  { name: "KFC", unit: "#B2-32" },
  { name: "Kikanbo", unit: "#B2-36" },
  { name: "Kiwami Ramen & Teppan Bar", unit: "#01-52" },
  { name: "KOI Thé", unit: "#B2-06B" },
  { name: "Kopitiam Food Hall", unit: "#B2-40" },
  { name: "Krispy Kreme", unit: "#B2-K26" },
  { name: "KYO KOMACHI", unit: "#01-99" },
  { name: "Le Shrimp Ramen", unit: "#B2-25" },
  { name: "LeNu Chef Wai's Noodle Bar", unit: "#02-91" },
  { name: "LiHO TEA", unit: "#02-95" },
  { name: "llaollao", unit: "#B2-04A" },
  { name: "Luckin Coffee", unit: "#02-119" },
  { name: "Mamma Mia! Trattoria E Caffe", unit: "#01-116" },
  { name: "Marché Food Lovers' Place", unit: "#03-14" },
  { name: "McDonald's", unit: "#B2-44" },
  { name: "Meow BBQ", unit: "#02-156/157" },
  { name: "Mincheng Bibimbap", unit: "#B2-26A" },
  { name: "Mister Donut", unit: "#B2-51" },
  { name: "Monster Curry", unit: "#02-126" },
  { name: "MORNING", unit: "#01-K19" },
  { name: "Mr Hainan", unit: "#02-116" },
  { name: "Mr. Coconut", unit: "#B2-46" },
  { name: "Mr.Onigiri", unit: "#B2-23D" },
  { name: "Nasty Cookie", unit: "#B2-49" },
  { name: "Old Chang Kee", unit: "#B2-K15" },
  { name: "Paik's Bibim", unit: "#02-125" },
  { name: "Panda Chan Snack", unit: "#B2-04" },
  { name: "Papa Ayam", unit: "#B2-23B" },
  { name: "PappaRich", unit: "#B2-23E" },
  { name: "Paradise Dynasty", unit: "#02-128" },
  { name: "Paradise Hotpot", unit: "#03-08A" },
  { name: "Paris Baguette", unit: "#B2-55" },
  { name: "Pastago and CHICHA San Chen", unit: "#B2-53" },
  { name: "PlayMade", unit: "#02-118" },
  { name: "Polar Puffs & Cakes", unit: "#B2-K5" },
  { name: "Potato Corner", unit: "#B2-K16" },
  { name: "Poulét", unit: "#01-175" },
  { name: "Project Acai", unit: "#01-92" },
  { name: "PUTIEN", unit: "#02-131" },
  { name: "Riverside Canton Claypot Cuisine", unit: "#02-150" },
  { name: "Rollney", unit: "#02-133" },
  { name: "Saboten", unit: "#02-49" },
  { name: "San.wich by Swee Heng", unit: "#B2-K25" },
  { name: "Sanook Kitchen", unit: "#B2-23C" },
  { name: "Seafood Paradise", unit: "#01-53" },
  { name: "sen-ryo", unit: "#01-106/107" },
  { name: "Seoul Noodle Shop", unit: "#B2-34" },
  { name: "Seremban Kee Mei Siew Pow", unit: "#B2-K12" },
  { name: "SERVUS German Burger Grill", unit: "#01-57" },
  { name: "SF Juice", unit: "#B2-05A" },
  { name: "Shake Shack", unit: "#01-163" },
  { name: "Shiok Burger", unit: "#B2-K19" },
  { name: "Song Fa Bak Kut Teh", unit: "#B2-13/14" },
  { name: "Soup Restaurant", unit: "#02-141" },
  { name: "Starbucks Coffee", unit: "#01-43" },
  { name: "Stuff'd", unit: "#B2-K17" },
  { name: "Surrey Hills Grocer", unit: "#03-02" },
  { name: "Sushi Tei", unit: "#02-152" },
  { name: "Sushi-Go", unit: "#B2-07/08" },
  { name: "Swensen's Unlimited", unit: "#02-117" },
  { name: "Tai Cheong Bakery", unit: "#B2-02" },
  { name: "Tajimaya Yakiniku / Suki-Ya KIN / MASH", unit: "#01-102" },
  { name: "Talad Thai Banana", unit: "#B2-K13" },
  { name: "TANYU", unit: "#01-169" },
  { name: "TCC - The Connoisseur Concerto", unit: "#02-149" },
  { name: "Tempura Makino", unit: "#02-111" },
  { name: "Thai Accent", unit: "#02-143" },
  { name: "The Coffee Bean & Tea Leaf", unit: "#02-04" },
  { name: "The French American Bakery", unit: "#B2-K10" },
  { name: "The Original Beach Road Scissors Cut Curry Rice", unit: "#B2-23A" },
  { name: "The Providore", unit: "#01-188" },
  { name: "TheJellyHearts", unit: "#B2-06A" },
  { name: "Tim Hortons", unit: "#01-207" },
  { name: "Tiong Bahru Bakery", unit: "#01-188B" },
  { name: "Toast Box", unit: "#B2-54" },
  { name: "Tokyo Shokudo", unit: "#01-54" },
  { name: "Tonkatsu ENbiton", unit: "#B2-27/27A" },
  { name: "Tori Sanwa", unit: "#01-104" },
  { name: "Tsuzumi Dango", unit: "#B2-K20" },
  { name: "Una Una", unit: "#02-94" },
  { name: "Venchi", unit: "#01-K22" },
  { name: "Vicoletto Osteria", unit: "#01-100" },
  { name: "VietSmith", unit: "#02-108" },
  { name: "Waa Cow!", unit: "#01-188C" },
  { name: "WHITE", unit: "#02-121" },
  { name: "Wine Connection", unit: "#01-152" },
  { name: "WOK HEY", unit: "#B2-K23" },
  { name: "Xiang Xiang Hunan Cuisine", unit: "#B2-28" },
  { name: "Xin Yuan Ji Fish Soup", unit: "#B2-26" },
  { name: "Ya Kun Kaya Toast", unit: "#B2-K28" },
  { name: "Yakiniku Like", unit: "#02-60" },
  { name: "Yamazaki", unit: "#B2-10" },
  { name: "Yang Ming Seafood (Kelong)", unit: "#02-158/159" },
  { name: "Yao Yao Chinese Sauerkraut Fish", unit: "#02-145" },
  { name: "Yappari Steak", unit: "#02-110" },
  { name: "Yew Kee Specialities", unit: "#B2-47" },
  { name: "Nong Geng Ji", unit: "#01-51A" },
  { name: "Nam Kee Pau", unit: "#B2-K18" },
  { name: "Moon Moon Food", unit: "#02-85" }
];

const MALL_ID = 'vivocity';

// Get category based on restaurant name/type
function getCategory(name) {
  const nameLower = name.toLowerCase();

  // Drinks
  if (nameLower.includes('liho') || nameLower.includes('koi') || nameLower.includes('heytea') ||
      nameLower.includes('chagee') || nameLower.includes('playmade') || nameLower.includes('chicha')) {
    return 'drinks, food';
  }
  // Coffee
  if (nameLower.includes('starbucks') || nameLower.includes('coffee bean') || nameLower.includes('luckin') ||
      nameLower.includes('kenangan') || nameLower.includes('tim hortons') || nameLower.includes('morning')) {
    return 'cafe, food';
  }
  // Bakery
  if (nameLower.includes('bakery') || nameLower.includes('breadtalk') || nameLower.includes('paris baguette') ||
      nameLower.includes('ah mah') || nameLower.includes('cake') || nameLower.includes('polar puffs') ||
      nameLower.includes('auntie anne') || nameLower.includes('yamazaki') || nameLower.includes('tai cheong') ||
      nameLower.includes('swee heng') || nameLower.includes('cookie') || nameLower.includes('mister donut') ||
      nameLower.includes('krispy kreme') || nameLower.includes('nam kee pau') || nameLower.includes('siew pow')) {
    return 'bakery, food';
  }
  // Desserts
  if (nameLower.includes('gelato') || nameLower.includes('ice cream') || nameLower.includes('llaollao') ||
      nameLower.includes('ben & jerry') || nameLower.includes('boost') || nameLower.includes('acai') ||
      nameLower.includes('venchi') || nameLower.includes('chocolate') || nameLower.includes('dessert') ||
      nameLower.includes('dipndip') || nameLower.includes('fruit paradise') || nameLower.includes('jellyhearts') ||
      nameLower.includes('rollney') || nameLower.includes('dango') || nameLower.includes('swensen')) {
    return 'desserts, food';
  }
  // Fast food
  if (nameLower.includes('burger king') || nameLower.includes('kfc') || nameLower.includes('mcdonald') ||
      nameLower.includes('jollibee') || nameLower.includes('a&w') || nameLower.includes('shake shack') ||
      nameLower.includes('stuff\'d') || nameLower.includes('old chang kee') || nameLower.includes('potato corner')) {
    return 'fast food, food';
  }
  // Japanese
  if (nameLower.includes('sushi') || nameLower.includes('ramen') || nameLower.includes('yakiniku') ||
      nameLower.includes('tonkatsu') || nameLower.includes('tempura') || nameLower.includes('saboten') ||
      nameLower.includes('genki') || nameLower.includes('hokkaido') || nameLower.includes('aburi') ||
      nameLower.includes('onigiri') || nameLower.includes('sen-ryo') || nameLower.includes('kazo') ||
      nameLower.includes('kaisendon') || nameLower.includes('mazesoba') || nameLower.includes('gokoku') ||
      nameLower.includes('kyo komachi') || nameLower.includes('tokyo shokudo') || nameLower.includes('tori sanwa')) {
    return 'japanese, food';
  }
  // Korean
  if (nameLower.includes('korean') || nameLower.includes('bibim') || nameLower.includes('bornga') ||
      nameLower.includes('bulgogi') || nameLower.includes('seoul') || nameLower.includes('gyu-kaku')) {
    return 'korean, food';
  }
  // Chinese
  if (nameLower.includes('din tai fung') || nameLower.includes('crystal jade') || nameLower.includes('paradise') ||
      nameLower.includes('dian xiao er') || nameLower.includes('putien') || nameLower.includes('canton') ||
      nameLower.includes('haidilao') || nameLower.includes('hotpot') || nameLower.includes('bak kut teh') ||
      nameLower.includes('soup restaurant') || nameLower.includes('claypot') || nameLower.includes('fish soup') ||
      nameLower.includes('hunan') || nameLower.includes('tanyu') || nameLower.includes('ma la') ||
      nameLower.includes('dumpling') || nameLower.includes('noodle house') || nameLower.includes('lenu') ||
      nameLower.includes('white') || nameLower.includes('yao yao') || nameLower.includes('nong geng') ||
      nameLower.includes('moon moon') || nameLower.includes('hundred grains') || nameLower.includes('jiak ba')) {
    return 'chinese, food';
  }
  // Thai
  if (nameLower.includes('thai') || nameLower.includes('sanook') || nameLower.includes('go-ang') ||
      nameLower.includes('pratunam') || nameLower.includes('talad')) {
    return 'thai, food';
  }
  // Vietnamese
  if (nameLower.includes('viet') || nameLower.includes('pho')) {
    return 'vietnamese, food';
  }
  // Western
  if (nameLower.includes('astons') || nameLower.includes('collin') || nameLower.includes('brotzeit') ||
      nameLower.includes('german') || nameLower.includes('barossa') || nameLower.includes('steak') ||
      nameLower.includes('grill') || nameLower.includes('pizza') || nameLower.includes('pasta') ||
      nameLower.includes('italian') || nameLower.includes('osteria') || nameLower.includes('trattoria') ||
      nameLower.includes('marché') || nameLower.includes('cedele') || nameLower.includes('da paolo') ||
      nameLower.includes('providore') || nameLower.includes('surrey hills') || nameLower.includes('tcc') ||
      nameLower.includes('wine connection') || nameLower.includes('chimichanga') || nameLower.includes('guzman') ||
      nameLower.includes('poulet') || nameLower.includes('battercatch') || nameLower.includes('4fingers') ||
      nameLower.includes('waa cow') || nameLower.includes('monster curry')) {
    return 'western, food';
  }
  // Halal/Malay
  if (nameLower.includes('encik tan') || nameLower.includes('papa ayam') || nameLower.includes('papparich') ||
      nameLower.includes('wok hey') || nameLower.includes('gyogyo')) {
    return 'halal, food';
  }
  // Seafood
  if (nameLower.includes('seafood') || nameLower.includes('crab') || nameLower.includes('kelong') ||
      nameLower.includes('shrimp')) {
    return 'seafood, food';
  }
  // Food court
  if (nameLower.includes('food republic') || nameLower.includes('kopitiam') || nameLower.includes('food hall')) {
    return 'food court, food';
  }
  // Cafe
  if (nameLower.includes('toast box') || nameLower.includes('ya kun') || nameLower.includes('mr hainan') ||
      nameLower.includes('taimei') || nameLower.includes('flipper')) {
    return 'cafe, food';
  }
  // Snacks
  if (nameLower.includes('popcorn') || nameLower.includes('candy') || nameLower.includes('fragrance') ||
      nameLower.includes('panda chan') || nameLower.includes('dough magic') || nameLower.includes('giraffa')) {
    return 'snacks, food';
  }

  return 'restaurant, food';
}

// Generate slug ID
function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-vivocity';
}

async function importRestaurants() {
  console.log('=== VIVOCITY IMPORT ===\n');

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

  for (const restaurant of vivocityRestaurants) {
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

  console.log(`\nTotal outlets at VivoCity: ${finalCount?.length || 0}`);
}

importRestaurants().catch(console.error);
