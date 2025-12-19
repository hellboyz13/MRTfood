import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local file
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTable() {
  console.log('🔧 Creating menu_images table via SQL query...\n');

  // Try to create the table by making a direct insert with a UUID
  // This will force the table to be created if it doesn't exist

  console.log('⚠️  The menu_images table needs to be created in Supabase.\n');
  console.log('Please run the following SQL in the Supabase SQL Editor:');
  console.log('https://supabase.com/dashboard/project/bkzfrgrxfnqounyeqvvn/sql/new\n');
  console.log('=' .repeat(70));
  console.log(`
CREATE TABLE IF NOT EXISTS menu_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES food_listings(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES chain_outlets(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  photo_reference TEXT,
  width INTEGER,
  height INTEGER,
  is_header BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT menu_image_reference CHECK (
    (listing_id IS NOT NULL AND outlet_id IS NULL) OR
    (listing_id IS NULL AND outlet_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_menu_images_listing_id ON menu_images(listing_id);
CREATE INDEX IF NOT EXISTS idx_menu_images_outlet_id ON menu_images(outlet_id);
CREATE INDEX IF NOT EXISTS idx_menu_images_display_order ON menu_images(display_order);

-- Enable RLS
ALTER TABLE menu_images ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY IF NOT EXISTS "Allow public read access" ON menu_images
  FOR SELECT USING (true);

-- Allow public insert (for the API to store images)
CREATE POLICY IF NOT EXISTS "Allow public insert" ON menu_images
  FOR INSERT WITH CHECK (true);
  `);
  console.log('=' .repeat(70));
  console.log('\nAfter running the SQL, press Enter to continue...');
}

createTable();
