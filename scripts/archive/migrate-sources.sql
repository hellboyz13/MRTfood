-- STEP 1: Create listing_sources junction table
CREATE TABLE IF NOT EXISTS listing_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES food_listings(id) ON DELETE CASCADE,
  source_id TEXT REFERENCES food_sources(id) ON DELETE CASCADE,
  source_url TEXT DEFAULT '',
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(listing_id, source_id)
);

-- STEP 2: Add weight column to food_sources
ALTER TABLE food_sources ADD COLUMN IF NOT EXISTS weight INTEGER DEFAULT 1;

-- STEP 3: Set weights for sources (higher = more trusted)
UPDATE food_sources SET weight = 100 WHERE id = 'michelin-3-star';
UPDATE food_sources SET weight = 90 WHERE id = 'michelin-2-star';
UPDATE food_sources SET weight = 80 WHERE id = 'michelin-1-star';
UPDATE food_sources SET weight = 70 WHERE id = 'michelin-hawker';
UPDATE food_sources SET weight = 50 WHERE id = 'editors-choice';

-- STEP 4: Migrate existing source relationships to junction table
INSERT INTO listing_sources (listing_id, source_id, source_url, is_primary)
SELECT id, source_id, COALESCE(source_url, ''), true
FROM food_listings
WHERE source_id IS NOT NULL
ON CONFLICT (listing_id, source_id) DO NOTHING;

-- STEP 5: Enable RLS on new table
ALTER TABLE listing_sources ENABLE ROW LEVEL SECURITY;

-- STEP 6: Create policy for public read access
CREATE POLICY "Allow public read access on listing_sources"
ON listing_sources FOR SELECT
TO public
USING (true);

-- Verify migration
SELECT COUNT(*) as migrated_count FROM listing_sources;
