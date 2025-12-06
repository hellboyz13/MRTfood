# Quick Setup Instructions

## Step 1: Add Supabase Credentials to .env.local

Open `.env.local` and add your Supabase credentials (you can find these in your Supabase dashboard under Project Settings > API):

```bash
# Google Places API (already added)
GOOGLE_PLACES_API_KEY=AIzaSyB2nTAy0K17gdWwlwJ2CYs4kbO0SUxYJvs

# Supabase credentials (ADD THESE)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 2: Run Database Migration

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Open the SQL Editor
3. Copy the entire contents of `database_migrations/add_chain_restaurants.sql`
4. Paste and run it

## Step 3: Import Chain Data

```bash
npx ts-node scripts/import-chain-outlets.ts
```

This will take 5-10 minutes to import all chain outlets.

## Step 4: Build and Deploy

```bash
npm run build
git add .
git commit -m "Add chain restaurants feature"
git push
```

Done! The feature will be live on Vercel.
