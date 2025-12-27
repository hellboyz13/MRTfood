const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Dessert keywords - comprehensive list
const DESSERT_KEYWORDS = [
  // Ice cream & frozen
  'ice cream', 'gelato', 'creamery', 'sorbet', 'froyo', 'frozen yogurt', 'yoghurt',
  // Baked goods
  'cake', 'bakery', 'bakehouse', 'pastry', 'patisserie', 'tart', 'pie', 'pies',
  'croissant', 'bread', 'donut', 'doughnut', 'cookie', 'cookies', 'brownie',
  'macaron', 'cupcake', 'muffin',
  // Asian desserts
  'mochi', 'bingsu', 'durian', 'tang yuan', 'tau huay', 'chendol', 'cendol',
  'tong sui', 'grass jelly', 'orh nee',
  // Hot/cold drinks as dessert
  'bubble tea', 'bbt', 'boba', 'gong cha', 'koi', 'liho', 'each a cup', 'playmade',
  'chicha', 'r&b tea', 'tiger sugar', 'xing fu tang', 'partea', 'heytea', 'hey tea',
  // Tea houses
  'tea house', 'matcha', 'twg', 'tea chapter',
  // Specialty dessert
  'waffle', 'pancake', 'crepe', 'churros', 'chocolate', 'cocoa', 'fudge',
  'parfait', 'pudding', 'mousse', 'souffle',
  'sweet', 'sugar', 'honey', 'maple', 'caramel',
  // Acai & smoothies
  'acai', 'açaí', 'smoothie', 'juice bar',
  // Coffee chains that are dessert-forward
  'starbucks', 'coffee bean', 'toast box', 'ya kun', 'killiney',
  'cedele', 'plain vanilla', 'tiong bahru bakery',
  'birds of paradise', 'kind kones', 'hvala', 'matchaya',
  'common man coffee', 'atlas coffeehouse', 'apartment coffee',
  'nylon coffee', 'dutch colony', 'luckin coffee', 'flash coffee',
  'kenangan coffee', 'blue bottle', 'bacha coffee', 'arteastiq',
  'ps.cafe', 'ps cafe', 'mrs fields', 'famous amos',
  // Local chains
  'mr bean', 'jollibean', 'old chang kee'
];

// Categories that indicate dessert (for mall_outlets)
const DESSERT_CATEGORIES = [
  'dessert', 'ice cream', 'bakery', 'cafe', 'coffee', 'tea', 'bubble tea',
  'bbt', 'cake', 'chocolate', 'sweets', 'pastry', 'gelato'
];

// Savory places to exclude
const SAVORY_EXCLUDES = [
  'hawker', 'noodle', 'noodles', 'rice bowl', 'chicken rice', 'pork', 'beef', 'fish', 'seafood',
  'dim sum', 'zi char', 'cze char', 'indian', 'thai', 'japanese', 'korean', 'chinese',
  'western', 'ramen', 'sushi', 'restaurant', 'kitchen', 'grill', 'bbq', 'barbeque',
  'steamboat', 'hotpot', 'claypot', 'curry', 'biryani', 'prata', 'nasi',
  'mee goreng', 'mee rebus', 'laksa', 'satay', 'steak', 'burger', 'pizza', 'pasta',
  'eating house', 'food court', 'kopitiam', 'canteen', 'bistro',
  'teochew', 'hokkien mee', 'bak kut teh', 'roast duck', 'lamb',
  'vietnamese', 'pho', 'mexican', 'american', 'italian',
  'fried chicken', 'wonton', 'dumpling', 'gyoza', 'tempura', 'udon', 'soba',
  'shawarma', 'kebab', 'wrap', 'sandwich'
];

