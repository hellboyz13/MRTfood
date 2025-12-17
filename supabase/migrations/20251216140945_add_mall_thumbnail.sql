-- Add thumbnail_url column to malls table
ALTER TABLE malls ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
