/**
 * Script to run the chain restaurants database migration
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Error: Supabase credentials not found in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runMigration() {
  console.log('Running database migration...\n');

  // Read the migration SQL file
  const migrationPath = path.join(__dirname, '..', 'database_migrations', 'add_chain_restaurants.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  // Split into individual statements (simple approach)
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Found ${statements.length} SQL statements to execute\n`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    console.log(`Executing statement ${i + 1}/${statements.length}...`);

    const { error } = await supabase.rpc('exec_sql', { sql_query: statement });

    if (error) {
      console.error(`Error on statement ${i + 1}:`, error.message);
      // Continue with other statements
    } else {
      console.log(`✓ Statement ${i + 1} completed`);
    }
  }

  console.log('\n✅ Migration complete!');
}

runMigration().catch(console.error);