function shouldBeDessert(name, tags, category = null) {
  const nameLower = name.toLowerCase();

  // Check if name contains any dessert keyword
  const hasDessertWord = DESSERT_KEYWORDS.some(w => nameLower.includes(w));

  // Check category for mall_outlets
  const catLower = (category || '').toLowerCase();
  const hasDessertCategory = DESSERT_CATEGORIES.some(c => catLower.includes(c));

  if (!hasDessertWord && !hasDessertCategory) return false;

  // Check if it's primarily savory
  const isSavory = SAVORY_EXCLUDES.some(w => nameLower.includes(w));
  if (isSavory) return false;

  // Check tags for savory indicators
  const tagsLower = (tags || []).map(t => t.toLowerCase());
  if (tagsLower.some(t => ['chinese', 'japanese', 'korean', 'indian', 'thai', 'vietnamese', 'seafood', 'hawker'].includes(t))) {
    // But allow if also has dessert-related tag
    if (!tagsLower.some(t => ['cafe', 'coffee', 'dessert', 'bakery', 'ice cream', 'bubble tea'].includes(t))) {
      return false;
    }
  }

  return true;
}

async function checkAndUpdate() {
  console.log('='.repeat(60));
  console.log('COMPREHENSIVE DESSERT TAG UPDATE');
  console.log('='.repeat(60));

  // === FOOD LISTINGS ===
  console.log('\n--- CHECKING FOOD_LISTINGS ---\n');
  let allListings = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('food_listings')
      .select('id, name, tags')
      .eq('is_active', true)
      .range(offset, offset + 999);
    if (error) { console.error('Error:', error); break; }
    if (!data || data.length === 0) break;
    allListings = allListings.concat(data);
    offset += 1000;
    if (data.length < 1000) break;
  }
  console.log(`Total food listings: ${allListings.length}`);

  let listingsToUpdate = [];
  for (const listing of allListings) {
    const tags = listing.tags || [];
    if (tags.includes('Dessert')) continue;
    if (shouldBeDessert(listing.name, tags)) {
      listingsToUpdate.push(listing);
    }
  }
  console.log(`Listings needing Dessert tag: ${listingsToUpdate.length}`);

  // Update food listings
  let listingsUpdated = 0;
  for (const listing of listingsToUpdate) {
    const newTags = [...(listing.tags || []), 'Dessert'];
    const { error } = await supabase
      .from('food_listings')
      .update({ tags: newTags })
      .eq('id', listing.id);
    if (!error) {
      listingsUpdated++;
      console.log(`  [UPDATED] ${listing.name}`);
    } else {
      console.log(`  [ERROR] ${listing.name}: ${error.message}`);
    }
  }

  // === MALL OUTLETS ===
  console.log('\n--- CHECKING MALL_OUTLETS ---\n');
  let allOutlets = [];
  offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('mall_outlets')
      .select('id, name, tags, category')
      .range(offset, offset + 999);
    if (error) { console.error('Error:', error); break; }
    if (!data || data.length === 0) break;
    allOutlets = allOutlets.concat(data);
    offset += 1000;
    if (data.length < 1000) break;
  }
  console.log(`Total mall outlets: ${allOutlets.length}`);

  let outletsToUpdate = [];
  for (const outlet of allOutlets) {
    const tags = outlet.tags || [];
    if (tags.includes('Dessert')) continue;
    if (shouldBeDessert(outlet.name, tags, outlet.category)) {
      outletsToUpdate.push(outlet);
    }
  }
  console.log(`Outlets needing Dessert tag: ${outletsToUpdate.length}`);

  // Update mall outlets
  let outletsUpdated = 0;
  for (const outlet of outletsToUpdate) {
    const newTags = [...(outlet.tags || []), 'Dessert'];
    const { error } = await supabase
      .from('mall_outlets')
      .update({ tags: newTags })
      .eq('id', outlet.id);
    if (!error) {
      outletsUpdated++;
      console.log(`  [UPDATED] ${outlet.name} (${outlet.category || 'no category'})`);
    } else {
      console.log(`  [ERROR] ${outlet.name}: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Food listings updated: ${listingsUpdated}`);
  console.log(`Mall outlets updated: ${outletsUpdated}`);
  console.log(`Total: ${listingsUpdated + outletsUpdated}`);
}

checkAndUpdate().catch(console.error);
