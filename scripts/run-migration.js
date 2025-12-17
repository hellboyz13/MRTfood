const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  const sql = fs.readFileSync('supabase/migrations/20251217_add_opening_hours_to_outlets.sql', 'utf8');

  console.log('Running migration...');
  console.log(sql);

  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }

  console.log('Migration completed successfully!');
}

runMigration();
