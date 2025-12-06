# Chain Outlets Import Script

This script fetches chain restaurant locations from Google Places API and populates the database.

## Setup

1. **Get Google Places API Key**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Enable the Places API
   - Create an API key

2. **Add API Key to .env.local**
   ```bash
   GOOGLE_PLACES_API_KEY=your_api_key_here
   ```

3. **Run Database Migration**
   Execute the SQL migration first:
   ```sql
   -- Run this in your Supabase SQL editor
   -- File: database_migrations/add_chain_restaurants.sql
   ```

## Usage

```bash
# Install dependencies if needed
npm install ts-node

# Run the import script
npx ts-node scripts/import-chain-outlets.ts
```

## What It Does

1. Fetches all MRT station coordinates from the database
2. For each chain brand (31 brands total):
   - Searches Google Places API for outlets in Singapore
   - Calculates nearest MRT station using Haversine formula
   - Calculates walking distance and time (80m/min)
   - Inserts/updates outlet data in `chain_outlets` table

## Chain Brands Imported

### Fast Food (5 brands)
- McDonald's
- KFC
- Subway
- Jollibee
- Burger King

### Chinese (5 brands)
- Din Tai Fung
- Tim Ho Wan
- Crystal Jade
- Putien
- Xiang Xiang Hunan Cuisine

### Hotpot (4 brands)
- Haidilao
- Beauty in the Pot
- Suki-Ya
- Seoul Garden

### Bubble Tea (7 brands)
- KOI
- LiHO
- Gong Cha
- Tiger Sugar
- Chicha San Chen
- The Alley
- Each A Cup

### Local (5 brands)
- Ya Kun Kaya Toast
- Toast Box
- Old Chang Kee
- Mr Bean
- 4Fingers

### Japanese (4 brands)
- Pepper Lunch
- Genki Sushi
- Sushi Express
- Ajisen Ramen

## Notes

- The script includes rate limiting (200ms delay between brands)
- Duplicates are handled via `google_place_id` unique constraint
- Walking time assumes 80 meters per minute
- Only outlets with valid GPS coordinates are imported
