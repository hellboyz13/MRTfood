-- Fix search_vector for all food_listings that have NULL search_vector
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql/new
--
-- This populates search_vector for listings imported without it

-- Update all listings with NULL search_vector
UPDATE food_listings
SET search_vector = to_tsvector('english',
  coalesce(name, '') || ' ' ||
  coalesce(array_to_string(tags, ' '), '')
)
WHERE search_vector IS NULL;

-- Verify the fix
SELECT
  COUNT(*) as total_listings,
  SUM(CASE WHEN search_vector IS NOT NULL THEN 1 ELSE 0 END) as with_vector,
  SUM(CASE WHEN search_vector IS NULL THEN 1 ELSE 0 END) as without_vector
FROM food_listings;
