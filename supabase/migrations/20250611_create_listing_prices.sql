-- ============================================
-- LISTING PRICES TABLE
-- Stores menu items with prices for food listings
-- ============================================
CREATE TABLE IF NOT EXISTS listing_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES food_listings(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  price DECIMAL(8, 2) NOT NULL,
  description TEXT,
  is_signature BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_listing_prices_listing ON listing_prices(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_prices_signature ON listing_prices(is_signature) WHERE is_signature = true;

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE TRIGGER update_listing_prices_updated_at
  BEFORE UPDATE ON listing_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE listing_prices ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access for listing_prices" ON listing_prices
  FOR SELECT USING (true);