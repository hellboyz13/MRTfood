-- Add DanielFoodDiary listings to the database
-- Run this in Supabase SQL Editor

-- Insert food_listings (let Supabase auto-generate UUIDs)
-- Then link them to DanielFoodDiary source

-- Insert listings and capture their IDs
WITH inserted_listings AS (
  INSERT INTO food_listings (name, lat, lng, station_id, distance_to_station, walking_time, is_active, tags, created_at, updated_at)
  VALUES
    ('Fernweh', 1.2833, 103.8454, 'chinatown', 210, 3, true, ARRAY['Cafe', 'Coffee'], NOW(), NOW()),
    ('Maxi Coffee Bar', 1.2820, 103.8461, 'chinatown', 371, 5, true, ARRAY['Cafe', 'Coffee'], NOW(), NOW()),
    ('Fortuna Terrazza', 1.2778, 103.8428, 'tanjong-pagar', 347, 4, true, ARRAY['Cafe', 'Italian'], NOW(), NOW()),
    ('Tiong Bahru Bakery', 1.2844, 103.8339, 'tiong-bahru', 817, 10, true, ARRAY['Cafe', 'Bakery', 'Coffee'], NOW(), NOW()),
    ('EarlyAfter', 1.2924, 103.8408, 'fort-canning', 399, 5, true, ARRAY['Cafe', 'Coffee'], NOW(), NOW()),
    ('SuiTok Dessert', 1.3011, 103.8358, 'somerset', 331, 4, true, ARRAY['Dessert', 'Cafe'], NOW(), NOW()),
    ('Sync Haus Café', 1.2814, 103.8204, 'redhill', 991, 12, true, ARRAY['Cafe', 'Coffee'], NOW(), NOW()),
    ('Coexist Coffee Co.', 1.2761, 103.7932, 'pasir-panjang', 162, 2, true, ARRAY['Cafe', 'Coffee'], NOW(), NOW()),
    ('Old Hen Coffee', 1.2935, 103.7737, 'kent-ridge', 1214, 15, true, ARRAY['Cafe', 'Coffee'], NOW(), NOW()),
    ('Monarchs & Milkweed', 1.3604, 103.9898, 'changi-airport', 363, 5, true, ARRAY['Cafe', 'Coffee'], NOW(), NOW()),
    ('Café Carrera', 1.3604, 103.9898, 'changi-airport', 363, 5, true, ARRAY['Cafe', 'Coffee'], NOW(), NOW()),
    ('Ernie''s Coffee', 1.2975, 103.8022, 'queenstown', 558, 7, true, ARRAY['Cafe', 'Coffee'], NOW(), NOW())
  RETURNING id
)
-- Link all inserted listings to DanielFoodDiary source
INSERT INTO listing_sources (listing_id, source_id, is_primary, created_at)
SELECT id, 'danielfooddiary', true, NOW()
FROM inserted_listings;

-- Verify the inserts
SELECT fl.id, fl.name, fl.station_id, fl.distance_to_station, fl.walking_time, fs.name as source_name
FROM food_listings fl
JOIN listing_sources ls ON fl.id = ls.listing_id
JOIN food_sources fs ON ls.source_id = fs.id
WHERE fs.id = 'danielfooddiary'
ORDER BY fl.name;
