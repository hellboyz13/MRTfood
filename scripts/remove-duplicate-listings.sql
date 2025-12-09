-- Remove duplicate DanielFoodDiary listings
-- Run this in Supabase SQL Editor

-- First, let's see the duplicates
SELECT name, COUNT(*) as count
FROM food_listings
WHERE name IN (
  'Fernweh', 'Maxi Coffee Bar', 'Fortuna Terrazza', 'Tiong Bahru Bakery',
  'EarlyAfter', 'SuiTok Dessert', 'Sync Haus Café', 'Coexist Coffee Co.',
  'Old Hen Coffee', 'Monarchs & Milkweed', 'Café Carrera', 'Ernie''s Coffee'
)
GROUP BY name
HAVING COUNT(*) > 1;

-- Delete duplicates, keeping only the oldest entry (first created)
-- Step 1: Delete the listing_sources for duplicates first (due to foreign key)
DELETE FROM listing_sources
WHERE listing_id IN (
  SELECT id FROM food_listings f1
  WHERE f1.name IN (
    'Fernweh', 'Maxi Coffee Bar', 'Fortuna Terrazza', 'Tiong Bahru Bakery',
    'EarlyAfter', 'SuiTok Dessert', 'Sync Haus Café', 'Coexist Coffee Co.',
    'Old Hen Coffee', 'Monarchs & Milkweed', 'Café Carrera', 'Ernie''s Coffee'
  )
  AND f1.created_at > (
    SELECT MIN(f2.created_at)
    FROM food_listings f2
    WHERE f2.name = f1.name
  )
);

-- Step 2: Delete the duplicate food_listings
DELETE FROM food_listings
WHERE id IN (
  SELECT id FROM food_listings f1
  WHERE f1.name IN (
    'Fernweh', 'Maxi Coffee Bar', 'Fortuna Terrazza', 'Tiong Bahru Bakery',
    'EarlyAfter', 'SuiTok Dessert', 'Sync Haus Café', 'Coexist Coffee Co.',
    'Old Hen Coffee', 'Monarchs & Milkweed', 'Café Carrera', 'Ernie''s Coffee'
  )
  AND f1.created_at > (
    SELECT MIN(f2.created_at)
    FROM food_listings f2
    WHERE f2.name = f1.name
  )
);

-- Verify no more duplicates
SELECT name, COUNT(*) as count
FROM food_listings
WHERE name IN (
  'Fernweh', 'Maxi Coffee Bar', 'Fortuna Terrazza', 'Tiong Bahru Bakery',
  'EarlyAfter', 'SuiTok Dessert', 'Sync Haus Café', 'Coexist Coffee Co.',
  'Old Hen Coffee', 'Monarchs & Milkweed', 'Café Carrera', 'Ernie''s Coffee'
)
GROUP BY name;
