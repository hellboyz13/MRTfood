const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MALL_ID = 'tiong-bahru-plaza';

// F&B outlets at Tiong Bahru Plaza (from official mall directory)
const outlets = [
  // Level 1
  { name: "4FINGERS Crispy Chicken", level: "Level 1" },
  { name: "Beutea", level: "Level 1" },
  { name: "BreadTalk/Toast Box", level: "Level 1" },
  { name: "Burger King", level: "Level 1" },
  { name: "Fore Coffee", level: "Level 1" },
  { name: "Fun Toast", level: "Level 1" },
  { name: "KOI Thé", level: "Level 1" },
  { name: "Long John Silver's", level: "Level 1" },
  { name: "Maki-San", level: "Level 1" },
  { name: "McDonald's", level: "Level 1" },
  { name: "Mr. Coconut", level: "Level 1" },
  { name: "Paris Baguette", level: "Level 1" },
  { name: "PlayMade", level: "Level 1" },
  { name: "Subway", level: "Level 1" },
  { name: "The Coffee Bean & Tea Leaf", level: "Level 1" },
  { name: "The Soup Spoon", level: "Level 1" },
  { name: "Tonkatsu by Ma Maison", level: "Level 1" },

  // Level 2
  { name: "A-One Signature", level: "Level 2" },
  { name: "Ajisen", level: "Level 2" },
  { name: "Dapur Penyet", level: "Level 2" },
  { name: "Du Du Dumplings", level: "Level 2" },
  { name: "Gong Yuan Ma La Tang", level: "Level 2" },
  { name: "Hoe Nam Vintage", level: "Level 2" },
  { name: "Lead General Hot Pot", level: "Level 2" },
  { name: "Milan Shokudo", level: "Level 2" },
  { name: "Mincheng Bibimbap", level: "Level 2" },
  { name: "Nan Yang Dao", level: "Level 2" },
  { name: "Pizza Hut", level: "Level 2" },
  { name: "PUTIEN MAMA", level: "Level 2" },
  { name: "Ramen Hitoyoshi", level: "Level 2" },
  { name: "Sakon Thai Village", level: "Level 2" },
  { name: "Shi Li Fang Hot Pot", level: "Level 2" },
  { name: "Sushiro", level: "Level 2" },
  { name: "Tongue Tip Lanzhou Beef Noodles", level: "Level 2" },
  { name: "Zuya Vegetarian", level: "Level 2" },

  // Level 3
  { name: "Kopitiam", level: "Level 3" },
  { name: "Sushi Tei", level: "Level 3" },

  // Basement 1
  { name: "Bee Cheng Hiang", level: "Basement 1" },
  { name: "Bengawan Solo", level: "Basement 1" },
  { name: "Chateraise", level: "Basement 1" },
  { name: "Crave", level: "Basement 1" },
  { name: "D'Penyetz", level: "Basement 1" },
  { name: "Dabba Street", level: "Basement 1" },
  { name: "EAT.", level: "Basement 1" },
  { name: "Four Leaves", level: "Basement 1" },
  { name: "Fruit Box", level: "Basement 1" },
  { name: "Jia Li Seafood Soup", level: "Basement 1" },
  { name: "KFC", level: "Basement 1" },
  { name: "Koo Kee", level: "Basement 1" },
  { name: "LiHO TEA", level: "Basement 1" },
  { name: "MOS Burger", level: "Basement 1" },
  { name: "Mr Bean", level: "Basement 1" },
  { name: "Munchi Pancakes", level: "Basement 1" },
  { name: "Nam Kee Pau", level: "Basement 1" },
  { name: "NiKU iKU", level: "Basement 1" },
  { name: "Nine Fresh", level: "Basement 1" },
  { name: "Old Chang Kee", level: "Basement 1" },
  { name: "PastaGo", level: "Basement 1" },
  { name: "Polar Puffs & Cakes", level: "Basement 1" },
  { name: "Shihlin Taiwan Street Food", level: "Basement 1" },
  { name: "Stuff'd", level: "Basement 1" },
  { name: "Super Sushi", level: "Basement 1" },
  { name: "Tori-Q", level: "Basement 1" },
  { name: "Wok Hey", level: "Basement 1" },
  { name: "Ya Kun Kaya Toast", level: "Basement 1" },
];

