const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addColumn() {
  console.log('Adding opening_hours column to mall_outlets...');

  // Check if column already exists
  const { data: existing, error: checkError } = await supabase
    .from('mall_outlets')
    .select('opening_hours')
    .limit(1);

  if (checkError) {
    if (checkError.message.includes('opening_hours')) {
      console.log('Column does not exist yet, creating it...');

      // Use raw SQL query - Supabase PostgREST doesn't support ALTER TABLE
      // We'll need to add it manually via Supabase Dashboard or use a different approach

      console.log('\nPlease add the following column manually in Supabase Dashboard:');
      console.log('Table: mall_outlets');
      console.log('Column name: opening_hours');
      console.log('Type: jsonb');
      console.log('Nullable: true');
      console.log('\nOr run this SQL in the SQL Editor:');
      console.log('ALTER TABLE mall_outlets ADD COLUMN IF NOT EXISTS opening_hours JSONB;');

      process.exit(1);
    } else {
      console.error('Error checking column:', checkError);
      process.exit(1);
    }
  } else {
    console.log('✓ Column opening_hours already exists!');
  }
}

addColumn();
