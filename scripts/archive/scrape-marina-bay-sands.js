const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MALL_ID = 'shoppes-at-marina-bay-sands';

function getCategory(name, cuisine = '') {
  const text = (name + ' ' + cuisine).toLowerCase();

  if (text.includes('coffee') || text.includes('cafe') || text.includes('café') ||
      text.includes('starbucks') || text.includes('espresso') || text.includes('tea')) {
    return 'cafe, food';
  }
  if (text.includes('bakery') || text.includes('bread') || text.includes('pastry') ||
      text.includes('patisserie')) {
    return 'bakery, food';
  }
  if (text.includes('bar') || text.includes('pub') || text.includes('lounge') ||
      text.includes('club') || text.includes('cocktail') || text.includes('wine')) {
    return 'bar, food';
  }
  if (text.includes('sushi') || text.includes('japanese') || text.includes('ramen') ||
      text.includes('izakaya') || text.includes('tempura') || text.includes('wagyu') ||
      text.includes('kaiseki')) {
    return 'japanese, food';
  }
  if (text.includes('korean') || text.includes('bbq') || text.includes('kimchi')) {
    return 'korean, food';
  }
  if (text.includes('chinese') || text.includes('dim sum') || text.includes('cantonese') ||
      text.includes('szechuan') || text.includes('hotpot') || text.includes('peking')) {
    return 'chinese, food';
  }
  if (text.includes('thai')) {
    return 'thai, food';
  }
  if (text.includes('italian') || text.includes('pizza') || text.includes('pasta') ||
      text.includes('trattoria') || text.includes('ristorante')) {
    return 'italian, food';
  }
  if (text.includes('french') || text.includes('bistro') || text.includes('brasserie')) {
    return 'french, food';
  }
  if (text.includes('indian') || text.includes('curry') || text.includes('tandoor')) {
    return 'indian, food';
  }
  if (text.includes('western') || text.includes('steak') || text.includes('grill') ||
      text.includes('burger') || text.includes('american') || text.includes('steakhouse')) {
    return 'western, food';
  }
  if (text.includes('fast food') || text.includes('mcdonald') || text.includes('kfc')) {
    return 'fast food, food';
  }
  if (text.includes('dessert') || text.includes('ice cream') || text.includes('gelato') ||
      text.includes('chocolate') || text.includes('sweet')) {
    return 'desserts, food';
  }
  if (text.includes('seafood') || text.includes('fish') || text.includes('lobster') ||
      text.includes('crab') || text.includes('oyster')) {
    return 'seafood, food';
  }
  if (text.includes('singaporean') || text.includes('local') || text.includes('hawker')) {
    return 'local, food';
  }
  if (text.includes('celebrity') || text.includes('fine dining') || text.includes('michelin')) {
    return 'fine dining, food';
  }

  return 'restaurant, food';
}

function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-marina-bay-sands';
}

async function findExistingThumbnail(name) {
  const searchName = name.toLowerCase().trim();
  const { data } = await supabase
    .from('mall_outlets')
    .select('thumbnail_url, name')
    .not('thumbnail_url', 'is', null)
    .limit(1000);

  if (data) {
    for (const outlet of data) {
      if (outlet.name.toLowerCase().trim() === searchName && outlet.thumbnail_url) {
        return outlet.thumbnail_url;
      }
    }
    for (const outlet of data) {
      const outletName = outlet.name.toLowerCase().trim();
      if ((searchName.includes(outletName) || outletName.includes(searchName)) &&
          outlet.thumbnail_url && searchName.length > 3 && outletName.length > 3) {
        return outlet.thumbnail_url;
      }
    }
  }
  return null;
}

async function findExistingOpeningHours(name) {
  const searchName = name.toLowerCase().trim();
  const { data } = await supabase
    .from('mall_outlets')
    .select('opening_hours, name')
    .not('opening_hours', 'is', null)
    .limit(1000);

  if (data) {
    for (const outlet of data) {
      if (outlet.name.toLowerCase().trim() === searchName && outlet.opening_hours) {
        return outlet.opening_hours;
      }
    }
  }
  return null;
}

