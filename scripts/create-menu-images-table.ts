import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local file
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Use service role key for admin operations if available, otherwise anon key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createMenuImagesTable() {
  console.log('🔧 Creating menu_images table...\n');

  // Check if table exists by querying it
  const { error: checkError } = await supabase
    .from('menu_images')
    .select('id')
    .limit(1);

  if (!checkError || !checkError.message.includes('does not exist')) {
    console.log('✅ Table menu_images already exists!');
    return;
  }

  console.log('Creating new menu_images table...\n');
  console.log('⚠️  Please run the following SQL in Supabase SQL Editor:\n');
  console.log('--------------------------------------------------');
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
CREATE POLICY "Allow public read access" ON menu_images
  FOR SELECT USING (true);

-- Allow public insert (for the API to store images)
CREATE POLICY "Allow public insert" ON menu_images
  FOR INSERT WITH CHECK (true);
  `);
  console.log('--------------------------------------------------\n');
  console.log('📝 Copy and paste the SQL above into Supabase SQL Editor');
  console.log('   at: https://supabase.com/dashboard/project/bkzfrgrxfnqounyeqvvn/sql\n');
}

createMenuImagesTable();
