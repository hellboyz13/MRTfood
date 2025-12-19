const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// The Cathay F&B outlets scraped from https://thecathay.com.sg/directory/?f_category=33
const theCathayOutlets = [
  {
    name: "Commendatori",
    unit: "#04-03",
    level: "04",
    category: "Italian",
    thumbnail_url: "https://thecathay.com.sg/wp-content/uploads/2025/08/Commendatori-Featured-Image-Listing-Blocks-1.png"
  },
  {
    name: "Lam Heung Ling Smashing Lemon Tea",
    unit: "#01-03",
    level: "01",
    category: "Drinks",
    thumbnail_url: "https://thecathay.com.sg/wp-content/uploads/2025/05/Untitled-design-2025-05-26T152843.743.jpg"
  },
  {
    name: "One Pot",
    unit: "#02-10",
    level: "02",
    category: "Chinese",
    thumbnail_url: "https://thecathay.com.sg/wp-content/uploads/2025/03/01-267-X-432.jpg"
  },
  {
    name: "Fore Coffee",
    unit: "#01-14",
    level: "01",
    category: "Cafe",
    thumbnail_url: "https://thecathay.com.sg/wp-content/uploads/2025/03/05.jpg"
  },
  {
    name: "Yoshinoya",
    unit: "#B1-08",
    level: "B1",
    category: "Japanese",
    thumbnail_url: "https://thecathay.com.sg/wp-content/uploads/2025/02/Yoshinoya-2.jpg"
  },
  {
    name: "Yakiniku Like",
    unit: "#01-02",
    level: "01",
    category: "Japanese",
    thumbnail_url: "https://thecathay.com.sg/wp-content/uploads/2025/02/Yakiniku-Like-2.jpg"
  },
  {
    name: "Ya Kun Kaya Toast",
    unit: "#B1-13",
    level: "B1",
    category: "Cafe",
    thumbnail_url: "https://thecathay.com.sg/wp-content/uploads/2025/02/Ya-Kun-2.jpg"
  },
  {
    name: "Wingstop",
    unit: "#B1-07",
    level: "B1",
    category: "Western",
    thumbnail_url: "https://thecathay.com.sg/wp-content/uploads/2025/02/Wingstop-2.jpg"
  },
  {
    name: "Tsui Wah",
    unit: "#01-04",
    level: "01",
    category: "Chinese",
    thumbnail_url: "https://thecathay.com.sg/wp-content/uploads/2025/02/Tsui-Wah-Singapore-2.jpg"
  },
  {
    name: "Starbucks",
    unit: "#01-01",
    level: "01",
    category: "Cafe",
    thumbnail_url: "https://thecathay.com.sg/wp-content/uploads/2025/02/Starbucks-2.jpg"
  },
  {
    name: "Saizeriya",
    unit: "#B1-11",
    level: "B1",
    category: "Western",
    thumbnail_url: "https://thecathay.com.sg/wp-content/uploads/2025/02/Saizeriya-2.jpg"
  },
  {
    name: "Saboten Express",
    unit: "#01-05",
    level: "01",
    category: "Japanese",
    thumbnail_url: "https://thecathay.com.sg/wp-content/uploads/2025/02/Saboten-Express-2.jpg"
  },
  {
    name: "Kebuke",
    unit: "#01-15",
    level: "01",
    category: "Drinks",
    thumbnail_url: "https://thecathay.com.sg/wp-content/uploads/2025/02/Directory-listing-blocks.jpg"
  },
  {
    name: "Food Avenue",
    unit: "#B1-09/10/14",
    level: "B1",
    category: "Food Court",
    thumbnail_url: "https://thecathay.com.sg/wp-content/uploads/2025/02/Food-Avenue-2.jpg"
  }
];

const MALL_ID = 'the-cathay';

// Generate slug from name
function generateSlug(name, mallId) {
  const slug = name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug}-${mallId}`;
}

async function importTheCathay() {
  console.log('=== THE CATHAY IMPORT TO mall_outlets ===\n');

  // First, delete existing outlets for this mall
  console.log('Step 1: Removing existing outlets for The Cathay...');
  const { data: existing, error: selectError } = await supabase
    .from('mall_outlets')
    .select('id, name')
    .eq('mall_id', MALL_ID);

  if (selectError) {
    console.log('Error selecting:', selectError);
  } else if (existing && existing.length > 0) {
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
  let failed = 0;

  for (const outlet of theCathayOutlets) {
    const outletId = generateSlug(outlet.name, MALL_ID);

    const { error: insertError } = await supabase
      .from('mall_outlets')
      .insert({
        id: outletId,
        name: outlet.name,
        mall_id: MALL_ID,
        level: outlet.unit,
        category: outlet.category,
        tags: [outlet.category],
        thumbnail_url: outlet.thumbnail_url
      });

    if (insertError) {
      console.log(`Error inserting ${outlet.name}: ${insertError.message}`);
      failed++;
      continue;
    }

    console.log(`Imported: ${outlet.name} (${outlet.category}) - ${outlet.unit}`);
    imported++;
  }

  console.log(`\n=== IMPORT COMPLETE ===`);
  console.log(`Imported: ${imported}`);
  console.log(`Failed: ${failed}`);

  // Get final count
  const { data: finalCount } = await supabase
    .from('mall_outlets')
    .select('id')
    .eq('mall_id', MALL_ID);

  console.log(`\nTotal outlets at The Cathay: ${finalCount?.length || 0}`);
}

importTheCathay().catch(console.error);
