/**
 * Fix search_vector for food_listings
 * This needs to be run via Supabase SQL Editor since we can't execute raw SQL from JS client
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function main() {
  // Check current state
  const { count: nullCount } = await supabase
    .from('food_listings')
    .select('*', { count: 'exact', head: true })
    .is('search_vector', null);

  console.log('Listings with NULL search_vector:', nullCount);

  if (nullCount === 0) {
    console.log('All listings have search_vector populated!');
    return;
  }

  console.log('\nPlease run this SQL in Supabase SQL Editor:');
  console.log('https://supabase.com/dashboard/project/bkzfrgrxfnqounyeqvvn/sql/new');
  console.log('\n' + '='.repeat(60) + '\n');

  const sql = `
UPDATE food_listings
SET search_vector = to_tsvector('english',
  coalesce(name, '') || ' ' ||
  coalesce(array_to_string(tags, ' '), '')
)
WHERE search_vector IS NULL;

-- Verify the fix
SELECT
  COUNT(*) as total_listings,
  SUM(CASE WHEN search_vector IS NOT NULL THEN 1 ELSE 0 END) as with_vector,
  SUM(CASE WHEN search_vector IS NULL THEN 1 ELSE 0 END) as without_vector
FROM food_listings;
`;

  console.log(sql);
  console.log('\n' + '='.repeat(60));
}

main();
