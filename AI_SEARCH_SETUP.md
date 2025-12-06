# 🤖 AI-Powered Food Search Setup Guide

## Overview

Your app now supports intelligent food search! Users can search by:
- **Dishes** (e.g., "pasta", "fried rice", "bubble tea")
- **Cuisine types** (e.g., "italian", "chinese", "japanese")
- **Food categories** (e.g., "noodles", "soup", "fried chicken")
- **Dietary preferences** (e.g., "halal", "vegetarian")

## How It Works

1. **AI Tag Generation**: OpenAI GPT-3.5 analyzes each restaurant brand and generates 10-15 relevant food tags
2. **Smart Search**: When users search, the app matches against restaurant names AND food tags
3. **Station Highlighting**: Stations with matching food light up on the map

---

## 📋 Setup Steps

### Step 1: Run Database Migration

Open **Supabase SQL Editor** and run:

```sql
-- Add food_tags column to chain_outlets
ALTER TABLE chain_outlets
ADD COLUMN IF NOT EXISTS food_tags TEXT[];

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_chain_outlets_food_tags
ON chain_outlets USING GIN (food_tags);
```

**Or** run the SQL file:
```
scripts/add-food-tags-column.sql
```

### Step 2: Generate AI Tags (Optional - costs OpenAI credits)

**⚠️ Note**: This will call OpenAI API ~30 times (one per brand). Estimated cost: **$0.05-0.10**

Run the tag generation script:

```bash
npx ts-node scripts/generate-food-tags.ts
```

This will:
- Fetch all 30 chain brands from database
- Generate 10-15 food tags per brand using GPT-3.5
- Update `chain_brands` and `chain_outlets` tables with tags
- Take ~1 minute to complete (1 second delay between requests)

**Example output:**
```
[1/30] Processing: McDonald's (fast-food)
  Generated 15 tags: burger, fries, fast food, american, chicken nuggets, ...
  ✅ Updated brand and outlets

[2/30] Processing: KFC (fast-food)
  Generated 14 tags: fried chicken, chicken, fast food, american, burgers, ...
  ✅ Updated brand and outlets
```

---

## 🔧 Configuration

### Environment Variables

Already configured in `.env.local`:
```bash
OPENAI_API_KEY=sk-proj-IWA225giKOp8bC8tH7BgK1cm9YY...
```

### API Costs

- Model: **GPT-3.5 Turbo**
- Cost per request: ~$0.002
- Total for 30 brands: **~$0.06**
- One-time operation (tags are saved to database)

---

## 🎨 User Experience

### Search Examples

Users can now search for:
- `"bubble tea"` → Shows all stations with bubble tea shops
- `"italian"` → Shows stations with Italian restaurants
- `"fried chicken"` → Shows KFC, 4Fingers, Jollibee locations
- `"noodles"` → Shows ramen, pasta, laksa spots
- `"halal"` → Shows halal-certified chains

### UI Updates

- Updated search placeholder: **"Search: pasta, bubble tea, fried chicken..."**
- Search now highlights stations with matching food
- Works alongside existing name-based search

---

## 📊 Generated Tag Examples

**McDonald's**:
```json
["burger", "fries", "fast food", "american", "chicken nuggets",
 "breakfast", "mcmuffin", "big mac", "mcflurry", "milkshake"]
```

**Din Tai Fung**:
```json
["xiaolongbao", "dumplings", "chinese", "taiwanese", "dim sum",
 "soup dumplings", "noodles", "fried rice", "pork buns"]
```

**Chicha San Chen**:
```json
["bubble tea", "boba", "milk tea", "taiwanese", "tea", "drinks",
 "pearl milk tea", "fruit tea", "cheese tea", "dessert"]
```

---

## 🚀 Advanced: Manual Tag Editing

You can manually edit tags in Supabase:

```sql
-- Update tags for a specific brand
UPDATE chain_brands
SET food_tags = ARRAY['pizza', 'italian', 'pasta', 'western', 'delivery']
WHERE id = 'pizza-hut';

-- Update affects all outlets for that brand automatically
```

---

## 🔍 How Search Works Now

### Before (Name-only search):
- Search "pizza" → Only finds "Pizza Hut" in name
- Misses: Italian restaurants, pasta places

### After (AI tag search):
- Search "pizza" → Finds:
  - ✅ Pizza Hut (name match)
  - ✅ Restaurants tagged with "pizza"
  - ✅ Restaurants tagged with "italian"
  - ✅ Any outlet serving pizza dishes

---

## 📝 Troubleshooting

### Tags not appearing in search?

1. Check if tags exist:
```sql
SELECT name, food_tags FROM chain_brands WHERE food_tags IS NOT NULL;
```

2. Verify outlets have tags:
```sql
SELECT name, food_tags FROM chain_outlets LIMIT 10;
```

3. Re-run tag generation:
```bash
npx ts-node scripts/generate-food-tags.ts
```

### OpenAI API errors?

- Check API key is valid
- Verify you have credits in OpenAI account
- Check rate limits (script has 1-second delays built in)

---

## ✅ Testing

After setup, test these searches:
1. `"bubble tea"` → Should highlight Punggol, Sengkang (KOI, Gong Cha, etc.)
2. `"fried chicken"` → Should show KFC, 4Fingers locations
3. `"chinese"` → Should show Din Tai Fung, Crystal Jade, etc.
4. `"japanese"` → Should show Pepper Lunch, Genki Sushi, etc.

---

## 🎉 You're Done!

Your app now has intelligent food search powered by AI!

Users can search naturally by what they want to eat, not just restaurant names.
