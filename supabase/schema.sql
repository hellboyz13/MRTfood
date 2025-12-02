-- MRT Food Finder Database Schema
-- Run this in your Supabase SQL Editor

-- ============================================
-- STATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS stations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  lines TEXT[] DEFAULT '{}',
  lat DECIMAL(10, 7),
  lng DECIMAL(10, 7),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FOOD SOURCES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS food_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🍽️',
  url TEXT,
  bg_color TEXT DEFAULT '#f3f4f6',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FOOD LISTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS food_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  station_id TEXT REFERENCES stations(id) ON DELETE SET NULL,
  image_url TEXT,
  rating DECIMAL(2, 1) CHECK (rating >= 0 AND rating <= 5),
  source_id TEXT REFERENCES food_sources(id) ON DELETE SET NULL,
  source_url TEXT,
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SPONSORED LISTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sponsored_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id TEXT REFERENCES stations(id) ON DELETE CASCADE,
  restaurant_name TEXT NOT NULL,
  restaurant_image TEXT,
  restaurant_rating DECIMAL(2, 1) CHECK (restaurant_rating >= 0 AND restaurant_rating <= 5),
  promotion TEXT,
  link TEXT,
  is_active BOOLEAN DEFAULT true,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_food_listings_station ON food_listings(station_id);
CREATE INDEX IF NOT EXISTS idx_food_listings_source ON food_listings(source_id);
CREATE INDEX IF NOT EXISTS idx_food_listings_active ON food_listings(is_active);
CREATE INDEX IF NOT EXISTS idx_sponsored_listings_station ON sponsored_listings(station_id);
CREATE INDEX IF NOT EXISTS idx_sponsored_listings_active ON sponsored_listings(is_active);
CREATE INDEX IF NOT EXISTS idx_sponsored_listings_dates ON sponsored_listings(start_date, end_date);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stations_updated_at
  BEFORE UPDATE ON stations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_food_listings_updated_at
  BEFORE UPDATE ON food_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sponsored_listings_updated_at
  BEFORE UPDATE ON sponsored_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsored_listings ENABLE ROW LEVEL SECURITY;

-- Public read access for all tables
CREATE POLICY "Public read access for stations" ON stations
  FOR SELECT USING (true);

CREATE POLICY "Public read access for food_sources" ON food_sources
  FOR SELECT USING (true);

CREATE POLICY "Public read access for food_listings" ON food_listings
  FOR SELECT USING (is_active = true);

CREATE POLICY "Public read access for sponsored_listings" ON sponsored_listings
  FOR SELECT USING (
    is_active = true
    AND (start_date IS NULL OR start_date <= CURRENT_DATE)
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  );

-- ============================================
-- SEED DATA: FOOD SOURCES
-- ============================================
INSERT INTO food_sources (id, name, icon, url, bg_color) VALUES
  ('seth-lui', 'Seth Lui', '🍜', 'https://sethlui.com', '#FEF3C7'),
  ('eatbook', 'Eatbook', '🍔', 'https://eatbook.sg', '#DBEAFE'),
  ('miss-tam-chiak', 'Miss Tam Chiak', '🥢', 'https://misstamchiak.com', '#FCE7F3'),
  ('ieatishootipost', 'ieatishootipost', '📸', 'https://ieatishootipost.sg', '#D1FAE5'),
  ('michelin', 'Michelin Guide', '⭐', 'https://guide.michelin.com/sg/en', '#FEE2E2'),
  ('zermatt-neo', 'Zermatt Neo', '🎬', 'https://youtube.com/@ZermattNeo', '#E0E7FF')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SEED DATA: STATIONS (Major ones)
