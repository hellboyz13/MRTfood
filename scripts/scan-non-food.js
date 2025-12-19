const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
config({ path: '.env.local', override: true });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function scanNonFood() {
  console.log('=== SCANNING FOR NON-FOOD OUTLETS ===\n');

  // Fetch ALL outlets in batches
  let all = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('mall_outlets')
      .select('id, name, mall_id')
      .range(offset, offset + 999);
    if (error) { console.error('Error:', error); break; }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    offset += 1000;
    if (data.length < 1000) break;
  }

  console.log('Total outlets scanned:', all.length);

  // Suspicious keywords that might indicate non-food
  const suspiciousPatterns = [
    'mart', 'store', 'studio', 'gallery', 'services', 'centre', 'center',
    'shop', 'boutique', 'express', 'outlet', 'depot', 'warehouse',
    'world', 'hub', 'zone', 'point', 'corner', 'station', 'club'
  ];

  // Known food-related words to exclude
  const foodWords = [
    'coffee', 'cafe', 'tea', 'restaurant', 'kitchen', 'bakery', 'bread',
    'sushi', 'ramen', 'noodle', 'rice', 'food', 'eat', 'dine', 'dining',
    'grill', 'bbq', 'hotpot', 'steamboat', 'soup', 'salad', 'juice',
    'dessert', 'cake', 'ice cream', 'gelato', 'chocolate', 'cookie',
    'burger', 'pizza', 'pasta', 'chicken', 'fish', 'seafood', 'meat',
    'prata', 'mee', 'kway', 'pau', 'dim sum', 'dumpling', 'bao',
    'toast', 'sandwich', 'wrap', 'bowl', 'bar', 'pub', 'bistro',
    'canteen', 'hawker', 'kopitiam', 'foodcourt', 'food court',
    'leaves', 'bento', 'donburi', 'curry', 'spice', 'pepper', 'salt',
    'fruit', 'vegetable', 'vegan', 'vegetarian', 'organic',
    'wine', 'beer', 'liquor', 'spirits', 'cocktail'
  ];

  const suspicious = [];

  for (const o of all) {
    const n = o.name.toLowerCase();

    // Check if contains suspicious pattern
    let hasSuspicious = false;
    for (const pattern of suspiciousPatterns) {
      if (n.includes(pattern)) {
        hasSuspicious = true;
        break;
      }
    }

    if (!hasSuspicious) continue;

    // Check if it's clearly food-related
    let isFood = false;
    for (const food of foodWords) {
      if (n.includes(food)) {
        isFood = true;
        break;
      }
    }

    if (!isFood) {
      suspicious.push(o);
    }
  }

  console.log('\n=== SUSPICIOUS OUTLETS (may be non-food) ===\n');

  // Sort by name
  suspicious.sort((a, b) => a.name.localeCompare(b.name));

  for (const s of suspicious) {
    console.log(`${s.name} @ ${s.mall_id}`);
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Total suspicious: ${suspicious.length}`);
  console.log('\nReview these manually and decide which to delete.');
}

scanNonFood().catch(console.error);
