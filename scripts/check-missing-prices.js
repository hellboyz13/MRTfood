const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'sb_secret_J_vsb7RYUQ_0Dm2YTR_Fuw_O-ovCRlN'
);

async function getListingsWithoutPrices() {
  const { data: withPrices } = await supabase
    .from('listing_prices')
    .select('listing_id');

  const listingsWithPrices = new Set(withPrices?.map(p => p.listing_id) || []);

  const { data: allListings } = await supabase
    .from('food_listings')
    .select('id, name, address')
    .order('name');

  const withoutPrices = allListings.filter(l => !listingsWithPrices.has(l.id));

  console.log('5 Examples of listings without price data:\n');
  withoutPrices.slice(0, 5).forEach((l, i) => {
    console.log((i+1) + '. ' + l.name);
    console.log('   Address: ' + (l.address || 'N/A'));
    console.log('');
  });

  console.log('Total without prices:', withoutPrices.length);
}

getListingsWithoutPrices();