-- ============================================
INSERT INTO stations (id, name, lines, lat, lng) VALUES
  ('newton', 'Newton', ARRAY['NSL', 'DTL'], 1.3138, 103.8380),
  ('orchard', 'Orchard', ARRAY['NSL', 'TEL'], 1.3043, 103.8322),
  ('chinatown', 'Chinatown', ARRAY['NEL', 'DTL'], 1.2845, 103.8440),
  ('bugis', 'Bugis', ARRAY['EWL', 'DTL'], 1.3010, 103.8560),
  ('tanjong-pagar', 'Tanjong Pagar', ARRAY['EWL'], 1.2765, 103.8455),
  ('dhoby-ghaut', 'Dhoby Ghaut', ARRAY['NSL', 'NEL', 'CCL'], 1.2987, 103.8456),
  ('city-hall', 'City Hall', ARRAY['NSL', 'EWL'], 1.2930, 103.8520),
  ('raffles-place', 'Raffles Place', ARRAY['NSL', 'EWL'], 1.2840, 103.8515),
  ('marina-bay', 'Marina Bay', ARRAY['NSL', 'CCL', 'TEL'], 1.2765, 103.8545),
  ('bayfront', 'Bayfront', ARRAY['CCL', 'DTL'], 1.2815, 103.8590),
  ('little-india', 'Little India', ARRAY['NEL', 'DTL'], 1.3067, 103.8494),
  ('bishan', 'Bishan', ARRAY['NSL', 'CCL'], 1.3510, 103.8485),
  ('serangoon', 'Serangoon', ARRAY['NEL', 'CCL'], 1.3500, 103.8740),
  ('paya-lebar', 'Paya Lebar', ARRAY['EWL', 'CCL'], 1.3175, 103.8930),
  ('jurong-east', 'Jurong East', ARRAY['NSL', 'EWL'], 1.3330, 103.7425),
  ('tampines', 'Tampines', ARRAY['EWL', 'DTL'], 1.3540, 103.9455),
  ('harbourfront', 'HarbourFront', ARRAY['NEL', 'CCL'], 1.2653, 103.8210),
  ('ang-mo-kio', 'Ang Mo Kio', ARRAY['NSL'], 1.3700, 103.8495),
  ('woodlands', 'Woodlands', ARRAY['NSL', 'TEL'], 1.4370, 103.7865),
  ('somerset', 'Somerset', ARRAY['NSL'], 1.3005, 103.8385),
  ('clementi', 'Clementi', ARRAY['EWL'], 1.3150, 103.7650),
  ('bedok', 'Bedok', ARRAY['EWL'], 1.3240, 103.9300),
  ('punggol', 'Punggol', ARRAY['NEL'], 1.4050, 103.9025),
  ('sengkang', 'Sengkang', ARRAY['NEL'], 1.3920, 103.8955)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SEED DATA: FOOD LISTINGS
