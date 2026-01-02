const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'sb_secret_J_vsb7RYUQ_0Dm2YTR_Fuw_O-ovCRlN'
);

async function getLowRatedRestaurants() {
  const { data, error } = await supabase
    .from('food_listings')
    .select('id, name, rating, source_url, source_id')
    .lt('rating', 3.5)
    .order('rating', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(JSON.stringify(data, null, 2));
}

getLowRatedRestaurants();
