-- Add food_tags column to enable intelligent food search
-- This allows searching by dishes, cuisine types, and food categories

-- Add food_tags column to chain_outlets
ALTER TABLE chain_outlets
ADD COLUMN IF NOT EXISTS food_tags TEXT[];

-- Add food_tags column to food_listings (if exists)
ALTER TABLE IF EXISTS food_listings
ADD COLUMN IF NOT EXISTS food_tags TEXT[];

-- Create index for faster tag searches
CREATE INDEX IF NOT EXISTS idx_chain_outlets_food_tags
ON chain_outlets USING GIN (food_tags);

-- Example tags for testing:
-- UPDATE chain_outlets
-- SET food_tags = ARRAY['pizza', 'italian', 'pasta', 'western']
-- WHERE brand_id = 'pizza-hut';

COMMENT ON COLUMN chain_outlets.food_tags IS 'AI-generated food search tags for intelligent search (dishes, cuisine, categories)';
