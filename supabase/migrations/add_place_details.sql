-- Add Google Places details columns to food_listings table
-- Run this in your Supabase SQL Editor

-- Add new columns for Google Places data
ALTER TABLE food_listings
ADD COLUMN IF NOT EXISTS google_place_id TEXT,
ADD COLUMN IF NOT EXISTS review_count INTEGER,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS opening_hours JSONB;

-- Create index for google_place_id lookups
CREATE INDEX IF NOT EXISTS idx_food_listings_google_place_id ON food_listings(google_place_id);

-- Comment on new columns
COMMENT ON COLUMN food_listings.google_place_id IS 'Google Places API place_id for this listing';
COMMENT ON COLUMN food_listings.review_count IS 'Total number of Google reviews';
COMMENT ON COLUMN food_listings.phone IS 'Phone number from Google Places';
COMMENT ON COLUMN food_listings.website IS 'Website URL from Google Places';
COMMENT ON COLUMN food_listings.opening_hours IS 'Opening hours JSON from Google Places (weekday_text, periods, etc.)';