async function scrapeMarinaBaySands() {
  console.log('=== IMPORTING MARINA BAY SANDS RESTAURANTS ===\n');

  // Official MBS restaurant data from CSV
  const fnbStores = [
    { name: "Wakuda Restaurant & Bar", unit: "Hotel Tower 2, Lobby", category: "japanese" },
    { name: "LAVO Italian Restaurant & Rooftop Bar", unit: "Hotel Tower 1, Level 57, Sands SkyPark", category: "italian" },
    { name: "Jin Ting Wan", unit: "Hotel Tower 1, Level 55", category: "chinese" },
    { name: "MAISON BOULUD BY DANIEL BOULUD", unit: "The Shoppes, #B1-15 & #01-83", category: "french" },
    { name: "Waku Ghin by Tetsuya Wakuda", unit: "The Shoppes, #02-03", category: "japanese" },
    { name: "Black Tap Craft Burgers & Beer", unit: "The Shoppes, #01-80", category: "western" },
    { name: "Blue Pearl", unit: "Casino, Level 1", category: "chinese" },
    { name: "Bread Street Kitchen by Gordon Ramsay", unit: "The Shoppes, #01-81", category: "western" },
    { name: "CUT by Wolfgang Puck", unit: "The Shoppes, #B1-71", category: "western" },
    { name: "estiatorio Milos", unit: "The Shoppes, #B1-48", category: "greek" },
    { name: "Fatt Choi Hotpot", unit: "Main Casino Floor, Level B2M", category: "chinese" },
    { name: "KOMA Singapore", unit: "The Shoppes, #B1-67", category: "japanese" },
    { name: "Miracle Coffee", unit: "ArtScience Museum, Lobby", category: "cafe" },
    { name: "Mott 32 Singapore", unit: "The Shoppes, #B1-42-44", category: "chinese" },
    { name: "Origin + Bloom", unit: "Hotel Tower 2 & 3, Lobby", category: "cafe" },
    { name: "Rise Restaurant", unit: "Hotel Tower 1, Lobby", category: "local" },
    { name: "Spago Bar & Lounge", unit: "Hotel Tower 2, Level 57, Sands SkyPark", category: "bar" },
    { name: "Spago Dining Room by Wolfgang Puck", unit: "Hotel Tower 2, Level 57, Sands SkyPark", category: "western" },
    { name: "THE CLUB", unit: "Hotel Tower 1, Lobby", category: "local" },
    { name: "Tong Dim", unit: "Main Casino Floor, Level B2M", category: "chinese" },
    { name: "Yardbird Southern Table & Bar", unit: "The Shoppes, #B1-07", category: "western" },
    { name: "Angelina", unit: "The Shoppes, #B2-89", category: "cafe" },
    { name: "BACHA COFFEE", unit: "Hotel Tower 3, #01-15 | The Shoppes, #B2-13/14", category: "cafe" },
    { name: "Beanstro", unit: "The Shoppes, #B2-20", category: "cafe" },
    { name: "BLOSSOM Restaurant at Marina Bay Sands", unit: "Hotel Tower 2, Lobby", category: "chinese" },
    { name: "Café Nesuto", unit: "The Shoppes, #01-87", category: "cafe" },
    { name: "Canton Paradise", unit: "The Shoppes, #01-02", category: "chinese" },
    { name: "CÉ LA VI Club Lounge & Rooftop Bar", unit: "Hotel Tower 3, Level 57, Sands SkyPark", category: "bar" },
    { name: "CÉ LA VI Restaurant", unit: "Hotel Tower 3, Level 57, Sands SkyPark", category: "asian" },
    { name: "Dallas Cafe & Bar", unit: "The Shoppes, #01-85", category: "western" },
    { name: "Din Tai Fung", unit: "The Shoppes, #B1-01", category: "chinese" },
    { name: "Haidilao Hot Pot", unit: "The Shoppes, #B2-01A", category: "chinese" },
    { name: "Imperial Treasure Fine Chinese Cuisine", unit: "The Shoppes, #02-04", category: "chinese" },
    { name: "Imperial Treasure Fine Teochew Cuisine", unit: "The Shoppes, #01-26", category: "chinese" },
    { name: "IPPUDO", unit: "The Shoppes, #B2-54", category: "japanese" },
    { name: "JUMBO Signatures", unit: "The Shoppes, #B1-01B", category: "chinese" },
    { name: "Le Noir", unit: "The Shoppes, #01-84", category: "bar" },
    { name: "PS.CAFE", unit: "The Shoppes, #B2-119", category: "cafe" },
    { name: "Punjab Grill", unit: "The Shoppes, #B1-01A", category: "indian" },
    { name: "PUTIEN", unit: "The Shoppes, #01-05", category: "chinese" },
    { name: "RALPH'S COFFEE", unit: "The Shoppes, #01-71", category: "cafe" },
    { name: "Rasapura Masters", unit: "The Shoppes, #B2-50", category: "food court" },
    { name: "Roberta's Pizza", unit: "The Shoppes, #B1-45", category: "italian" },
    { name: "Sen of Japan", unit: "The Shoppes, #01-86", category: "japanese" },
    { name: "So Pho", unit: "The Shoppes, #01-03/04", category: "vietnamese" },
    { name: "Starbucks Reserve", unit: "The Shoppes, #B2-56", category: "cafe" },
    { name: "Tim Ho Wan PEAK", unit: "The Shoppes, #B2-02", category: "chinese" },
    { name: "Toast Box", unit: "The Shoppes, #B1-01E", category: "local" },
    { name: "TWG Tea Salon & Boutique", unit: "The Shoppes, #B2-65/B1-122", category: "cafe" }
  ];

  console.log(`Total restaurants: ${fnbStores.length}`);

  // Print found stores
  console.log('\nRestaurants:');
  for (const store of fnbStores) {
    console.log(`  - ${store.name} (${store.unit})`);
  }

  // Delete existing outlets for this mall
  console.log('\nRemoving existing outlets...');
  const { data: existing } = await supabase
    .from('mall_outlets')
    .select('id')
    .eq('mall_id', MALL_ID);

  if (existing?.length > 0) {
    await supabase.from('mall_outlets').delete().eq('mall_id', MALL_ID);
    console.log(`Deleted ${existing.length} existing outlets`);
  }

  // Import new outlets
  console.log('\nImporting outlets...');
  let imported = 0;
  for (const store of fnbStores) {
    let thumbnail = null;
    let hours = null;

    // Try to find existing thumbnail
    thumbnail = await findExistingThumbnail(store.name);
    if (thumbnail) console.log(`    Found existing thumbnail for ${store.name}`);

    // Try to find existing opening hours
    hours = await findExistingOpeningHours(store.name);
    if (hours) console.log(`    Found existing hours for ${store.name}`);

    // Use category from CSV data, fallback to name-based detection
    let category;
    if (store.category) {
      const catMap = {
        'japanese': 'japanese, food',
        'chinese': 'chinese, food',
        'western': 'western, food',
        'italian': 'italian, food',
        'french': 'french, food',
        'greek': 'mediterranean, food',
        'indian': 'indian, food',
        'vietnamese': 'vietnamese, food',
        'asian': 'asian, food',
        'local': 'local, food',
        'cafe': 'cafe, food',
        'bar': 'bar, food',
        'food court': 'food court, food'
      };
      category = catMap[store.category] || 'restaurant, food';
    } else {
      category = getCategory(store.name, '');
    }

    const { error } = await supabase
      .from('mall_outlets')
      .insert({
        id: generateId(store.name),
        name: store.name,
        mall_id: MALL_ID,
        level: store.unit || '',
        category: category,
        thumbnail_url: thumbnail,
        opening_hours: hours,
        tags: []
      });

    if (!error) {
      imported++;
      console.log(`  ✓ ${store.name} (${store.unit})`);
    } else {
      console.log(`  ✗ ${store.name} - ${error.message}`);
    }
  }

  console.log(`\n=== COMPLETE ===`);
  console.log(`Imported: ${imported}/${fnbStores.length} outlets`);
}

scrapeMarinaBaySands();
