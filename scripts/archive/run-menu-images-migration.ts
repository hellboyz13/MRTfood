import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env.local file
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🔧 Running menu_images table migration...\n');

  const migrationSQL = fs.readFileSync(
    path.resolve(process.cwd(), 'supabase/migrations/20250107_create_menu_images.sql'),
    'utf8'
  );

  // Split by semicolons and run each statement
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    console.log('Executing:', statement.substring(0, 100) + '...\n');

    const { error } = await supabase.rpc('exec_sql', { sql: statement });

    if (error) {
      console.error('❌ Error:', error.message);

      // Check if table already exists
      if (error.message.includes('already exists')) {
        console.log('✅ Table already exists, skipping...\n');
      } else {
        throw error;
      }
    } else {
      console.log('✅ Success\n');
    }
  }

  console.log('✅ Migration completed successfully!');
}

runMigration();
