const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Use service role key to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4'
);

async function main() {
  console.log('Adding landmark column to food_listings table...');

  // Execute raw SQL to add the column
  const { error } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE food_listings ADD COLUMN IF NOT EXISTS landmark TEXT;'
  });

  if (error) {
    console.log('Note: Cannot add column via RPC. Please run this SQL in Supabase dashboard:');
    console.log('');
    console.log('ALTER TABLE food_listings ADD COLUMN IF NOT EXISTS landmark TEXT;');
    console.log('');
    console.log('Or the column may already exist. Checking...');

    // Try to select with landmark to see if it exists
    const { data, error: selectError } = await supabase
      .from('food_listings')
      .select('id, name, landmark')
      .limit(1);

    if (selectError) {
      console.log('Column does not exist yet. Please add it manually in Supabase dashboard.');
    } else {
      console.log('Column already exists!');
      console.log('Sample:', data);
    }
  } else {
    console.log('Column added successfully!');
  }
}

main();
