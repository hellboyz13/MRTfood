const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Strong dessert keywords - if name contains these, definitely a dessert place
const STRONG_DESSERT_KEYWORDS = [
  // Core dessert terms
  'bakery', 'ice cream', 'gelato', 'bubble tea', 'boba',
  'dessert', 'patisserie', 'confectionery',

  // Bubble tea chains
  'gong cha', 'liho', 'koi', 'tiger sugar', 'each a cup',
  'playmade', 'r&b tea', 'chicha san chen', 'heytea', 'chagee',
  'the alley', 'sharetea', 'itea', 'kung fu tea', 'teabrary',

  // Ice cream brands/shops
  'häagen-dazs', 'haagen-dazs', 'baskin robbins', 'udders',
  'island creamery', 'ben & jerry', 'cold stone', 'llaollao',
  'creamier', 'birds of paradise', 'tom\'s palette', 'sunday folks',

  // Bakery chains
  'breadtalk', 'toast box', 'polar', 'four leaves', 'bengawan solo',
  'crystal jade bakery', 'chateraise', 'donq', 'delifrance',
  'paris baguette', 'tous les jours', '85 degrees', '85°c',
  'barcook', 'swee heng', 'cedele',

  // Local desserts
  'chendol', 'cendol', 'tang shui', 'ah balling', 'beancurd',
  'tau huay', 'orh nee', 'cheng tng', 'sourbombe'
];

// Weak dessert keywords - only tag if NOT a restaurant
const WEAK_DESSERT_KEYWORDS = [
  'cake', 'waffle', 'churros', 'donut', 'doughnut',
  'pastry', 'sweet', 'pudding', 'macaron', 'cupcake',
  'brownie', 'cookie', 'tart', 'sorbet'
];

// Name patterns that indicate it's a restaurant, not a dessert place
const RESTAURANT_NAME_PATTERNS = [
  'restaurant', 'ristorante', 'trattoria', 'osteria', 'bistro',
  'kitchen', 'diner', 'eatery', 'grill', 'steakhouse',
  'pasta', 'pizza', 'seafood', 'noodle', 'rice',
  'curry', 'ramen', 'sushi', 'dim sum', 'hawker',
  'food centre', 'chicken rice', 'bak kut teh', 'laksa',
  'mee ', ' mee', 'mie ', ' mie', 'pho ', ' pho'
];

function shouldTagAsDessert(name) {
  const nameLower = (name || '').toLowerCase();

  // Check for strong dessert keywords - always tag
  const hasStrongKeyword = STRONG_DESSERT_KEYWORDS.some(keyword =>
    nameLower.includes(keyword.toLowerCase())
  );

  if (hasStrongKeyword) {
    return true;
  }

  // Check for weak dessert keywords
  const hasWeakKeyword = WEAK_DESSERT_KEYWORDS.some(keyword =>
    nameLower.includes(keyword.toLowerCase())
  );

  if (hasWeakKeyword) {
    // But NOT if it looks like a restaurant
    const isRestaurant = RESTAURANT_NAME_PATTERNS.some(pattern =>
      nameLower.includes(pattern.toLowerCase())
    );

    return !isRestaurant;
  }

  return false;
}

async function fixDessertTags() {
  console.log('='.repeat(60));
  console.log('FIXING DESSERT TAGS');
  console.log('='.repeat(60));

  // Fix food_listings table
  console.log('\n--- Processing food_listings ---');

  const { data: listings, error: listingsError } = await supabase
    .from('food_listings')
    .select('id, name, tags');

  if (listingsError) {
    console.error('Error fetching listings:', listingsError);
    return;
  }

  console.log(`Found ${listings.length} listings`);

  let listingsUpdated = 0;
  let listingsAddedDessert = 0;
  let listingsRemovedDessert = 0;

  for (const listing of listings) {
    const currentTags = listing.tags || [];
    const hasDessertTag = currentTags.includes('Dessert');
    const shouldHaveDessert = shouldTagAsDessert(listing.name);

    if (shouldHaveDessert && !hasDessertTag) {
      // Add Dessert tag
      const newTags = [...currentTags, 'Dessert'];
      const { error } = await supabase
        .from('food_listings')
        .update({ tags: newTags })
        .eq('id', listing.id);

      if (!error) {
        listingsAddedDessert++;
        listingsUpdated++;
        console.log(`  + Added Dessert: ${listing.name}`);
      }
    } else if (!shouldHaveDessert && hasDessertTag) {
      // Remove Dessert tag
      const newTags = currentTags.filter(t => t !== 'Dessert');
      const { error } = await supabase
        .from('food_listings')
        .update({ tags: newTags })
        .eq('id', listing.id);

      if (!error) {
        listingsRemovedDessert++;
        listingsUpdated++;
        console.log(`  - Removed Dessert: ${listing.name}`);
      }
    }
  }

  console.log(`\nListings: ${listingsUpdated} updated (${listingsAddedDessert} added, ${listingsRemovedDessert} removed)`);

  // Fix mall_outlets table
  console.log('\n--- Processing mall_outlets ---');

  const { data: outlets, error: outletsError } = await supabase
    .from('mall_outlets')
    .select('id, name, tags');

  if (outletsError) {
    console.error('Error fetching outlets:', outletsError);
    return;
  }

  console.log(`Found ${outlets.length} outlets`);

  let outletsUpdated = 0;
  let outletsAddedDessert = 0;
  let outletsRemovedDessert = 0;

  for (const outlet of outlets) {
    const currentTags = outlet.tags || [];
    const hasDessertTag = currentTags.includes('Dessert');
    const shouldHaveDessert = shouldTagAsDessert(outlet.name);

    if (shouldHaveDessert && !hasDessertTag) {
      // Add Dessert tag
      const newTags = [...currentTags, 'Dessert'];
      const { error } = await supabase
        .from('mall_outlets')
        .update({ tags: newTags })
        .eq('id', outlet.id);

      if (!error) {
        outletsAddedDessert++;
        outletsUpdated++;
        console.log(`  + Added Dessert: ${outlet.name}`);
      }
    } else if (!shouldHaveDessert && hasDessertTag) {
      // Remove Dessert tag
      const newTags = currentTags.filter(t => t !== 'Dessert');
      const { error } = await supabase
        .from('mall_outlets')
        .update({ tags: newTags })
        .eq('id', outlet.id);

      if (!error) {
        outletsRemovedDessert++;
        outletsUpdated++;
        console.log(`  - Removed Dessert: ${outlet.name}`);
      }
    }
  }

  console.log(`\nOutlets: ${outletsUpdated} updated (${outletsAddedDessert} added, ${outletsRemovedDessert} removed)`);

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Listings: +${listingsAddedDessert} / -${listingsRemovedDessert}`);
  console.log(`Outlets:  +${outletsAddedDessert} / -${outletsRemovedDessert}`);
  console.log(`Total changes: ${listingsUpdated + outletsUpdated}`);
}

fixDessertTags().catch(console.error);
