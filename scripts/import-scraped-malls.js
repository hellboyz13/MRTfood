const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Map scraped mall_ids to actual database mall_ids
const MALL_ID_MAP = {
  'cineleisure-orchard': 'cineleisure-orchard',
  'city-square-mall': 'city-square-mall',
  'clarke-quay-central': 'clarke-quay-central',
  'compass-one': 'compass-one'
};

function generateId(name, mallId) {
  const slug = name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-');
  return `${slug}-${mallId}`;
}

function getCategory(name) {
  const n = name.toLowerCase();

  // Fast Food
  if (n.includes('mcdonald') || n.includes('kfc') || n.includes('burger king') ||
      n.includes('mos burger') || n.includes('long john') || n.includes('pizza hut') ||
      n.includes('subway') || n.includes('4fingers') || n.includes('popeyes') ||
      n.includes('jollibee') || n.includes('wingstop')) {
    return 'fast food, food';
  }

  // Japanese
  if (n.includes('sushi') || n.includes('ramen') || n.includes('tonkatsu') ||
      n.includes('ajisen') || n.includes('tori-q') || n.includes('maki-san') ||
      n.includes('shokudo') || n.includes('sushiro') || n.includes('ippudo') ||
      n.includes('genki') || n.includes('ichiban') || n.includes('yoshinoya') ||
      n.includes('yakiniku') || n.includes('unagi') || n.includes('sukiya') ||
      n.includes('pepper lunch')) {
    return 'japanese, food';
  }

  // Korean
  if (n.includes('bibimbap') || n.includes('korean') || n.includes('pocha') ||
      n.includes('seorae') || n.includes('myeongdong') || n.includes('hankang')) {
    return 'korean, food';
  }

  // Chinese
  if (n.includes('wok hey') || n.includes('putien') || n.includes('lanzhou') ||
      n.includes('hot pot') || n.includes('hotpot') || n.includes('ma la') ||
      n.includes('malatang') || n.includes('dumpling') || n.includes('din tai fung') ||
      n.includes('canton') || n.includes('dian xiao er') || n.includes('kok sen') ||
      n.includes('lenu') || n.includes('white restaurant') || n.includes('hunan') ||
      n.includes('sichuan') || n.includes('hong kong')) {
    return 'chinese, food';
  }

  // Thai
  if (n.includes('thai') || n.includes('nakhon') || n.includes('sanook') ||
      n.includes('tuk tuk')) {
    return 'thai, food';
  }

  // Vietnamese
  if (n.includes('vietnam') || n.includes('pho')) {
    return 'vietnamese, food';
  }

  // Indonesian/Malay
  if (n.includes('penyet') || n.includes('penyetz') || n.includes('encik tan') ||
      n.includes('penang')) {
    return 'malay, food';
  }

  // Western
  if (n.includes('astons') || n.includes('jack\'s place') || n.includes('swensen') ||
      n.includes('pasta') || n.includes('lasagne') || n.includes('stuff\'d') ||
      n.includes('stuffd') || n.includes('kenny rogers') || n.includes('fat sparrow')) {
    return 'western, food';
  }

  // Italian
  if (n.includes('pizza') || n.includes('pezzo') || n.includes('saizeriya') ||
      n.includes('trattoria') || n.includes('mamma mia')) {
    return 'italian, food';
  }

  // Taiwanese
  if (n.includes('shihlin') || n.includes('taiwan') || n.includes('lai lai')) {
    return 'taiwanese, food';
  }

  // Cafe & Beverages
  if (n.includes('coffee') || n.includes('toast') || n.includes('ya kun') ||
      n.includes('fun toast') || n.includes('koi') || n.includes('liho') ||
      n.includes('beutea') || n.includes('playmade') || n.includes('coconut') ||
      n.includes('starbucks') || n.includes('cedele') || n.includes('craftsmen') ||
      n.includes('tim hortons') || n.includes('kenangan')) {
    return 'cafe, food';
  }

  // Bakery
  if (n.includes('bread') || n.includes('baguette') || n.includes('four leaves') ||
      n.includes('polar') || n.includes('bengawan') || n.includes('nam kee pau') ||
      n.includes('barcook') || n.includes('bakeinc') || n.includes('duke bakery') ||
      n.includes('cake shop') || n.includes('rich & good')) {
    return 'bakery, food';
  }

  // Desserts
  if (n.includes('chateraise') || n.includes('nine fresh') || n.includes('pancake') ||
      n.includes('mr bean') || n.includes('gelare') || n.includes('baskin') ||
      n.includes('ice cream') || n.includes('ice-cream') || n.includes('azabu sabo') ||
      n.includes('tiramisu') || n.includes('ah chew') || n.includes('tsujiri') ||
      n.includes('acai') || n.includes('mei heong') || n.includes('chocolate')) {
    return 'desserts, food';
  }

  // Snacks
  if (n.includes('bee cheng') || n.includes('old chang kee') || n.includes('fruit') ||
      n.includes('famous amos') || n.includes('dunkin') || n.includes('boost juice')) {
    return 'snacks, food';
  }

  // Food Court / Kiosk
  if (n.includes('kopitiam') || n.includes('eat.') || n.includes('crave') ||
      n.includes('food dynasty') || n.includes('food republic')) {
    return 'food court, food';
  }

  // Default
  return 'restaurant, food';
}

async function importMall(filename, mallId) {
  console.log(`\n=== IMPORTING ${mallId.toUpperCase()} ===`);

  // Read the JSON file
  let outlets;
  try {
    const data = fs.readFileSync(filename, 'utf8');
    outlets = JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filename}: ${error.message}`);
    return 0;
  }

  console.log(`Found ${outlets.length} outlets to import`);

  // Delete existing outlets
  const { data: existing } = await supabase
    .from('mall_outlets')
    .select('id')
    .eq('mall_id', mallId);

  if (existing?.length > 0) {
    await supabase.from('mall_outlets').delete().eq('mall_id', mallId);
    console.log(`Deleted ${existing.length} existing outlets`);
  }

  // Import new outlets
  let imported = 0;
  let errors = 0;

  for (const outlet of outlets) {
    const { error } = await supabase
      .from('mall_outlets')
      .insert({
        id: generateId(outlet.name, mallId),
        name: outlet.name,
        mall_id: mallId,
        level: outlet.level,
        category: getCategory(outlet.name),
        thumbnail_url: outlet.thumbnail_url || null,
        opening_hours: null,
        tags: []
      });

    if (!error) {
      imported++;
      console.log(`  [${outlet.level}] ${outlet.name}`);
    } else {
      errors++;
      console.log(`  ERROR: ${outlet.name} - ${error.message}`);
    }
  }

  console.log(`Imported: ${imported}/${outlets.length} (${errors} errors)`);
  return imported;
}

async function main() {
  console.log('=== IMPORTING SCRAPED MALL OUTLETS ===');
  console.log('Date:', new Date().toISOString());

  const mallFiles = [
    { file: 'cineleisure-outlets.json', mallId: 'cineleisure-orchard' },
    { file: 'city-square-mall-outlets.json', mallId: 'city-square-mall' },
    { file: 'clarke-quay-central-outlets.json', mallId: 'clarke-quay-central' },
    { file: 'compass-one-outlets.json', mallId: 'compass-one' }
  ];

  let totalImported = 0;

  for (const { file, mallId } of mallFiles) {
    const count = await importMall(file, mallId);
    totalImported += count;
  }

  console.log('\n=== COMPLETE ===');
  console.log(`Total outlets imported: ${totalImported}`);
}

main().catch(console.error);
