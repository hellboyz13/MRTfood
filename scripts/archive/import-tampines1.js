const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Tampines 1 restaurants compiled from various sources (Eatbook, SetHLui, web search)
const tampines1Restaurants = [
  // From SetHLui with unit numbers
  { name: "Hawkers' Street", unit: "#05-05/06/07", level: "05", category: "Food Court" },
  { name: "Fieldnotes", unit: "#B1-K10", level: "B1", category: "Bakery" },
  { name: "Namu Bulgogi", unit: "#B1-K18", level: "B1", category: "Korean" },
  { name: "San.wich", unit: "#B1-K11", level: "B1", category: "Cafe" },
  { name: "Haruyama Udon", unit: "#B1-09", level: "B1", category: "Japanese" },
  { name: "Mister Donut", unit: "#B1-K6", level: "B1", category: "Bakery" },
  { name: "Jamba", unit: "#02-K1", level: "02", category: "Drinks" },
  { name: "Tiong Bahru Bakery", unit: "#01-19/20", level: "01", category: "Bakery" },
  { name: "rrooll", unit: "#B1-K4", level: "B1", category: "Bakery" },
  { name: "108 Matcha Saro", unit: "#02-K2", level: "02", category: "Desserts" },

  // From Eatbook
  { name: "S.O.S Chicken", unit: "#B1", level: "B1", category: "Fast Food" },
  { name: "Luckin Coffee", unit: "#02", level: "02", category: "Cafe" },
  { name: "Wanpo Tea Shop", unit: "#B1", level: "B1", category: "Drinks" },
  { name: "Aburi-EN", unit: "#B1", level: "B1", category: "Japanese" },
  { name: "Sushiro", unit: "#04", level: "04", category: "Japanese" },
  { name: "Tanyu", unit: "#04", level: "04", category: "Chinese" },

  // From web search and general knowledge
  { name: "Dian Xiao Er", unit: "#04", level: "04", category: "Chinese" },
  { name: "Gochi-So Shokudo", unit: "#03", level: "03", category: "Japanese" },
  { name: "iSteaks", unit: "#03", level: "03", category: "Western" },
  { name: "Malaysia Chiak", unit: "#B1", level: "B1", category: "Malaysian" },
  { name: "Shabu Sai", unit: "#04", level: "04", category: "Japanese" },
  { name: "Tuk Tuk Cha", unit: "#B1", level: "B1", category: "Thai" },
  { name: "Fish & Co.", unit: "#04", level: "04", category: "Western" },
  { name: "CHURN", unit: "#B1", level: "B1", category: "Desserts" },
  { name: "Mr. Coconut", unit: "#B1", level: "B1", category: "Drinks" },
  { name: "4Fingers Crispy Chicken", unit: "#03-16B", level: "03", category: "Fast Food" },
  { name: "Sushi Tei", unit: "#04-13", level: "04", category: "Japanese" },
  { name: "Kopitiam", unit: "#05", level: "05", category: "Food Court" },

  // From Hawkers' Street stalls
  { name: "Tai Wah Pork Noodle", unit: "#05 (Hawkers' Street)", level: "05", category: "Local" },
  { name: "Tiong Bahru Hainanese Boneless Chicken Rice", unit: "#05 (Hawkers' Street)", level: "05", category: "Local" },
  { name: "Koung's Wan Tan Mee", unit: "#05 (Hawkers' Street)", level: "05", category: "Local" },

  // Additional known outlets
  { name: "Popeyes", unit: "#03", level: "03", category: "Fast Food" },
  { name: "Delifrance", unit: "#02", level: "02", category: "Cafe" },
  { name: "Boost Juice Bars", unit: "#02", level: "02", category: "Drinks" },
  { name: "Hong Kong Egglet & Nam Kee Pau", unit: "#B1", level: "B1", category: "Local" },
  { name: "Pezzo", unit: "#B1", level: "B1", category: "Fast Food" },
  { name: "PlayMade", unit: "#B1", level: "B1", category: "Drinks" },
  { name: "Shine Korea", unit: "#04", level: "04", category: "Korean" },
  { name: "Starbucks", unit: "#01", level: "01", category: "Cafe" },
  { name: "McDonald's", unit: "#B1", level: "B1", category: "Fast Food" },
  { name: "KFC", unit: "#B1", level: "B1", category: "Fast Food" },
  { name: "Subway", unit: "#B1", level: "B1", category: "Fast Food" },
  { name: "Toast Box", unit: "#B1", level: "B1", category: "Cafe" },
  { name: "LiHO TEA", unit: "#B1", level: "B1", category: "Drinks" },
  { name: "Pepper Lunch", unit: "#04", level: "04", category: "Japanese" },
  { name: "Pizza Hut", unit: "#03", level: "03", category: "Western" },
  { name: "Genki Sushi", unit: "#04", level: "04", category: "Japanese" },
  { name: "The Soup Spoon", unit: "#03", level: "03", category: "Western" },
  { name: "Jollibean", unit: "#B1", level: "B1", category: "Local" },
  { name: "BreadTalk", unit: "#B1", level: "B1", category: "Bakery" },
  { name: "Old Chang Kee", unit: "#B1", level: "B1", category: "Local" },
  { name: "Crystal Jade Kitchen", unit: "#04", level: "04", category: "Chinese" },
  { name: "Bari Bari Steak", unit: "#03", level: "03", category: "Japanese" },
  { name: "Mamma Mia Trattoria E Caffe", unit: "#03", level: "03", category: "Italian" },
  { name: "Don Don Donki", unit: "#B2", level: "B2", category: "Japanese" },
  { name: "Cold Storage", unit: "#B2", level: "B2", category: "Supermarket" },
  { name: "Koi The", unit: "#B1", level: "B1", category: "Drinks" },
  { name: "Gong Cha", unit: "#B1", level: "B1", category: "Drinks" },
  { name: "Each A Cup", unit: "#B1", level: "B1", category: "Drinks" },
  { name: "Ya Kun Kaya Toast", unit: "#B1", level: "B1", category: "Cafe" },
  { name: "The Coffee Bean & Tea Leaf", unit: "#02", level: "02", category: "Cafe" },
  { name: "Ichiban Boshi", unit: "#04", level: "04", category: "Japanese" },
  { name: "Ajisen Ramen", unit: "#04", level: "04", category: "Japanese" },
  { name: "Lao Huo Tang", unit: "#04", level: "04", category: "Chinese" },
  { name: "Seoul Garden", unit: "#05", level: "05", category: "Korean" }
];

