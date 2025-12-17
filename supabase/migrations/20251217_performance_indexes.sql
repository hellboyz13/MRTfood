-- Performance optimization indexes for 5000+ users
-- Add indexes on frequently queried columns

-- Food listings indexes
CREATE INDEX IF NOT EXISTS idx_food_listings_station_id ON food_listings(station_id);
CREATE INDEX IF NOT EXISTS idx_food_listings_name ON food_listings(name);
CREATE INDEX IF NOT EXISTS idx_food_listings_tags ON food_listings USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_food_listings_rating ON food_listings(rating DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_food_listings_active ON food_listings(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_food_listings_station_active ON food_listings(station_id, is_active) WHERE is_active = true;

-- Mall outlets indexes
CREATE INDEX IF NOT EXISTS idx_mall_outlets_mall_id ON mall_outlets(mall_id);
CREATE INDEX IF NOT EXISTS idx_mall_outlets_name ON mall_outlets(name);

-- Malls indexes
CREATE INDEX IF NOT EXISTS idx_malls_station_id ON malls(station_id);
CREATE INDEX IF NOT EXISTS idx_malls_name ON malls(name);

-- Stations indexes (for search)
CREATE INDEX IF NOT EXISTS idx_stations_name ON stations(name);

-- Listing sources indexes (for joins)
CREATE INDEX IF NOT EXISTS idx_listing_sources_listing_id ON listing_sources(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_sources_source_id ON listing_sources(source_id);

-- Comments for documentation
COMMENT ON INDEX idx_food_listings_station_id IS 'Speeds up queries filtering by station';
COMMENT ON INDEX idx_food_listings_name IS 'Speeds up name searches';
COMMENT ON INDEX idx_food_listings_tags IS 'Speeds up tag-based filtering (24h, desserts, etc)';
COMMENT ON INDEX idx_food_listings_rating IS 'Speeds up sorting by rating';
COMMENT ON INDEX idx_food_listings_station_active IS 'Composite index for station + active queries';
