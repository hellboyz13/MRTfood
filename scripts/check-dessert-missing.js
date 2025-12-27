const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Dessert keywords to check
const DESSERT_WORDS = [
  'ice cream', 'gelato', 'creamery', 'sorbet',
  'cake', 'bakery', 'pastry', 'patisserie',
  'waffle', 'pancake', 'crepe',
  'donut', 'doughnut',
  'tart', 'pie', 'pies',
  'mochi', 'bingsu', 'durian',
  'churros', 'chocolate', 'cocoa',
  'tea house', 'tea chapter', 'matcha', 'boba', 'bubble tea',
  'froyo', 'yogurt', 'yoghurt',
  'acai', 'açaí',
  'dessert', 'sweet', 'sugar',
  'parfait', 'pudding',
  'cookie', 'brownie', 'macaron', 'cupcake',
  'honey', 'maple',
  'croissant', 'toast box', 'ya kun',
  'gong cha', 'koi', 'liho', 'each a cup', 'playmade', 'chicha',
  'starbucks', 'coffee bean', 'cedele', 'plain vanilla',
  'birds of paradise', 'kind kones', 'hvala', 'twg',
  'mr bean', 'old chang kee'
];

// Savory places to exclude
const SAVORY_EXCLUDES = [
  'hawker', 'noodle', 'noodles', 'rice', 'chicken', 'pork', 'beef', 'fish', 'seafood',
  'dim sum', 'zi char', 'indian', 'thai', 'japanese', 'korean', 'chinese',
  'western', 'ramen', 'sushi', 'restaurant', 'kitchen', 'grill', 'bbq',
  'steamboat', 'hotpot', 'claypot', 'curry', 'biryani', 'prata', 'nasi',
  'mee', 'laksa', 'satay', 'steak', 'burger', 'pizza', 'pasta',
  'eating house', 'food court', 'kopitiam', 'canteen', 'bistro',
  'cze char', 'teochew', 'hokkien', 'bak kut teh', 'duck', 'lamb',
  'vietnamese', 'mexican', 'american'
];

async function checkMissing() {
  console.log('=== CHECKING LISTINGS MISSING DESSERT TAG ===\n');

  // Fetch all active listings
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

  console.log(`Total active listings: ${allListings.length}\n`);

  // Find listings that might be dessert but don't have the tag
  const missing = [];

  for (const listing of allListings) {
    const tags = listing.tags || [];
    if (tags.includes('Dessert')) continue; // Already has tag

    const nameLower = listing.name.toLowerCase();

    // Check if name contains any dessert keyword
    const hasDessertWord = DESSERT_WORDS.some(w => nameLower.includes(w));
    if (!hasDessertWord) continue;

    // Check if it's primarily savory
    const isSavory = SAVORY_EXCLUDES.some(w => nameLower.includes(w));
    if (isSavory) continue;

    missing.push({
      id: listing.id,
      name: listing.name,
      tags: tags
    });
  }

  console.log(`Found ${missing.length} listings potentially missing Dessert tag:\n`);
  missing.forEach((l, i) => {
    console.log(`${i + 1}. ${l.name}`);
    console.log(`   Current tags: ${l.tags.length > 0 ? l.tags.join(', ') : '(none)'}`);
  });

  return missing;
}

checkMissing().catch(console.error);
