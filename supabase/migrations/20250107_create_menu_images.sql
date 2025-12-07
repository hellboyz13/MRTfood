-- Create menu_images table to store fetched photos from Google Places
CREATE TABLE IF NOT EXISTS menu_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES food_listings(id) ON DELETE CASCADE,
  outlet_id TEXT REFERENCES chain_outlets(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  photo_reference TEXT,
  width INTEGER,
  height INTEGER,
  is_header BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: must reference either listing_id OR outlet_id, but not both
  CONSTRAINT menu_image_reference CHECK (
    (listing_id IS NOT NULL AND outlet_id IS NULL) OR
    (listing_id IS NULL AND outlet_id IS NOT NULL)
  )
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_menu_images_listing_id ON menu_images(listing_id);
CREATE INDEX IF NOT EXISTS idx_menu_images_outlet_id ON menu_images(outlet_id);
CREATE INDEX IF NOT EXISTS idx_menu_images_display_order ON menu_images(display_order);

-- Add RLS policies
ALTER TABLE menu_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Menu images are viewable by everyone"
  ON menu_images FOR SELECT
  USING (true);

CREATE POLICY "Menu images are insertable by authenticated users"
  ON menu_images FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Menu images are updatable by authenticated users"
  ON menu_images FOR UPDATE
  USING (true);
