const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
config({ path: '.env.local', override: true });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function broadCheck() {
  console.log('=== BROAD NON-FOOD CHECK ===\n');

  let all = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('mall_outlets')
      .select('name, mall_id')
      .range(offset, offset + 999);
    if (error || !data || data.length === 0) break;
    all = all.concat(data);
    offset += 1000;
    if (data.length < 1000) break;
  }

  console.log('Total outlets:', all.length);

  // Expanded non-food keywords
  const nonFoodKeywords = [
    // Supermarkets & convenience
    'cheers', 'minimart', 'provision', 'grocery', 'supermarket',
    'fairprice', 'cold storage', 'giant hypermarket', 'sheng siong',
    '7-eleven', '7 eleven', 'don don donki', 'daiso',
    // Liquor stores
    'cellarbration', '1855 the bottle', 'bottle shop', 'wine cellar',
    // Health & beauty (non-food)
    'wellness', 'spa ', 'nail salon', 'hair salon', 'barber',
    'watsons', 'guardian', 'unity pharmacy',
    // Optical
    'optical', 'spectacle', 'owndays', 'better vision',
    // Entertainment (non-food)
    'golden village', 'cathay cinema', 'shaw theatre', 'cinema',
    'karaoke', 'ktv', 'timezone', 'arcade',
    // Services
    'pet shop', 'pet grooming', 'florist', 'tailor', 'dry clean', 'laundromat', 'laundry service',
    'money changer', 'money exchange', 'atm ',
    // Medical
    'clinic', 'pharmacy', 'dental', 'medical centre', 'hospital',
    // Fitness
    'gym ', 'fitness first', 'anytime fitness', 'yoga studio',
    // Retail
    'bookstore', 'book shop', 'popular bookstore',
    // Clubs (non-food)
    'private club', 'members club'
  ];

  const found = [];
  for (const o of all) {
    const n = o.name.toLowerCase();
    for (const k of nonFoodKeywords) {
      if (n.includes(k)) {
        found.push({ name: o.name, mall: o.mall_id, keyword: k });
        break;
      }
    }
  }

  if (found.length === 0) {
    console.log('\nNo non-food outlets found! All clear.');
  } else {
    console.log('\n=== NON-FOOD OUTLETS FOUND ===\n');
    for (const f of found) {
      console.log(`${f.name} @ ${f.mall} [${f.keyword}]`);
    }
    console.log(`\nTotal: ${found.length}`);
  }
}

broadCheck().catch(console.error);
