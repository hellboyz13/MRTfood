const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'sb_secret_J_vsb7RYUQ_0Dm2YTR_Fuw_O-ovCRlN'
);

async function main() {
  const { data: withPrices } = await supabase.from('listing_prices').select('listing_id');
  const listingsWithPrices = new Set(withPrices.map(p => p.listing_id));

  const { data: allListings } = await supabase.from('food_listings').select('id, name, tags').order('name');
  const withoutPrices = allListings.filter(l => !listingsWithPrices.has(l.id));

  console.log(withoutPrices.length + ' listings without prices:\n');
  withoutPrices.forEach((l, i) => {
    console.log((i+1) + '. ' + l.name + ' (ID: ' + l.id + ')');
    console.log('   Tags:', l.tags?.join(', ') || 'N/A');
  });
}
main();