-- ============================================
INSERT INTO food_listings (name, description, address, station_id, rating, source_id, source_url, tags) VALUES
  -- Newton
  ('Newton Food Centre', 'Iconic hawker centre famous for BBQ seafood, satay, and local delights. A must-visit for tourists and locals alike.', '500 Clemenceau Ave North, Singapore 229495', 'newton', 4.5, 'seth-lui', 'https://sethlui.com/newton-food-centre', ARRAY['Hawker', 'Seafood', 'Satay']),
  ('Hup Kee Fried Oyster Omelette', 'Crispy fried oyster omelette with fresh oysters and a perfect egg-to-starch ratio. Operating since 1970.', 'Newton Food Centre, Stall 55', 'newton', 4.3, 'ieatishootipost', 'https://ieatishootipost.sg/hup-kee', ARRAY['Oyster Omelette', 'Local']),
  ('Alliance Seafood', 'Fresh BBQ stingray, sambal prawns, and chilli crab at hawker prices. The sambal is made fresh daily.', 'Newton Food Centre, Stall 61', 'newton', 4.4, 'eatbook', 'https://eatbook.sg/alliance-seafood', ARRAY['Seafood', 'BBQ', 'Stingray']),
  ('Kwee Heng Satay', 'Juicy chicken and mutton satay grilled over charcoal with rich, chunky peanut sauce.', 'Newton Food Centre, Stall 32', 'newton', 4.2, 'zermatt-neo', 'https://youtube.com/watch?v=newton-satay', ARRAY['Satay', 'BBQ', 'Halal']),

  -- Chinatown
  ('Tian Tian Hainanese Chicken Rice', 'Anthony Bourdain-approved chicken rice with silky smooth chicken and fragrant rice. Worth the queue.', 'Maxwell Food Centre, Stall 10', 'chinatown', 4.7, 'michelin', 'https://guide.michelin.com/sg/en/tian-tian', ARRAY['Chicken Rice', 'Michelin', 'Hawker']),
  ('Hawker Chan Soya Sauce Chicken', 'The world''s cheapest Michelin-starred meal. Tender soya sauce chicken with char siu.', '78 Smith Street, Singapore 058972', 'chinatown', 4.5, 'michelin', 'https://guide.michelin.com/sg/en/hawker-chan', ARRAY['Chicken', 'Michelin Star', 'Soya Sauce']),
  ('Jin Ji Teochew Braised Duck', 'Tender braised duck and kway chap with rich herbal broth. A Teochew specialty since 1950s.', 'Chinatown Complex Food Centre, Stall 02-135', 'chinatown', 4.4, 'ieatishootipost', 'https://ieatishootipost.sg/jin-ji-duck', ARRAY['Braised Duck', 'Teochew', 'Kway Chap']),
  ('Ann Chin Popiah', 'Fresh handmade popiah with sweet turnip filling, crispy bits, and special sauce.', 'Chinatown Complex Food Centre, Stall 02-28', 'chinatown', 4.3, 'miss-tam-chiak', 'https://misstamchiak.com/ann-chin-popiah', ARRAY['Popiah', 'Traditional', 'Snack']),
  ('Old Amoy Chendol', 'Classic chendol with rich gula melaka, creamy coconut milk, and chewy green jelly.', 'Chinatown Complex Food Centre, Stall 02-109', 'chinatown', 4.3, 'eatbook', 'https://eatbook.sg/old-amoy-chendol', ARRAY['Dessert', 'Chendol', 'Traditional']),

  -- Orchard
  ('Din Tai Fung', 'World-famous xiao long bao with paper-thin skin and rich pork broth. Taiwanese excellence.', 'Paragon, 290 Orchard Road #B1-03', 'orchard', 4.6, 'michelin', 'https://guide.michelin.com/sg/en/din-tai-fung', ARRAY['Xiao Long Bao', 'Taiwanese', 'Michelin']),
  ('PS.Cafe at Palais Renaissance', 'Stylish cafe known for truffle fries, wagyu burgers, and decadent cakes in lush settings.', 'Palais Renaissance, 390 Orchard Road', 'orchard', 4.4, 'seth-lui', 'https://sethlui.com/ps-cafe-review', ARRAY['Cafe', 'Western', 'Brunch']),
  ('TWG Tea Salon', 'Premium tea salon with over 800 teas, elegant pastries, and exquisite high tea sets.', 'ION Orchard, 2 Orchard Turn #02-21', 'orchard', 4.5, 'miss-tam-chiak', 'https://misstamchiak.com/twg-tea', ARRAY['Tea', 'High Tea', 'Pastries']),
  ('Paradise Dynasty', 'Eight-colored xiao long bao in unique flavors like foie gras, truffle, and cheese.', 'ION Orchard, 2 Orchard Turn #04-12A', 'orchard', 4.3, 'eatbook', 'https://eatbook.sg/paradise-dynasty', ARRAY['Xiao Long Bao', 'Chinese', 'La Mian']),

  -- Bugis
  ('Hjh Maimunah', 'Award-winning nasi padang with tender beef rendang, ayam bakar, and sambal goreng.', '11 & 15 Jalan Pisang, Singapore 199078', 'bugis', 4.6, 'michelin', 'https://guide.michelin.com/sg/en/hjh-maimunah', ARRAY['Nasi Padang', 'Malay', 'Michelin Bib']),
  ('Beach Road Scissor Cut Curry Rice', 'Iconic curry rice with braised pork belly, ngoh hiang, and cabbage drowned in curry.', '229 Jalan Besar, Singapore 208905', 'bugis', 4.4, 'ieatishootipost', 'https://ieatishootipost.sg/scissor-cut-curry', ARRAY['Curry Rice', 'Local', 'Braised Pork']),
  ('Artichoke', 'Modern Middle Eastern cuisine with a Singaporean twist. Known for hummus and lamb dishes.', '161 Middle Road, Singapore 188977', 'bugis', 4.5, 'seth-lui', 'https://sethlui.com/artichoke-review', ARRAY['Middle Eastern', 'Modern', 'Dinner']),
  ('Ah Seng Durian', 'The go-to spot for premium Mao Shan Wang and D24 durians. Pure durian heaven.', '50 Sims Ave, Singapore 387427', 'bugis', 4.7, 'zermatt-neo', 'https://youtube.com/watch?v=ah-seng-durian', ARRAY['Durian', 'Fruits', 'MSW']),

  -- Tanjong Pagar
  ('Neon Pigeon', 'Japanese izakaya with modern twists. Famous for grilled meats and creative cocktails.', '1 Keong Saik Road, Singapore 089109', 'tanjong-pagar', 4.4, 'seth-lui', 'https://sethlui.com/neon-pigeon', ARRAY['Izakaya', 'Japanese', 'Cocktails']),
  ('Burnt Ends', 'One Michelin star. Modern Australian BBQ with spectacular wood-fired meats.', '20 Teck Lim Road, Singapore 088391', 'tanjong-pagar', 4.8, 'michelin', 'https://guide.michelin.com/sg/en/burnt-ends', ARRAY['BBQ', 'Michelin Star', 'Australian']),
  ('Ding Dong', 'Southeast Asian tapas with playful cocktails. Great for group dining and drinks.', '23 Ann Siang Road, Singapore 069703', 'tanjong-pagar', 4.3, 'eatbook', 'https://eatbook.sg/ding-dong', ARRAY['Southeast Asian', 'Tapas', 'Cocktails']),
  ('Tong Ah Eating House', 'Traditional coffee shop serving legendary kaya toast and soft-boiled eggs since 1939.', '35 Keong Saik Road, Singapore 089142', 'tanjong-pagar', 4.5, 'miss-tam-chiak', 'https://misstamchiak.com/tong-ah', ARRAY['Kaya Toast', 'Coffee', 'Breakfast']),
  ('Meta', 'One Michelin star Korean-French fusion restaurant by Chef Sun Kim.', '9 Keong Saik Road, Singapore 089117', 'tanjong-pagar', 4.7, 'michelin', 'https://guide.michelin.com/sg/en/meta', ARRAY['Korean-French', 'Michelin Star', 'Fine Dining']);

-- ============================================
-- SEED DATA: SPONSORED LISTINGS
-- ============================================
INSERT INTO sponsored_listings (station_id, restaurant_name, restaurant_image, restaurant_rating, promotion, link, is_active, start_date, end_date) VALUES
  ('newton', 'Wingstop', '/placeholder-food.jpg', 4.3, 'Buy 1 Get 1 Wings!', '#', true, '2024-01-01', '2025-12-31'),
  ('orchard', 'Din Tai Fung', '/placeholder-food.jpg', 4.6, 'Free Xiao Long Bao with $50 spend', '#', true, '2024-01-01', '2025-12-31'),
  ('chinatown', 'Ya Kun Kaya Toast', '/placeholder-food.jpg', 4.4, '20% off breakfast sets', '#', true, '2024-01-01', '2025-12-31');
