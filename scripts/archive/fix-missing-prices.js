const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixMissingPrices() {
  // Get all listings
  const { data: listings } = await supabase
    .from('food_listings')
    .select('id, name, station_id')
    .order('name');

  // Get all prices with listing info
  const { data: prices } = await supabase
    .from('listing_prices')
    .select('listing_id, item_name, price, description, is_signature, sort_order');

  // Create map of listing_id to prices
  const priceMap = new Map();
  prices.forEach(p => {
    if (!priceMap.has(p.listing_id)) {
      priceMap.set(p.listing_id, []);
    }
    priceMap.get(p.listing_id).push(p);
  });

  // Find listings without prices
  const noPrices = listings.filter(l => !priceMap.has(l.id));

  // Find listings with prices (for reference)
  const withPrices = listings.filter(l => priceMap.has(l.id));

  console.log('Listings without prices: ' + noPrices.length);
  console.log('Listings with prices: ' + withPrices.length);
  console.log('\n=== AUTO-FIXING FROM DUPLICATES ===\n');

  let fixed = 0;
  let stillMissing = [];

  for (const listing of noPrices) {
    // Extract base name (remove location in parentheses)
    const baseName = listing.name.replace(/\s*\([^)]+\)\s*$/, '').trim().toLowerCase();

    // Find a matching restaurant with prices
    const match = withPrices.find(w => {
      const wBaseName = w.name.replace(/\s*\([^)]+\)\s*$/, '').trim().toLowerCase();
      return wBaseName === baseName ||
             w.name.toLowerCase().includes(baseName) ||
             baseName.includes(w.name.toLowerCase());
    });

    if (match && priceMap.has(match.id)) {
      // Copy prices from the matching listing
      const sourcePrices = priceMap.get(match.id);

      for (const sourcePrice of sourcePrices) {
        const { error } = await supabase
          .from('listing_prices')
          .insert({
            listing_id: listing.id,
            item_name: sourcePrice.item_name,
            price: sourcePrice.price,
            description: sourcePrice.description,
            is_signature: sourcePrice.is_signature,
            sort_order: sourcePrice.sort_order
          });

        if (error) {
          console.log('Error copying price for ' + listing.name + ': ' + error.message);
        }
      }

      console.log('Fixed: ' + listing.name + ' -> copied ' + sourcePrices.length + ' price(s) from ' + match.name);
      fixed++;
    } else {
      stillMissing.push(listing);
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log('Auto-fixed: ' + fixed);
  console.log('Still missing: ' + stillMissing.length);

  if (stillMissing.length > 0) {
    console.log('\n=== STILL MISSING PRICES ===\n');
    stillMissing.forEach(l => {
      console.log(l.name + ' | ' + l.station_id);
    });
  }
}

fixMissingPrices().catch(console.error);
