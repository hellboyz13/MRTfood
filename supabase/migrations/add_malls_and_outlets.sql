-- Create malls table
CREATE TABLE IF NOT EXISTS malls (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  station_id TEXT NOT NULL REFERENCES stations(id),
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  google_place_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create mall_outlets table
CREATE TABLE IF NOT EXISTS mall_outlets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  mall_id TEXT NOT NULL REFERENCES malls(id) ON DELETE CASCADE,
  level TEXT,
  category TEXT,
  price_range TEXT,
  rating DOUBLE PRECISION,
  review_count INTEGER,
  google_place_id TEXT,
  chain_id TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create chains table for deduplication
CREATE TABLE IF NOT EXISTS chains (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_malls_station_id ON malls(station_id);
CREATE INDEX IF NOT EXISTS idx_malls_google_place_id ON malls(google_place_id);
CREATE INDEX IF NOT EXISTS idx_mall_outlets_mall_id ON mall_outlets(mall_id);
CREATE INDEX IF NOT EXISTS idx_mall_outlets_chain_id ON mall_outlets(chain_id);
CREATE INDEX IF NOT EXISTS idx_mall_outlets_google_place_id ON mall_outlets(google_place_id);

-- Add comments
COMMENT ON TABLE malls IS 'Shopping malls near MRT stations';
COMMENT ON TABLE mall_outlets IS 'Food outlets within malls';
COMMENT ON COLUMN malls.station_id IS 'Reference to the nearest MRT station';
COMMENT ON COLUMN mall_outlets.level IS 'Floor/unit number (e.g. #02-15)';
COMMENT ON COLUMN mall_outlets.price_range IS 'Price range (e.g. $, $$, $$$)';

-- Insert dummy data for Jurong East malls
INSERT INTO malls (id, name, station_id, address) VALUES
  ('jem', 'JEM', 'jurong-east', '50 Jurong Gateway Road, Singapore 608549'),
  ('westgate', 'Westgate', 'jurong-east', '3 Gateway Drive, Singapore 608532'),
  ('imm', 'IMM', 'jurong-east', '2 Jurong East Street 21, Singapore 609601')
ON CONFLICT (id) DO NOTHING;

-- Insert dummy outlets for JEM
INSERT INTO mall_outlets (id, name, mall_id, level, category, price_range, thumbnail_url) VALUES
  ('jem-wingstop', 'Wingstop', 'jem', '#B1-46', 'Western, Fast Food', '$$', NULL),
  ('jem-sushiro', 'Sushiro', 'jem', '#04-01', 'Japanese, Sushi', '$$', NULL),
  ('jem-shake-shack', 'Shake Shack', 'jem', '#01-15', 'Western, Burgers', '$$$', NULL),
  ('jem-itacho', 'Itacho Sushi', 'jem', '#B1-12', 'Japanese, Sushi', '$$', NULL),
  ('jem-bobs', 'Bob''s', 'jem', '#B1-28', 'Western, Burgers', '$$', NULL),
  ('jem-pastamania', 'PastaMania', 'jem', '#03-22', 'Italian, Pasta', '$$', NULL)
ON CONFLICT (id) DO NOTHING;

-- Insert dummy outlets for Westgate
INSERT INTO mall_outlets (id, name, mall_id, level, category, price_range, thumbnail_url) VALUES
  ('westgate-din-tai-fung', 'Din Tai Fung', 'westgate', '#04-01', 'Chinese, Dim Sum', '$$$', NULL),
  ('westgate-guzman', 'Guzman y Gomez', 'westgate', '#01-23', 'Mexican, Fast Food', '$$', NULL),
  ('westgate-koi', 'KOI Thé', 'westgate', '#B1-03', 'Beverages, Bubble Tea', '$', NULL),
  ('westgate-paradise', 'Paradise Dynasty', 'westgate', '#03-13', 'Chinese, Dim Sum', '$$$', NULL),
  ('westgate-nandos', 'Nando''s', 'westgate', '#03-22', 'Western, Chicken', '$$', NULL)
ON CONFLICT (id) DO NOTHING;

-- Insert dummy outlets for IMM
INSERT INTO mall_outlets (id, name, mall_id, level, category, price_range, thumbnail_url) VALUES
  ('imm-daiso', 'Daiso Food Court', 'imm', '#03-01', 'Japanese, Food Court', '$', NULL),
  ('imm-ikea', 'IKEA Restaurant', 'imm', '#04-01', 'Swedish, Cafe', '$', NULL),
  ('imm-koufu', 'Koufu Food Court', 'imm', '#03-36', 'Local, Food Court', '$', NULL),
  ('imm-mcdonalds', 'McDonald''s', 'imm', '#01-12', 'Western, Fast Food', '$', NULL),
  ('imm-subway', 'Subway', 'imm', '#02-08', 'Western, Fast Food', '$', NULL),
  ('imm-starbucks', 'Starbucks', 'imm', '#01-43', 'Beverages, Cafe', '$$', NULL)
ON CONFLICT (id) DO NOTHING;
