const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
config({ path: '.env.local', override: true });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function finalCheck() {
  console.log('=== FINAL NON-FOOD CHECK ===\n');

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

  // High-confidence non-food keywords
  const nonFoodKeywords = [
    'cheers', 'minimart', 'provision', 'grocery',
    'cellarbration', '1855 the bottle',
    'wellness centre', 'spa ', 'nail salon', 'hair salon', 'barber',
    'optical', 'spectacle', 'owndays',
    'golden village', 'cathay cinema', 'shaw theatre', 'karaoke', 'ktv',
    'timezone', 'arcade',
    'pet shop', 'pet grooming', 'florist', 'tailor', 'dry clean', 'laundromat',
    'money changer', 'money exchange', 'atm ',
    'clinic', 'pharmacy', 'dental', 'medical centre'
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

finalCheck().catch(console.error);
