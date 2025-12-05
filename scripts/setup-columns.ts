/**
 * Script to add columns to food_listings table using Supabase Management API
 */

const SUPABASE_PROJECT_REF = 'bkzfrgrxfnqounyeqvvn';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4';

async function runSQL(sql: string) {
  const url = `https://${SUPABASE_PROJECT_REF}.supabase.co/rest/v1/rpc/`;

  // Try using the query endpoint directly
  const response = await fetch(`https://${SUPABASE_PROJECT_REF}.supabase.co/rest/v1/`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ query: sql })
  });

  return response;
}

async function main() {
  console.log('='.repeat(50));
  console.log('SUPABASE COLUMN SETUP');
  console.log('='.repeat(50));
  console.log('');
  console.log('Please run the following SQL in your Supabase SQL Editor:');
  console.log('https://supabase.com/dashboard/project/bkzfrgrxfnqounyeqvvn/sql/new');
  console.log('');
  console.log('-'.repeat(50));
  console.log(`
ALTER TABLE food_listings
ADD COLUMN IF NOT EXISTS distance_to_station INTEGER;

ALTER TABLE food_listings
ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;

ALTER TABLE food_listings
ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
`);
  console.log('-'.repeat(50));
  console.log('');
  console.log('After running the SQL, run: npx tsx scripts/add-distances.ts');
  console.log('');
}

main();
