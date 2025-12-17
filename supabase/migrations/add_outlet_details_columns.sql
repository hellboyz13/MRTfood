-- Add closing_time and tags columns to mall_outlets table

-- Add closing_time column (stores time like "22:00" or "24hr")
ALTER TABLE mall_outlets
ADD COLUMN IF NOT EXISTS closing_time TEXT;

-- Add tags column (array of strings like ['Supper', 'Dessert'])
ALTER TABLE mall_outlets
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Add google_place_id for reference
ALTER TABLE mall_outlets
ADD COLUMN IF NOT EXISTS google_place_id TEXT;

-- Create index on tags for faster filtering
CREATE INDEX IF NOT EXISTS idx_mall_outlets_tags ON mall_outlets USING GIN (tags);

-- Create index on closing_time for supper filtering
CREATE INDEX IF NOT EXISTS idx_mall_outlets_closing_time ON mall_outlets (closing_time);