function getCategory(name) {
  const n = name.toLowerCase();

  // Fast Food
  if (n.includes('mcdonald') || n.includes('kfc') || n.includes('burger king') ||
      n.includes('mos burger') || n.includes('long john') || n.includes('pizza hut') ||
      n.includes('subway') || n.includes('4fingers')) {
    return 'fast food, food';
  }

  // Japanese
  if (n.includes('sushi') || n.includes('ramen') || n.includes('tonkatsu') ||
      n.includes('ajisen') || n.includes('tori-q') || n.includes('maki-san') ||
      n.includes('milan shokudo') || n.includes('sushiro')) {
    return 'japanese, food';
  }

  // Korean
  if (n.includes('bibimbap') || n.includes('korean')) {
    return 'korean, food';
  }

  // Chinese
  if (n.includes('wok hey') || n.includes('putien') || n.includes('lanzhou') ||
      n.includes('hot pot') || n.includes('ma la') || n.includes('dumpling') ||
      n.includes('hoe nam') || n.includes('koo kee') || n.includes('a-one') ||
      n.includes('nan yang') || n.includes('jia li') || n.includes('shi li fang')) {
    return 'chinese, food';
  }

  // Thai
  if (n.includes('thai') || n.includes('sakon')) {
    return 'thai, food';
  }

  // Indonesian/Malay
  if (n.includes('penyet') || n.includes('penyetz')) {
    return 'indonesian, food';
  }

  // Indian
  if (n.includes('dabba')) {
    return 'indian, food';
  }

  // Taiwanese
  if (n.includes('shihlin') || n.includes('taiwan')) {
    return 'taiwanese, food';
  }

  // Cafe & Beverages
  if (n.includes('coffee') || n.includes('toast') || n.includes('ya kun') ||
      n.includes('fun toast') || n.includes('koi') || n.includes('liho') ||
      n.includes('beutea') || n.includes('playmade') || n.includes('mr. coconut') ||
      n.includes('fore coffee')) {
    return 'cafe, food';
  }

  // Bakery
  if (n.includes('bread') || n.includes('baguette') || n.includes('four leaves') ||
      n.includes('polar') || n.includes('bengawan') || n.includes('nam kee pau')) {
    return 'bakery, food';
  }

  // Desserts
  if (n.includes('chateraise') || n.includes('nine fresh') || n.includes('pancake') ||
      n.includes('mr bean')) {
    return 'desserts, food';
  }

  // Snacks
  if (n.includes('bee cheng') || n.includes('old chang kee') || n.includes('fruit box')) {
    return 'snacks, food';
  }

  // Vegetarian
  if (n.includes('vegetarian') || n.includes('zuya')) {
    return 'vegetarian, food';
  }

  // Food Court
  if (n.includes('kopitiam') || n.includes('eat.') || n.includes('crave')) {
    return 'food court, food';
  }

  // Western
  if (n.includes('soup spoon') || n.includes('pasta') || n.includes('stuff')) {
    return 'western, food';
  }

  // Seafood
  if (n.includes('seafood')) {
    return 'seafood, food';
  }

  // Default
  return 'restaurant, food';
}

function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-tbp';
}

async function importTiongBahruPlaza() {
  console.log('=== IMPORTING TIONG BAHRU PLAZA F&B OUTLETS ===\n');
  console.log(`Total outlets to import: ${outlets.length}\n`);

  // Delete existing outlets
  console.log('Removing existing outlets...');
  const { data: existing } = await supabase
    .from('mall_outlets')
    .select('id')
    .eq('mall_id', MALL_ID);

  if (existing?.length > 0) {
    await supabase.from('mall_outlets').delete().eq('mall_id', MALL_ID);
    console.log(`Deleted ${existing.length} existing outlets\n`);
  }

  // Import new outlets
  console.log('Importing outlets...');
  let imported = 0;

  for (const outlet of outlets) {
    const { error } = await supabase
      .from('mall_outlets')
      .insert({
        id: generateId(outlet.name),
        name: outlet.name,
        mall_id: MALL_ID,
        level: outlet.level,
        category: getCategory(outlet.name),
        thumbnail_url: null,
        opening_hours: null,
        tags: []
      });

    if (!error) {
      imported++;
      console.log(`  [${outlet.level}] ${outlet.name}`);
    } else {
      console.log(`  Error: ${outlet.name} - ${error.message}`);
    }
  }

  console.log(`\n=== COMPLETE ===`);
  console.log(`Imported: ${imported}/${outlets.length}`);
}

importTiongBahruPlaza().catch(console.error);
