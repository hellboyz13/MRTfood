const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function check() {
  // Get all listings
  const { data: listings } = await supabase
    .from('food_listings')
    .select('id, name, source_id, station_id')
    .order('name');

  // Get all prices
  const { data: prices } = await supabase
    .from('listing_prices')
    .select('listing_id');

  const listingsWithPrices = new Set(prices.map(p => p.listing_id));

  // Find listings without prices
  const noPrices = listings.filter(l => !listingsWithPrices.has(l.id));

  // Find listings without sources
  const noSource = listings.filter(l => !l.source_id);

  console.log('=== LISTINGS WITHOUT PRICES (' + noPrices.length + ') ===\n');
  noPrices.forEach(l => {
    console.log(l.name + ' | ' + l.station_id + ' | source: ' + (l.source_id || 'none'));
  });

  console.log('\n=== LISTINGS WITHOUT SOURCE (' + noSource.length + ') ===\n');
  noSource.forEach(l => {
    console.log(l.name + ' | ' + l.station_id);
  });
}

check().catch(console.error);