const MALL_ID = 'tampines-1';

// Generate slug from name
function generateSlug(name, mallId) {
  const slug = name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug}-${mallId}`;
}

// Normalize name for matching
function normalizeName(name) {
  return name.toLowerCase()
    .replace(/[''`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function findMatchingOutlet(name) {
  const searchTerms = [
    name.toLowerCase(),
    name.toLowerCase().split(' ')[0],
    name.toLowerCase().replace(/[''s]/g, '')
  ];

  const { data: outlets } = await supabase
    .from('mall_outlets')
    .select('name, thumbnail_url, opening_hours, category')
    .or('thumbnail_url.not.is.null,opening_hours.not.is.null');

  if (!outlets) return null;

  for (const term of searchTerms) {
    const match = outlets.find(o =>
      normalizeName(o.name).includes(term) ||
      term.includes(normalizeName(o.name).split(' ')[0])
    );
    if (match && (match.thumbnail_url || match.opening_hours)) {
      return match;
    }
  }

  return null;
}

async function importToMallOutlets() {
  console.log('=== TAMPINES 1 IMPORT TO mall_outlets ===\n');

  // First, delete existing outlets for this mall
  console.log('Step 1: Removing existing outlets for Tampines 1...');
  const { data: existing } = await supabase
    .from('mall_outlets')
    .select('id, name')
    .eq('mall_id', MALL_ID);

  if (existing && existing.length > 0) {
    console.log(`Found ${existing.length} existing outlets to remove`);

    const { error: deleteError } = await supabase
      .from('mall_outlets')
      .delete()
      .eq('mall_id', MALL_ID);

    if (deleteError) {
      console.log('Error deleting:', deleteError);
    } else {
      console.log(`Deleted ${existing.length} existing outlets`);
    }
  } else {
    console.log('No existing outlets found');
  }

  // Import new outlets
  console.log('\nStep 2: Importing new outlets...');
  let imported = 0;
  let withThumbnail = 0;
  let withHours = 0;
  let failed = 0;

  for (const restaurant of tampines1Restaurants) {
    const outletId = generateSlug(restaurant.name, MALL_ID);

    // Try to find matching thumbnail and hours from existing database
    const match = await findMatchingOutlet(restaurant.name);

    const outletData = {
      id: outletId,
      name: restaurant.name,
      mall_id: MALL_ID,
      level: restaurant.unit,
      category: restaurant.category,
      tags: [restaurant.category],
      thumbnail_url: match?.thumbnail_url || null,
      opening_hours: match?.opening_hours || null
    };

    const { error: insertError } = await supabase
      .from('mall_outlets')
      .insert(outletData);

    if (insertError) {
      // Check if duplicate key error
      if (insertError.code === '23505') {
        console.log(`Skipping (duplicate): ${restaurant.name}`);
      } else {
        console.log(`Error inserting ${restaurant.name}: ${insertError.message}`);
        failed++;
      }
      continue;
    }

    const thumbStatus = outletData.thumbnail_url ? '✓ thumb' : '✗ thumb';
    const hoursStatus = outletData.opening_hours ? '✓ hours' : '✗ hours';
    console.log(`Imported: ${restaurant.name} (${restaurant.category}) [${thumbStatus}] [${hoursStatus}]`);

    imported++;
    if (outletData.thumbnail_url) withThumbnail++;
    if (outletData.opening_hours) withHours++;
  }

  console.log(`\n=== IMPORT COMPLETE ===`);
  console.log(`Imported: ${imported}`);
  console.log(`With thumbnail: ${withThumbnail}`);
  console.log(`With opening hours: ${withHours}`);
  console.log(`Failed: ${failed}`);

  // Get final count
  const { data: finalCount } = await supabase
    .from('mall_outlets')
    .select('id')
    .eq('mall_id', MALL_ID);

  console.log(`\nTotal outlets at Tampines 1: ${finalCount?.length || 0}`);
}

importToMallOutlets().catch(console.error);
