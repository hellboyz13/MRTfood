// Script to add pricing for restaurants that were missing pricing
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Use service role key to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4'
);

// Pricing data from CSV
const pricingData = [
  { name: "Scaled by Ah Hua Kelong", pricing: "$50-80" },
  { name: "Sync Haus Café", pricing: "$15-25" },
  { name: "Maxi Coffee Bar", pricing: "$10-20" },
  { name: "Chye Seng Huat Hardware", pricing: "$15-30" },
  { name: "Tolido's Espresso Nook", pricing: "$15-25" },
  { name: "La Levain", pricing: "$5-20" },
  { name: "Tai Wah Pork Noodle", pricing: "$6-10" },
  { name: "Ah Chew Desserts", pricing: "$4-10" },
  { name: "Old Amoy Chendol (Chinatown)", pricing: "$3-6" },
  { name: "Shiok Hokkien Mee", pricing: "$5-8" },
  { name: "Ru Ji Kitchen", pricing: "$4-8" },
  { name: "Enchanted Cafe", pricing: "$15-25" },
  { name: "Eminent Frog Porridge", pricing: "$15-30" },
  { name: "Ponggol Nasi Lemak", pricing: "$6-12" },
  { name: "Fei Fei Wonton Noodle", pricing: "$5-10" },
  { name: "J2 Famous Crispy Curry Puff", pricing: "$1.80-2" },
  { name: "Soh Kee Cooked Food", pricing: "$4-7" },
  { name: "Zam Zam Restaurant", pricing: "$8-15" },
  { name: "Haji Kadir Food Chains", pricing: "$8-15" },
  { name: "Allauddin Briyani", pricing: "$6-10" },
  { name: "Cherki", pricing: "$20-40" },
  { name: "Chef Kang's Noodle House", pricing: "$5-10" },
  { name: "Indocafé", pricing: "$20-40" },
  { name: "848 Braised Duck Rice", pricing: "$5-10" },
  { name: "SYIP", pricing: "$15-25" },
  { name: "Dajie Makan Place", pricing: "$5-10" },
  { name: "Tiong Bahru Hainanese Boneless Chicken Rice", pricing: "$4-8" },
  { name: "33 Vegetarian Food", pricing: "$4-8" },
  { name: "Enjoy Eating House", pricing: "$10-20" },
  { name: "Cherry & Oak", pricing: "$15-25" },
  { name: "Lao Zhong Zhong Eating House", pricing: "$10-20" },
  { name: "Sourbombe Artisinal Bakery", pricing: "$5-15" },
  { name: "La Bottega Enoteca", pricing: "$30-50" },
  { name: "Fu Lin Tofu Yuen", pricing: "$8-15" },
  { name: "Nature Vegetarian Delights Restaurant", pricing: "$8-15" },
  { name: "Grandfather Carrot Cake", pricing: "$4-8" },
  { name: "Yan Chuan Roaster", pricing: "$8-15" },
  { name: "Xi Wang Bak Kut Teh", pricing: "$8-15" },
  { name: "Tien Court Restaurant", pricing: "$30-60" },
  { name: "Ginkyo by Kinki", pricing: "$30-50" },
  { name: "Hey Kee HK Seafood", pricing: "$20-40" },
  { name: "D'Authentic Nasi Lemak", pricing: "$5-10" },
  { name: "I Love Sukhothai", pricing: "$8-15" },
  { name: "Joo Siah Bak Kut Teh", pricing: "$8-15" },
  { name: "Ipoh Zai Prawn Mee", pricing: "$5-10" },
  { name: "Joji's Sandwich Parlour", pricing: "$12-20" },
  { name: "Koothurar Nasi Biryani", pricing: "$6-12" },
  { name: "Lo Hey HK Seafood", pricing: "$25-50" },
  { name: "Prawn & Mee", pricing: "$6-12" },
  { name: "SEORAE JIB", pricing: "$25-40" },
  { name: "Si Wei Xiao Chuan Chuan", pricing: "$15-30" },
  { name: "Teochew Fish Ball Noodles", pricing: "$4-7" },
  { name: "Two Chefs Eating Place", pricing: "$10-20" },
  { name: "Wan Li Curry Mixed Veg Rice", pricing: "$4-8" },
  { name: "Wanglee Seafood Restaurant", pricing: "$20-40" },
  { name: "Xin Fu Ji Local Delights", pricing: "$5-10" }
];

async function main() {
  console.log('=== Adding Pricing for Restaurants ===\n');

  // Get all listings
  const { data: listings } = await supabase
    .from('food_listings')
    .select('id, name')
    .eq('is_active', true);

  // Create a map for quick lookup (case-insensitive)
  const listingMap = new Map();
  listings.forEach(l => {
    listingMap.set(l.name.toLowerCase(), l);
  });

  let added = 0;
  let notFound = 0;

  for (const item of pricingData) {
    const listing = listingMap.get(item.name.toLowerCase());

    if (!listing) {
      console.log(`❌ Not found: ${item.name}`);
      notFound++;
      continue;
    }

    // Check if pricing already exists
    const { data: existingPrice } = await supabase
      .from('listing_prices')
      .select('id')
      .eq('listing_id', listing.id)
      .eq('item_name', 'Price Range')
      .single();

    if (existingPrice) {
      console.log(`⏭️  Already has pricing: ${item.name}`);
      continue;
    }

    // Add pricing
    const { error } = await supabase
      .from('listing_prices')
      .insert({
        listing_id: listing.id,
        item_name: 'Price Range',
        price: 0,
        description: item.pricing
      });

    if (error) {
      console.log(`❌ Error adding pricing for ${item.name}: ${error.message}`);
    } else {
      console.log(`✅ Added pricing: ${item.name} - ${item.pricing}`);
      added++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Added: ${added} pricing entries`);
  console.log(`   ❌ Not found: ${notFound} restaurants`);
}

main().catch(console.error);
