const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
config({ path: '.env.local', override: true });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Non-food keywords
const nonFoodKeywords = [
  'supermarket', 'fairprice', 'ntuc', 'cold storage', 'giant', 'sheng siong',
  'convenience', '7-eleven', '7 eleven', 'cheers',
  'watsons', 'guardian', 'pharmacy', 'clinic', 'dental', 'medical', 'hospital',
  'salon', 'hair', 'barber', 'beauty', 'nail', 'spa', 'massage',
  'gym', 'fitness', 'yoga',
  'bank', 'atm', 'money changer', 'money exchange',
  'singtel', 'starhub', 'm1 shop',
  'optical', 'spectacle', 'owndays',
  'pet shop', 'pet grooming',
  'laundry', 'dry clean',
  'tailor', 'alteration',
  'electronics', 'computer',
  'bookstore', 'book shop', 'popular bookstore',
  'clothing', 'fashion', 'apparel', 'footwear',
  'jewelry', 'jewellery',
  'toy shop', 'toys r us',
  'travel agency',
  'insurance', 'real estate',
  'tuition', 'enrichment', 'learning centre',
  'florist', 'flower shop',
  'furniture', 'home decor',
  'renovation', 'hardware',
  'minimart', 'mini mart', 'provision shop',
  'don don donki', 'donki', 'daiso',
  'uniqlo', 'cotton on', 'h&m', 'zara',
  'kiddy palace', 'mothercare',
  'cinema', 'golden village', 'cathay', 'shaw',
  'karaoke', 'ktv',
  'arcade', 'timezone'
];

async function findNonFood() {
  console.log('=== SEARCHING FOR NON-FOOD OUTLETS ===\n');

  let allOutlets = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('mall_outlets')
      .select('id, name, mall_id, category')
      .range(offset, offset + 999);
    if (error || !data || data.length === 0) break;
    allOutlets = allOutlets.concat(data);
    offset += 1000;
    if (data.length < 1000) break;
  }

  console.log('Total outlets scanned:', allOutlets.length);

  const flagged = [];
  for (const outlet of allOutlets) {
    const nameLower = outlet.name.toLowerCase();
    for (const keyword of nonFoodKeywords) {
      if (nameLower.includes(keyword)) {
        flagged.push({ ...outlet, keyword });
        break;
      }
    }
  }

  if (flagged.length === 0) {
    console.log('\nNo non-food outlets found!');
    return;
  }

  console.log('\n=== FLAGGED NON-FOOD OUTLETS ===\n');

  // Group by keyword
  const byKeyword = {};
  for (const f of flagged) {
    if (!byKeyword[f.keyword]) byKeyword[f.keyword] = [];
    byKeyword[f.keyword].push(f);
  }

  for (const [kw, items] of Object.entries(byKeyword).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`--- ${kw.toUpperCase()} (${items.length}) ---`);
    for (const item of items) {
      console.log(`  ${item.name} @ ${item.mall_id}`);
    }
    console.log('');
  }

  console.log('=== SUMMARY ===');
  console.log(`Total flagged: ${flagged.length}`);
  console.log('\nTo delete these outlets, review and run:');
  console.log('DELETE FROM mall_outlets WHERE id IN (...);');
}

findNonFood().catch(console.error);
