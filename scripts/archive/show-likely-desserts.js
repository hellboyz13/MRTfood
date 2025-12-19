const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Keywords that suggest it might be a dessert place
const DESSERT_HINTS = [
  // Ice cream / gelato
  'cream', 'gelato', 'sorbet', 'creamery', 'palette',
  // Cafes that might be dessert-focused
  'cafe', 'café', 'coffee',
  // Sweet stuff
  'cake', 'pie', 'waffle', 'pancake', 'donut', 'doughnut',
  'cookie', 'brownie', 'tart', 'pastry', 'croissant',
  // Drinks
  'tea', 'matcha', 'boba', 'bubble',
  // Brands/specific words
  'hvala', 'apiary', 'plain vanilla', 'windowsill', 'tolido',
  'levain', 'fluff', 'whisk', 'kones', 'pies', 'sourbombe',
  'acai', 'açaí', 'smoothie', 'juice',
  // Local
  'durian', 'chendol', 'cendol', 'tau huay', 'beancurd',
  // Other
  'dessert', 'sweet', 'sugar', 'honey', 'chocolate', 'cocoa',
  'burnt', 'roast' // for coffee roasters
];

async function showLikelyDesserts() {
  // Get all listings WITHOUT Dessert tag
  const { data: listings } = await supabase
    .from('food_listings')
    .select('name, tags')
    .order('name');

  const { data: outlets } = await supabase
    .from('mall_outlets')
    .select('name, tags')
    .order('name');

  // Filter to places that don't have Dessert tag but might be dessert places
  const combined = [...(listings || []), ...(outlets || [])];

  const likelyDesserts = combined.filter(item => {
    const tags = item.tags || [];
    if (tags.includes('Dessert')) return false;

    const nameLower = item.name.toLowerCase();
    return DESSERT_HINTS.some(hint => nameLower.includes(hint.toLowerCase()));
  });

  // Dedupe by name
  const uniqueNames = [...new Set(likelyDesserts.map(item => item.name))].sort();

  console.log('=== Likely Dessert Places WITHOUT Dessert tag (' + uniqueNames.length + ') ===');
  console.log('Tell me which ones to ADD back as Dessert:');
  console.log('');
  uniqueNames.forEach((name, i) => {
    console.log((i+1) + '. ' + name);
  });
}

showLikelyDesserts();
