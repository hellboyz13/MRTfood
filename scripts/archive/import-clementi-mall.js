const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// The Clementi Mall F&B outlets scraped from https://www.theclementimall.com/stores
// Base URL for images: https://www.theclementimall.com
const BASE_URL = 'https://www.theclementimall.com';

const clementiMallOutlets = [
  { name: "BreadTalk", unit: "#01-01", level: "01", category: "Bakery", image: "/media/1/store/BreadTalk/breadtalk.jpg" },
  { name: "Toast Box", unit: "#01-02", level: "01", category: "Cafe", image: "/media/1/store/Toast Box/toastbox.jpg" },
  { name: "KOI Thé", unit: "#01-04", level: "01", category: "Drinks", image: "/media/1/store/KOI/23-1.png" },
  { name: "McDonald's", unit: "#01-06/09", level: "01", category: "Fast Food", image: "/media/1/store/McDonalds (Halal Certified)/mcdonald.jpg" },
  { name: "Proofer Boulangerie", unit: "#01-11", level: "01", category: "Bakery", image: "/media/1/store/Proofer/Proofer logo - 600mm by 400mm.png" },
  { name: "7-Eleven", unit: "#01-03", level: "01", category: "Convenience", image: null },
  { name: "Bengawan Solo", unit: "#B1-26/27", level: "B1", category: "Bakery", image: "/media/1/store/bengawan solo/bengawansolo.jpg" },
  { name: "Bee Cheng Hiang", unit: "#B1-20", level: "B1", category: "Local", image: "/media/1/store/bee cheng hiang/bee_cheng_hiang.jpg" },
  { name: "EAT.", unit: "#B1-17/18", level: "B1", category: "Western", image: "/media/1/store/EAT./eat.jpg" },
  { name: "Four Leaves", unit: "#B1-15/16", level: "B1", category: "Bakery", image: "/media/1/store/Four Leaves/fourleaves.jpg" },
  { name: "Châteraisé", unit: "#B1-03/04", level: "B1", category: "Desserts", image: "/media/1/store/Châteraisé/chateraise.jpg" },
  { name: "Burger King", unit: "#B1-30/31", level: "B1", category: "Fast Food", image: "/media/TCM Tenant/TCM - Burger King.jpg" },
  { name: "KFC", unit: "#B1-32/33", level: "B1", category: "Fast Food", image: "/media/1/store/KFC (Halal Certified)/22.png" },
  { name: "Subway", unit: "#B1-24/25", level: "B1", category: "Fast Food", image: "/media/1/store/Subway (Halal Certified)/44.png" },
  { name: "Sukiya", unit: "#B1-34/35", level: "B1", category: "Japanese", image: "/media/TCM Tenant/TCM Website Tenant Logo Sukiya.jpg" },
  { name: "Maki-san", unit: "#B1-K19", level: "B1", category: "Japanese", image: "/media/1/store/Maki-San (Halal Certified)/makisan.jpg" },
  { name: "Pasta Express", unit: "#B1-K18", level: "B1", category: "Western", image: "/media/TCM Tenant/TCM Website Tenant Logo_Pasta Express 1.jpg" },
  { name: "Munchi Pancakes", unit: "#B1-K7", level: "B1", category: "Desserts", image: "/media/TCM Tenant/TCM Website Tenant Logo _Munchi.jpg" },
  { name: "NiKU iKU", unit: "#B1-K21", level: "B1", category: "Japanese", image: null },
  { name: "THE JIN Kimchi", unit: "#B1-K4/K5", level: "B1", category: "Korean", image: "/media/TCM Tenant/TCM Website Tenant Logo TJK.png" },
  { name: "Eastern Rice Dumpling", unit: "#B1-K23", level: "B1", category: "Chinese", image: "/media/1/store/Eastern Rice Dumpling/eastern_rice_dumpling.jpg" },
  { name: "Gong Yuan Ma La Tang", unit: "#B1-29", level: "B1", category: "Chinese", image: "/media/1/store/Gong Yuan/GYMT Logo - 600mm by 400mm.png" },
  { name: "I Love Taimei", unit: "#B1-K3", level: "B1", category: "Taiwanese", image: "/media/TCM Tenant/I Love Taimei Logo.jpg" },
  { name: "Krispy Kreme", unit: "#B1-K24", level: "B1", category: "Desserts", image: "/media/1/store/Krispy Kreme/KK Logo_600mm x 400mm.png" },
  { name: "Lao 2 Soup", unit: "#B1-K20", level: "B1", category: "Chinese", image: "/media/1/store/Lao 2 Soup/28.png" },
  { name: "LiHO TEA", unit: "#B1-K6", level: "B1", category: "Drinks", image: "/media/1/store/LiHO TEA/liho.jpg" },
  { name: "Mr Bean", unit: "#B1-K16", level: "B1", category: "Drinks", image: "/media/1/store/Mr Bean/mr_bean.jpg" },
  { name: "Mr. Coconut", unit: "#B1-K13", level: "B1", category: "Drinks", image: "/media/1/store/Mr Coconut/34.png" },
  { name: "Nam Kee Pau", unit: "#B1-K17", level: "B1", category: "Chinese", image: "/media/1/store/Nam Kee Pau/namkeepau.jpg" },
  { name: "Old Chang Kee", unit: "#B1-K11", level: "B1", category: "Local", image: "/media/1/store/Old Chang Kee (Halal Certified)/old_chang_kee.jpg" },
  { name: "Paik's Noodle", unit: "#B1-28", level: "B1", category: "Korean", image: "/media/1/store/Paik noodle/Paik Noodle Logo - 600mm by 400mm.png" },
  { name: "Pezzo", unit: "#B1-K12", level: "B1", category: "Western", image: "/media/1/store/Pezzo (Halal Certified)/pezzo.jpg" },
  { name: "Polar Puffs & Cakes", unit: "#B1-K15", level: "B1", category: "Bakery", image: "/media/1/store/Polar Puffs & Cakes (Halal Certified)/polar_puff.jpg" },
  { name: "SF Fruits & Juices", unit: "#B1-K8/K9", level: "B1", category: "Drinks", image: "/media/1/store/SF Fruits & Juice/sf_fruits.jpg" },
  { name: "Stuff'd", unit: "#B1-K10", level: "B1", category: "Western", image: "/media/1/store/Stuff-d (Halal Certified)/stuffd.jpg" },
  { name: "Sushi Express", unit: "#B1-08/09", level: "B1", category: "Japanese", image: "/media/1/store/Sushi Express/Sushi Express Logo (2024) - 600mm by 400mm.png" },
  { name: "Swee Heng Classic 1989", unit: "#B1-K1/K2", level: "B1", category: "Bakery", image: "/media/1/store/Swee Heng Classic 1989 (Halal Certified)/sweeheng.jpg" },
  { name: "TORI-Q", unit: "#B1-19", level: "B1", category: "Japanese", image: "/media/1/store/TORI-Q/toriq.jpg" },
  { name: "Nine Fresh", unit: "#B1-K14", level: "B1", category: "Drinks", image: "/media/TCM Tenant/TCM Website Tenant Logo_Nine Fresh.jpg" },
  { name: "Ya Kun Kaya Toast", unit: "#B1-21/23", level: "B1", category: "Cafe", image: "/media/1/store/Ya Kun Kaya Toast/yakun.jpg" },
  { name: "Wok Hey", unit: "#B1-K22", level: "B1", category: "Chinese", image: "/media/1/store/Wok Hey/52.png" },
  { name: "Kapi Kapi", unit: "#03-31", level: "03", category: "Cafe", image: "/media/TCM Tenant/Kapi Kapi_Logo.jpg" },
  { name: "ECOK Charcoal House", unit: "#03-33", level: "03", category: "Korean", image: "/media/1/store/ECOK Charcoal House/10.png" },
  { name: "TamJai SamGor Mixian", unit: "#03-53", level: "03", category: "Chinese", image: "/media/1/store/tamjai/Tamjai Logo - 600mm by 400mm.png" },
  { name: "Crystal Jade Hong Kong Kitchen", unit: "#03-54/55", level: "03", category: "Chinese", image: "/media/1/store/Crystal Jade Kitchen/6.png" },
  { name: "Soup Restaurant", unit: "#03-62/63", level: "03", category: "Chinese", image: "/media/1/store/Soup Restaurant/Soup Restaurant Logo - 600mm by 400mm.png" },
  { name: "Mei Heong Yuen Dessert", unit: "#04-19", level: "04", category: "Desserts", image: "/media/1/store/Mei Heong Yuen Dessert/31.png" },
  { name: "Hawkers' Street", unit: "#04-20/22", level: "04", category: "Food Court", image: "/media/TCM Tenant/TCM Website Tenant Logo HS.jpg" },
  { name: "Qin Ji Rougamo", unit: "#04-23/24/K5", level: "04", category: "Chinese", image: "/media/1/store/Qinji Rougamo/Qinji Logo - 600mm by 400mm.png" },
  { name: "M.Y Duck", unit: "#04-25/26", level: "04", category: "Chinese", image: "/media/1/store/MY Duck/TCM Website Tenant Logo Sizing (3).png" },
  { name: "HA JUN", unit: "#04-33", level: "04", category: "Korean", image: null },
  { name: "Kenny Rogers Roasters", unit: "#04-33A", level: "04", category: "Western", image: "/media/1/store/kenny rogers/Kenny Rogers Logo - 600mm by 400mm.png" },
  { name: "So Pho", unit: "#04-34", level: "04", category: "Vietnamese", image: "/media/1/store/So Pho (Halal Certified)/So Pho Logo - 600mm by 400mm.png" },
  { name: "Kaffe & Toast", unit: "#04-K1/K2", level: "04", category: "Cafe", image: "/media/1/store/Kaffe & Toast (Halal Certified)/kaffe.jpg" },
  { name: "Eighteen Chefs", unit: "#05-16/17", level: "05", category: "Western", image: "/media/1/store/Eighteen Chefs/11.png" },
  { name: "Seoul Garden", unit: "#05-18", level: "05", category: "Korean", image: "/media/1/store/Seoul Garden/Seoul Garden Logo - 600mm by 400mm.png" },
  { name: "MADLYGOOD", unit: "#05-22, K4/K5", level: "05", category: "Cafe", image: "/media/1/store/Madly Good Cafe/29.png" },
  { name: "Ichiban Boshi", unit: "#05-28/30", level: "05", category: "Japanese", image: "/media/TCM Tenant/TCM Website_IBB.jpg" },
  { name: "Swensen's", unit: "#05-31/33", level: "05", category: "Desserts", image: "/media/1/store/swensen's/46.png" },
  { name: "Wingstop", unit: "#05-34", level: "05", category: "Western", image: "/media/1/store/Wingstop/Wingstop Logo - 600mm by 400mm.png" },
  { name: "Yakiniku Like", unit: "#05-35/37", level: "05", category: "Japanese", image: "/media/1/store/Yakiniku Like/54.png" }
];

const MALL_ID = 'the-clementi-mall';

// Generate slug from name
function generateSlug(name, mallId) {
  const slug = name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug}-${mallId}`;
}

async function importClementiMall() {
  console.log('=== THE CLEMENTI MALL IMPORT TO mall_outlets ===\n');

  // First, delete existing outlets for this mall
  console.log('Step 1: Removing existing outlets for The Clementi Mall...');
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

  for (const outlet of clementiMallOutlets) {
    const outletId = generateSlug(outlet.name, MALL_ID);
    const thumbnailUrl = outlet.image ? `${BASE_URL}${outlet.image}` : null;

    const { error: insertError } = await supabase
      .from('mall_outlets')
      .insert({
        id: outletId,
        name: outlet.name,
        mall_id: MALL_ID,
        level: outlet.unit,
        category: outlet.category,
        tags: [outlet.category],
        thumbnail_url: thumbnailUrl
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

  console.log(`\nTotal outlets at The Clementi Mall: ${finalCount?.length || 0}`);
}

importClementiMall().catch(console.error);
