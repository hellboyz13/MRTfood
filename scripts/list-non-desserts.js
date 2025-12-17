const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function showPotentialDesserts() {
  // Get all listings WITHOUT Dessert tag
  const { data: listings } = await supabase
    .from('food_listings')
    .select('name, tags')
    .order('name');

  const { data: outlets } = await supabase
    .from('mall_outlets')
    .select('name, tags')
    .order('name');

  // Filter to show places that don't have Dessert tag
  const listingsNoDessert = listings.filter(l => !(l.tags || []).includes('Dessert'));
  const outletsNoDessert = outlets.filter(o => !(o.tags || []).includes('Dessert'));

  // Combine and dedupe by name
  const allNames = new Set();
  [...listingsNoDessert, ...outletsNoDessert].forEach(item => allNames.add(item.name));

  const sorted = [...allNames].sort();

  console.log('=== Places WITHOUT Dessert tag (' + sorted.length + ' total) ===');
  console.log('');
  sorted.forEach((name, i) => {
    console.log((i+1) + '. ' + name);
  });
}

showPotentialDesserts();
