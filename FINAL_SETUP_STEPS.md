# Final Setup Steps for Popular Chains Feature

## Current Status
✅ Code implementation complete
✅ Database schema ready
✅ Import script created
✅ .env.local configured
⚠️ Need to enable correct Google API
⚠️ Need to run database migration

## Step 1: Enable Google Places API (New)

Your current API key is using the legacy API which is deprecated. You need to enable the new API:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services > Library**
4. Search for **"Places API (New)"**
5. Click on it and press **Enable**
6. **Important:** Also enable **"Places API"** (without "New") for compatibility

Your API key will then work with both legacy and new endpoints.

## Step 2: Run Database Migration

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/bkzfrgrxfnqounyeqvvn
2. Click on **SQL Editor** in the left sidebar
3. Click **"New query"**
4. Copy the entire contents from: `database_migrations/add_chain_restaurants.sql`
5. Paste it into the SQL editor
6. Click **Run** or press `Ctrl+Enter`

You should see: "Success. No rows returned"

This creates:
- `chain_brands` table (with 31 brands pre-inserted)
- `chain_outlets` table
- All necessary indexes

## Step 3: Run the Import Script

Once the API is enabled and database tables are created:

```bash
npx ts-node scripts/import-chain-outlets.ts
```

This will:
- Search Google Places for all 31 chain brands in Singapore
- Find nearest MRT station for each outlet
- Calculate walking distance and time
- Insert ~500-1000 chain outlets into your database

**Expected time:** 5-10 minutes (due to API rate limiting)

## Step 4: Test Locally

```bash
npm run dev
```

Visit http://localhost:3000, click any MRT station, and toggle between **⭐ Curated** and **🍜 Popular** modes!

## Step 5: Build and Deploy

```bash
npm run build
git add .
git commit -m "Complete popular chains feature setup"
git push
```

Vercel will automatically deploy the changes.

---

## Troubleshooting

### If import script fails with "REQUEST_DENIED"
- Make sure you enabled **Places API (New)** in Google Cloud Console
- Wait a few minutes after enabling for changes to propagate

### If import script fails with "relation does not exist"
- Run the database migration SQL in Supabase first (Step 2)

### If no data shows in Popular mode
- Check that the import script completed successfully
- Verify data exists: Run this in Supabase SQL Editor:
  ```sql
  SELECT COUNT(*) FROM chain_outlets;
  ```

---

## What's Been Done

✅ Created toggle UI component (⭐ Curated / 🍜 Popular)
✅ Built API endpoints to fetch chain outlets by station
✅ Created chain outlet card component with directions
✅ Implemented Haversine distance calculation
✅ Added TypeScript types for chain data
✅ Updated FoodPanelV2 to support both modes
✅ Created import script with Google Places integration
✅ Configured environment variables

All code is ready - just need to enable the API and populate the database!
