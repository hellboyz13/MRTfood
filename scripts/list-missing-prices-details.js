const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'sb_secret_J_vsb7RYUQ_0Dm2YTR_Fuw_O-ovCRlN'
);

async function main() {
  const { data: withPrices, error: e1 } = await supabase
    .from('listing_prices')
    .select('listing_id');

  if (e1) {
    console.error('Error fetching prices:', e1);
    return;
  }

  const listingsWithPrices = new Set(withPrices?.map(p => p.listing_id) || []);

  const { data: allListings, error: e2 } = await supabase
    .from('food_listings')
    .select('id, name, tags, food_tags')
    .order('name');

  if (e2 || !allListings) {
    console.error('Error fetching listings:', e2);
    return;
  }

  const withoutPrices = allListings.filter(l => !listingsWithPrices.has(l.id));

  console.log(withoutPrices.length + ' Listings without prices:\n');
  withoutPrices.forEach((l, i) => {
    console.log((i+1) + '. ' + l.name);
    console.log('   Tags: ' + (l.tags?.join(', ') || 'N/A'));
    console.log('   Food Tags: ' + (l.food_tags?.join(', ') || 'N/A'));
    console.log('');
  });
}

main();
