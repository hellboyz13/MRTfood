// Script to find restaurants without pricing
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
  // Get all active listings
  const { data: listings } = await supabase
    .from('food_listings')
    .select('id, name')
    .eq('is_active', true);

  // Get all listing IDs that have prices
  const { data: prices } = await supabase
    .from('listing_prices')
    .select('listing_id')
    .eq('item_name', 'Price Range');

  const pricedIds = new Set((prices || []).map(p => p.listing_id));

  const noPricing = (listings || []).filter(l => !pricedIds.has(l.id));

  console.log('Restaurants without pricing (' + noPricing.length + ' total):\n');
  noPricing.forEach(l => console.log('- ' + l.name));
}

main().catch(console.error);
