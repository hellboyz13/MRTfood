-- Fix search_vector for all mall_outlets
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/bkzfrgrxfnqounyeqvvn/sql/new
--
-- This fixes the 1,868 outlets that have search_vector = 'test'
-- (caused by improper update attempt)

-- Step 1: Fix all outlets with 'test' search_vector
UPDATE mall_outlets
SET search_vector = to_tsvector('english',
  coalesce(name, '') || ' ' ||
  coalesce(category, '')
)
WHERE search_vector::text = '''test''';

-- Step 2: Fix any NULL search_vectors (in case there are any)
UPDATE mall_outlets
SET search_vector = to_tsvector('english',
  coalesce(name, '') || ' ' ||
  coalesce(category, '')
)
WHERE search_vector IS NULL;

-- Step 3: Verify the fix
SELECT
  COUNT(*) as total_outlets,
  SUM(CASE WHEN search_vector IS NOT NULL AND search_vector::text != '''test''' THEN 1 ELSE 0 END) as proper_vectors,
  SUM(CASE WHEN search_vector::text = '''test''' THEN 1 ELSE 0 END) as test_vectors,
  SUM(CASE WHEN search_vector IS NULL THEN 1 ELSE 0 END) as null_vectors
FROM mall_outlets;
