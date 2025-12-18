const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Definite non-F&B store names - must be EXACT or very specific matches
const definitelyNotFood = [
  // Household/variety stores
  'japan home', 'daiso', 'miniso', 'mr diy', 'value dollar', 'abc bargain', 'dollar store',
  // Pharmacies
  'guardian', 'watsons', 'unity pharmacy', 'manning', 'caring pharmacy',
  // Electronics
  'best denki', 'challenger', 'harvey norman', 'gain city', 'audio house',
  // Bookstores (standalone, not cafes)
  'popular bookstore', 'times bookstore', 'kinokuniya', 'mph bookstore',
  // Telcos
  'singtel shop', 'starhub shop', 'm1 shop', 'circles life',
  // Financial
  'money changer', 'remittance', 'goldbell',
  // Optical
  'owndays', 'better vision', 'nanyang optical', 'spectacle hut',
  // Fitness (standalone gyms)
  'fitness first', 'anytime fitness', 'true fitness', 'activesg gym',
  // Toys
  'toys r us', 'hamleys', 'kiddy palace',
  // Pet stores (not pet cafes)
  'pet safari', 'pet lovers centre', 'pets station',
  // Fashion brands
  'uniqlo', 'h&m', 'zara', 'cotton on', 'charles & keith', 'pedro', 'bata',
  // Jewellery
  'lovisa', 'swarovski', 'pandora', 'poh heng', 'sk jewellery',
  // Beauty stores (not beauty cafes/restaurants)
  'sasa', 'innisfree', 'the face shop', 'etude house', 'nature republic',
  // Services
  'dental clinic', 'medical clinic', 'polyclinic',
  'kumon', 'mind champs', 'heguru', 'shichida',
];

// These look like non-food but ARE food - skip these
const actuallyFood = [
  'beauty in the pot', 'beauty pot',
  'curry times',
  'kopitiam', 'food court', 'food republic', 'koufu', 'banquet',
  'bookstore cafe', 'cafe at', 'books cafe',
  'arcade', 'alchemist',
  'big appetite',
  'oyster bank',
  'twg tea', 'tea salon',
  'souper', 'soup',
  'bar', 'pub', 'tavern', 'bistro', 'grill',
  'toast', 'times cafe',
  'singpost centre', // the mall itself
  'laundry', // Club Street Laundry is a restaurant
  'eatery', 'restaurant', 'cafe', 'kitchen', 'diner',
  'pet', // could be part of restaurant name like "Petit"
  'courts', // Kopitiam Foodcourts
];

async function scanAllOutlets() {
  console.log('=== SCANNING ALL MALL_OUTLETS FOR NON-F&B ===\n');

  let allOutlets = [];
  let page = 0;
  const pageSize = 1000;

  // Fetch all outlets with pagination
  while (true) {
    const { data, error } = await supabase
      .from('mall_outlets')
      .select('id, name, mall_id, category')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.log('Error fetching page', page, ':', error.message);
      break;
    }

    if (!data || data.length === 0) break;

    allOutlets = allOutlets.concat(data);
    console.log('Fetched page', page + 1, '- Total so far:', allOutlets.length);
    page++;
  }

  console.log('\nTotal outlets fetched:', allOutlets.length);

  // Scan for non-food
  const nonFoodOutlets = [];

  for (const outlet of allOutlets) {
    const nameLower = outlet.name.toLowerCase();

    // Skip if it's actually food
    let isActuallyFood = false;
    for (const foodName of actuallyFood) {
      if (nameLower.includes(foodName)) {
        isActuallyFood = true;
        break;
      }
    }
    if (isActuallyFood) continue;

    // Check if definitely not food
    for (const nonFood of definitelyNotFood) {
      if (nameLower.includes(nonFood.toLowerCase())) {
        nonFoodOutlets.push({ ...outlet, matchedKeyword: nonFood });
        break;
      }
    }
  }

  console.log('\n=== NON-F&B OUTLETS FOUND ===');
  console.log('Count:', nonFoodOutlets.length);

  if (nonFoodOutlets.length > 0) {
    console.log('\nList:');
    for (const o of nonFoodOutlets) {
      console.log(`  - "${o.name}" at ${o.mall_id} (matched: ${o.matchedKeyword})`);
    }

    // Only delete after manual review - uncomment to delete
    // console.log('\n--- Deleting non-F&B outlets ---');
    // for (const o of nonFoodOutlets) {
    //   const { error } = await supabase
    //     .from('mall_outlets')
    //     .delete()
    //     .eq('id', o.id);
    //   if (error) {
    //     console.log(`  Error deleting ${o.name}: ${error.message}`);
    //   } else {
    //     console.log(`  Deleted: ${o.name}`);
    //   }
    // }

    console.log('\nReview the list above. Run delete manually if confirmed non-F&B.');
  } else {
    console.log('\n✓ All outlets appear to be F&B!');
  }
}

scanAllOutlets();
