-- Add opening_hours column to mall_outlets table
ALTER TABLE mall_outlets
ADD COLUMN IF NOT EXISTS opening_hours JSONB;

-- Add comment to explain the column structure
COMMENT ON COLUMN mall_outlets.opening_hours IS 'Opening hours data from Google Places API in format: { "open_now": boolean, "periods": [...], "weekday_text": [...] }';
