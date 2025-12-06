-- Chain Restaurants Schema
-- This stores popular chain restaurant outlets across Singapore

-- Table for chain brands
CREATE TABLE IF NOT EXISTS chain_brands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'fast-food', 'chinese', 'hotpot', 'bubble-tea', 'local', 'japanese'
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for chain outlets
CREATE TABLE IF NOT EXISTS chain_outlets (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL REFERENCES chain_brands(id),
  name TEXT NOT NULL,
  address TEXT,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  nearest_station_id TEXT, -- MRT station ID
  distance_to_station INTEGER, -- meters
  walk_time INTEGER, -- minutes
  google_place_id TEXT UNIQUE,
  phone TEXT,
  opening_hours JSONB,
  rating DECIMAL(2, 1),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (nearest_station_id) REFERENCES stations(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chain_outlets_brand ON chain_outlets(brand_id);
CREATE INDEX IF NOT EXISTS idx_chain_outlets_station ON chain_outlets(nearest_station_id);
CREATE INDEX IF NOT EXISTS idx_chain_outlets_active ON chain_outlets(is_active);

-- Insert chain brands
INSERT INTO chain_brands (id, name, category) VALUES
  -- Fast Food
  ('mcdonalds', 'McDonald''s', 'fast-food'),
  ('kfc', 'KFC', 'fast-food'),
  ('subway', 'Subway', 'fast-food'),
  ('jollibee', 'Jollibee', 'fast-food'),
  ('burger-king', 'Burger King', 'fast-food'),

  -- Chinese
  ('din-tai-fung', 'Din Tai Fung', 'chinese'),
  ('tim-ho-wan', 'Tim Ho Wan', 'chinese'),
  ('crystal-jade', 'Crystal Jade', 'chinese'),
  ('putien', 'Putien', 'chinese'),
  ('xiang-xiang', 'Xiang Xiang Hunan Cuisine', 'chinese'),

  -- Hotpot
  ('haidilao', 'Haidilao', 'hotpot'),
  ('beauty-in-the-pot', 'Beauty in the Pot', 'hotpot'),
  ('suki-ya', 'Suki-Ya', 'hotpot'),
  ('seoul-garden', 'Seoul Garden', 'hotpot'),

  -- Bubble Tea
  ('koi', 'KOI', 'bubble-tea'),
  ('liho', 'LiHO', 'bubble-tea'),
  ('gong-cha', 'Gong Cha', 'bubble-tea'),
  ('tiger-sugar', 'Tiger Sugar', 'bubble-tea'),
  ('chicha-san-chen', 'Chicha San Chen', 'bubble-tea'),
  ('the-alley', 'The Alley', 'bubble-tea'),
  ('each-a-cup', 'Each A Cup', 'bubble-tea'),

  -- Local
  ('ya-kun', 'Ya Kun Kaya Toast', 'local'),
  ('toast-box', 'Toast Box', 'local'),
  ('old-chang-kee', 'Old Chang Kee', 'local'),
  ('mr-bean', 'Mr Bean', 'local'),
  ('4fingers', '4Fingers', 'local'),

  -- Japanese
  ('pepper-lunch', 'Pepper Lunch', 'japanese'),
  ('genki-sushi', 'Genki Sushi', 'japanese'),
  ('sushi-express', 'Sushi Express', 'japanese'),
  ('ajisen-ramen', 'Ajisen Ramen', 'japanese')
ON CONFLICT (id) DO NOTHING;
