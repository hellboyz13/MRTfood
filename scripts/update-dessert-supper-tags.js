const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Dessert detection patterns
const DESSERT_PATTERNS = [
  'cafe', 'coffee', 'bakery', 'cake', 'ice cream', 'gelato', 'dessert',
  'pastry', 'patisserie', 'sweet', 'chocolate', 'boba', 'bubble tea',
  'acai', 'açaí', 'matcha', 'tea house', 'creamery', 'crepe', 'waffle',
  'donut', 'doughnut', 'macaron', 'tart', 'pie', 'cupcake', 'brownie',
  'mochi', 'bingsu', 'froyo', 'yogurt', 'churros', 'creamed', 'parfait'
];

// These are savory-first places - should NOT be tagged as dessert even with cafe/coffee in name
const SAVORY_EXCLUDES = [
  'hawker', 'noodle', 'rice', 'chicken', 'pork', 'beef', 'fish', 'seafood',
  'dim sum', 'zi char', 'indian', 'thai', 'japanese', 'korean', 'chinese',
  'western', 'ramen', 'sushi', 'restaurant', 'kitchen', 'grill', 'bbq',
  'steamboat', 'hotpot', 'claypot', 'curry', 'biryani', 'prata', 'nasi',
  'mee', 'laksa', 'satay', 'steak', 'burger', 'pizza', 'pasta', 'bar & grill',
  'eating house', 'food court', 'kopitiam', 'canteen', 'bistro'
];

// Known dessert chains that should always be tagged
const KNOWN_DESSERT_BRANDS = [
  'starbucks', 'coffee bean', 'toast box', 'ya kun', 'killiney',
  'gong cha', 'koi', 'liho', 'each a cup', 'playmade', 'chicha san chen',
  'mrs fields', 'famous amos', 'cedele', 'tiong bahru bakery', 'plain vanilla',
  'birds of paradise', 'kind kones', 'hvala', 'matchaya', 'hundred acre',
  'common man', 'atlas coffeehouse', 'apartment coffee', 'nylon coffee',
  'dutch colony', 'luckin coffee', 'flash coffee', 'kenangan coffee',
  'blue bottle', 'bacha coffee', 'twg tea', 'arteastiq', 'ps.cafe', 'ps cafe'
];

// Supper detection - hours patterns indicating late night
function isSupperHours(hours) {
  if (!hours) return false;

  const hoursStr = typeof hours === 'string' ? hours.toLowerCase() : JSON.stringify(hours).toLowerCase();

  // Check for 24 hours
  if (hoursStr.includes('24 hours') || hoursStr.includes('open 24')) return true;

  // Check for late closing times (after midnight)
  const latePatterns = [
    '12am', '12:00 am', '12:00am',
    '1am', '1:00 am', '1:00am', '01:00',
    '2am', '2:00 am', '2:00am', '02:00',
    '3am', '3:00 am', '3:00am', '03:00',
    '4am', '4:00 am', '4:00am', '04:00',
    '5am', '5:00 am', '5:00am', '05:00',
    '6am', '6:00 am', '6:00am', '06:00',
    'to 1am', 'to 2am', 'to 3am', 'to 4am', 'to 5am', 'to 6am',
    'till 1am', 'till 2am', 'till 3am', 'till 4am',
    'until 1am', 'until 2am', 'until 3am',
    'midnight'
  ];

  return latePatterns.some(p => hoursStr.includes(p));
}

function shouldBeDessert(name, tags) {
  const nameLower = name.toLowerCase();

  // Check known dessert brands first
  if (KNOWN_DESSERT_BRANDS.some(b => nameLower.includes(b))) {
    return true;
  }

  // Check if name matches dessert patterns
  const hasDessertPattern = DESSERT_PATTERNS.some(p => nameLower.includes(p));
  if (!hasDessertPattern) return false;

  // Exclude if primarily savory
  const isSavory = SAVORY_EXCLUDES.some(p => nameLower.includes(p));
  if (isSavory) return false;

  // Check tags for additional context
  if (tags && Array.isArray(tags)) {
    const tagsLower = tags.map(t => t.toLowerCase());
    // If has savory tags, exclude
    if (tagsLower.some(t => ['chinese', 'indian', 'japanese', 'korean', 'thai', 'vietnamese', 'seafood', 'western'].includes(t))) {
      // But allow if also has dessert-related tag
      if (!tagsLower.some(t => ['cafe', 'coffee', 'dessert', 'bakery', 'ice cream'].includes(t))) {
        return false;
      }
    }
  }

  return true;
}

function shouldBeSupper(listing) {
  // Check is_24h flag
  if (listing.is_24h) return true;

  // Check opening hours
  if (isSupperHours(listing.opening_hours)) return true;

  // Check name for 24h indicators
  const nameLower = listing.name.toLowerCase();
  if (nameLower.includes('24') || nameLower.includes('24h') || nameLower.includes('24hrs')) {
    return true;
  }

  return false;
}

async function updateTags() {
  console.log('='.repeat(60));
  console.log('UPDATING DESSERT & SUPPER TAGS');
  console.log('='.repeat(60));

  // Fetch all active listings
  let allListings = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('food_listings')
      .select('id, name, tags, opening_hours, is_24h')
      .eq('is_active', true)
      .range(offset, offset + 999);
    if (error) { console.error('Error:', error); break; }
    if (!data || data.length === 0) break;
    allListings = allListings.concat(data);
    offset += 1000;
    if (data.length < 1000) break;
  }

  console.log(`\nTotal active listings: ${allListings.length}\n`);

  let dessertAdded = 0;
  let supperAdded = 0;
  let is24hFixed = 0;

  for (const listing of allListings) {
    const currentTags = listing.tags || [];
    const hasDessert = currentTags.includes('Dessert');
    const hasSupper = currentTags.includes('Supper');

    let newTags = [...currentTags];
    let needsUpdate = false;
    let updateData = {};

    // Check if should have Dessert tag
    if (!hasDessert && shouldBeDessert(listing.name, currentTags)) {
      newTags.push('Dessert');
      needsUpdate = true;
      dessertAdded++;
      console.log(`[DESSERT] ${listing.name}`);
    }

    // Check if should have Supper tag
    if (!hasSupper && shouldBeSupper(listing)) {
      newTags.push('Supper');
      needsUpdate = true;
      supperAdded++;
      console.log(`[SUPPER] ${listing.name}`);
    }

    // Fix is_24h flag if needed
    if (!listing.is_24h && isSupperHours(listing.opening_hours)) {
      const hoursStr = typeof listing.opening_hours === 'string'
        ? listing.opening_hours.toLowerCase()
        : JSON.stringify(listing.opening_hours).toLowerCase();

      if (hoursStr.includes('24 hours') || hoursStr.includes('open 24')) {
        updateData.is_24h = true;
        needsUpdate = true;
        is24hFixed++;
      }
    }

    if (needsUpdate) {
      updateData.tags = newTags;
      const { error } = await supabase
        .from('food_listings')
        .update(updateData)
        .eq('id', listing.id);

      if (error) {
        console.error(`  Error updating ${listing.name}:`, error.message);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Dessert tags added: ${dessertAdded}`);
  console.log(`Supper tags added: ${supperAdded}`);
  console.log(`is_24h flags fixed: ${is24hFixed}`);
  console.log(`\nTotal listings modified: ${dessertAdded + supperAdded}`);
}

updateTags().catch(console.error);
