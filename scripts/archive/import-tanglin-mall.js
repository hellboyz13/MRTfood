const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Tanglin Mall restaurants scraped from tanglinmall.com.sg/dine/
const tanglinRestaurants = [
  // Page 1
  { name: "Anjalichocolat", unit: "#02-153", level: "02", category: "Desserts", websiteCategory: "Confectionery, Deli & Specialty Food" },
  { name: "Araya Shouten", unit: "#B1-115", level: "B1", category: "Japanese", websiteCategory: "Confectionery, Deli & Specialty Food" },
  { name: "B For Bagel", unit: "#B1-125", level: "B1", category: "Cafe", websiteCategory: "Bistros, Cafes & Casual Dining" },
  { name: "Boost Juice Bars", unit: "#B1-114", level: "B1", category: "Drinks", websiteCategory: "Takeaways & Food Court" },
  { name: "Caffe Beviamo", unit: "#02-127", level: "02", category: "Cafe", websiteCategory: "Bistros, Cafes & Casual Dining" },
  { name: "Cedele Bakery", unit: "#B1-130", level: "B1", category: "Bakery", websiteCategory: "Confectionery, Deli & Specialty Food" },
  { name: "Greybox Coffee", unit: "#02-152", level: "02", category: "Cafe", websiteCategory: "Bistros, Cafes & Casual Dining" },
  { name: "House of Anli / La Veranda", unit: "#03-128", level: "03", category: "Western", websiteCategory: "Bistros, Cafes & Casual Dining" },
  { name: "Kaffe & Toast", unit: "#B1-127", level: "B1", category: "Cafe", websiteCategory: "Bistros, Cafes & Casual Dining" },
  { name: "Kebabs Faktory", unit: "#B1-120", level: "B1", category: "Middle Eastern", websiteCategory: "Confectionery, Deli & Specialty Food" },
  { name: "Kei Kaisendon", unit: "#B1-119", level: "B1", category: "Japanese", websiteCategory: "Bistros, Cafes & Casual Dining" },
  { name: "Konjiki Hototogisu Ramen", unit: "#01-110", level: "01", category: "Japanese", websiteCategory: "Restaurants" },

  // Page 2
  { name: "Lily's Modern Vietnamese", unit: "#01-132", level: "01", category: "Vietnamese", websiteCategory: "Restaurants" },
  { name: "Little Farms", unit: "#02-136", level: "02", category: "Cafe", websiteCategory: "Confectionery, Deli & Specialty Food" },
  { name: "Nando's", unit: "#01-115", level: "01", category: "Western", websiteCategory: "Bistros, Cafes & Casual Dining" },
  { name: "Nick Vina Artisan Bakery", unit: "#B1-113", level: "B1", category: "Bakery", websiteCategory: "Confectionery, Deli & Specialty Food" },
  { name: "Pano Kato", unit: "#02-142", level: "02", category: "Western", websiteCategory: "Restaurants" },
  { name: "Paul", unit: "#01-118", level: "01", category: "Bakery", websiteCategory: "Bistros, Cafes & Casual Dining" },
  { name: "Poke Theory", unit: "#02-126", level: "02", category: "Hawaiian", websiteCategory: "Bistros, Cafes & Casual Dining" },
  { name: "Sarai", unit: "#03-121", level: "03", category: "Thai", websiteCategory: "Restaurants" },
  { name: "Scoop Wholefoods Australia", unit: "#02-133", level: "02", category: "Health Food", websiteCategory: "Confectionery, Deli & Specialty Food" },
  { name: "Semolina", unit: "#B1-121", level: "B1", category: "Western", websiteCategory: "Bistros, Cafes & Casual Dining" },
  { name: "Seoul Noodle Shop", unit: "#B1-122", level: "B1", category: "Korean", websiteCategory: "Bistros, Cafes & Casual Dining" },
  { name: "SG Hawker", unit: "#B1-128", level: "B1", category: "Local", websiteCategory: "Bistros, Cafes & Casual Dining" },

  // Page 3
  { name: "Starbucks", unit: "#01-113", level: "01", category: "Cafe", websiteCategory: "Bistros, Cafes & Casual Dining" },
  { name: "Tanamera Coffee", unit: "#02-130", level: "02", category: "Cafe", websiteCategory: "Bistros, Cafes & Casual Dining" },
  { name: "Tanglin Cookhouse", unit: "#01-106", level: "01", category: "Western", websiteCategory: "Restaurants" },
  { name: "The Candy Store", unit: "#01-101", level: "01", category: "Desserts", websiteCategory: "Confectionery, Deli & Specialty Food" },
  { name: "Wine Connection Bistro", unit: "#01-103", level: "01", category: "Western", websiteCategory: "Bistros, Cafes & Casual Dining" },
  { name: "Yantra", unit: "#01-129", level: "01", category: "Indian", websiteCategory: "Restaurants" },
  { name: "Yuyu Suan Cai Yu", unit: "#B1-129", level: "B1", category: "Chinese", websiteCategory: "Restaurants" }
];

const MALL_ID = 'tanglin-mall';

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
  // Search for outlets with similar names that have thumbnails or opening hours
  const searchTerms = [
    name.toLowerCase(),
    name.toLowerCase().split(' ')[0], // First word
    name.toLowerCase().replace(/[''s]/g, '') // Without apostrophes
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
  console.log('=== TANGLIN MALL IMPORT TO mall_outlets ===\n');

  // First, delete existing outlets for this mall
  console.log('Step 1: Removing existing outlets for Tanglin Mall...');
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

  for (const restaurant of tanglinRestaurants) {
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
      console.log(`Error inserting ${restaurant.name}: ${insertError.message}`);
      failed++;
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

  console.log(`\nTotal outlets at Tanglin Mall: ${finalCount?.length || 0}`);
}

importToMallOutlets().catch(console.error);
