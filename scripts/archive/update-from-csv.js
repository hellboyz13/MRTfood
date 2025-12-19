const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Listings with sources from CSV
const listingsWithSources = [
  { name: "2am Dessert Bar", station_id: "holland-village", source_id: "Burpple" },
  { name: "Ah Chew Desserts", station_id: "bugis", source_id: "Burpple" },
  { name: "Al-Azhar", station_id: "beauty-world", source_id: "Supper" },
  { name: "Alchemist (The Mill)", station_id: "botanic-gardens", source_id: "Burpple" },
  { name: "Apiary", station_id: "outram-park", source_id: "Burpple" },
  { name: "Artichoke", station_id: "great-world", source_id: "Honeycombers" },
  { name: "Atlas Coffeehouse", station_id: "botanic-gardens", source_id: "Burpple" },
  { name: "Average Service", station_id: "farrer-park", source_id: "Burpple" },
  { name: "Beach Road Scissors Cut Curry Rice", station_id: "farrer-park", source_id: "Supper" },
  { name: "Birds of Paradise", station_id: "tanjong-pagar", source_id: "Michelin Hawker" },
  { name: "Birds of Paradise (Katong)", station_id: "marine-parade", source_id: "Michelin Hawker" },
  { name: "Blue Jasmine", station_id: "farrer-park", source_id: "Honeycombers" },
  { name: "Burnt Cones", station_id: "clementi", source_id: "EatBook" },
  { name: "Café Carrera", station_id: "changi-airport", source_id: "Editor's Choice" },
  { name: "Chai Chee Pork Porridge", station_id: "bedok", source_id: "Supper" },
  { name: "Chong Pang Nasi Lemak", station_id: "yishun", source_id: "Supper" },
  { name: "Chye Seng Huat Hardware", station_id: "farrer-park", source_id: "Burpple" },
  { name: "Coexist Coffee Co.", station_id: "pasir-panjang", source_id: "Editor's Choice" },
  { name: "Common Man Coffee Roasters", station_id: "havelock", source_id: "Burpple" },
  { name: "Creamier (Gillman Barracks)", station_id: "labrador-park", source_id: "Burpple" },
  { name: "Dopa", station_id: "chinatown", source_id: "EatBook" },
  { name: "Du Du Shou Shi", station_id: "lakeside", source_id: "Editor's Choice" },
  { name: "Duke Dessert", station_id: "bugis", source_id: "Burpple" },
  { name: "Dumpling Darlings", station_id: "telok-ayer", source_id: "Burpple" },
  { name: "EarlyAfter", station_id: "fort-canning", source_id: "Editor's Choice" },
  { name: "Eat 3 Bowls", station_id: "tampines", source_id: "EatBook" },
  { name: "Edith Patisserie", station_id: "havelock", source_id: "Burpple" },
  { name: "Elijah Pies", station_id: "tanjong-pagar", source_id: "Burpple" },
  { name: "Eminent Frog Porridge", station_id: "aljunied", source_id: "Michelin Hawker" },
  { name: "Ernie's Coffee", station_id: "queenstown", source_id: "Editor's Choice" },
  { name: "Fei Fei Wonton Noodle", station_id: "eunos", source_id: "Supper" },
  { name: "Fernweh", station_id: "chinatown", source_id: "Editor's Choice" },
  { name: "Finest Song Kee Fishball Noodles", station_id: "serangoon", source_id: "Supper" },
  { name: "Five Oars Coffee Roasters", station_id: "tanjong-pagar", source_id: "Burpple" },
  { name: "Fortuna Terrazza", station_id: "tanjong-pagar", source_id: "Editor's Choice" },
  { name: "Giraffa", station_id: "jurong-east", source_id: "EatBook" },
  { name: "Good Bites", station_id: "bishan", source_id: "Supper" },
  { name: "Hae! Prawn Claypot", station_id: "bedok-reservoir", source_id: "Editor's Choice" },
  { name: "Hakka Leipopo", station_id: "tongkang", source_id: "Editor's Choice" },
  { name: "Haruyama Udon", station_id: "tampines", source_id: "EatBook" },
  { name: "Hello Arigato (Joo Chiat)", station_id: "eunos", source_id: "Burpple" },
  { name: "Hello Arigato (Upper Thomson)", station_id: "upper-thomson", source_id: "Burpple" },
  { name: "Homm Dessert", station_id: "city-hall", source_id: "Dessert" },
  { name: "Hong Chang Frog Porridge", station_id: "woodleigh", source_id: "Supper" },
  { name: "Hundred Acre Creamery", station_id: "tampines", source_id: "Dessert" },
  { name: "Jin Yu Man Tang", station_id: "marine-parade", source_id: "Dessert" },
  { name: "Joo Seng Teochew Porridge", station_id: "beauty-world", source_id: "Supper" },
  { name: "Kind Kones", station_id: "orchard-boulevard", source_id: "Honeycombers" },
  { name: "La Levain", station_id: "lavender", source_id: "Burpple" },
  { name: "Lang Nuong Vietnam", station_id: "farrer-park", source_id: "Supper" },
  { name: "Lawa Bintang", station_id: "tampines-east", source_id: "EatBook" },
  { name: "Little Rogue Coffee", station_id: "marine-parade", source_id: "Burpple" },
  { name: "Little Tokio", station_id: "tampines-west", source_id: "Editor's Choice" },
  { name: "Lola's Cafe", station_id: "boon-keng", source_id: "Burpple" },
  { name: "Ma Bo Lor Mee", station_id: "bedok", source_id: "Editor's Choice" },
  { name: "Matchaya", station_id: "changi-airport", source_id: "Dessert" },
  { name: "Maxi Coffee Bar", station_id: "chinatown", source_id: "Editor's Choice" },
  { name: "Micro Bakery & Kitchen", station_id: "botanic-gardens", source_id: "Honeycombers" },
  { name: "Ming Fa Fishball Noodles", station_id: "upper-thomson", source_id: "Supper" },
  { name: "Mister Donut", station_id: "tampines", source_id: "EatBook" },
  { name: "Momolato", station_id: "bugis", source_id: "EatBook" },
  { name: "Monarchs & Milkweed", station_id: "changi-airport", source_id: "Editor's Choice" },
  { name: "Mr Bucket Chocolaterie", station_id: "napier", source_id: "Honeycombers" },
  { name: "Nesuto", station_id: "tanjong-pagar", source_id: "Burpple" },
  { name: "New Deli Bakery", station_id: "tampines", source_id: "Editor's Choice" },
  { name: "Nylon Coffee Roasters", station_id: "outram-park", source_id: "Burpple" },
  { name: "Old Hen Coffee", station_id: "kent-ridge", source_id: "Editor's Choice" },
  { name: "Old World Bakuteh", station_id: "pasir-ris", source_id: "EatBook" },
  { name: "OLLA Specialty Coffee", station_id: "clementi", source_id: "Burpple" },
  { name: "Pantler", station_id: "havelock", source_id: "Burpple" },
  { name: "Patisserie Clé", station_id: "great-world", source_id: "Burpple" },
  { name: "Plain Vanilla (Tiong Bahru)", station_id: "havelock", source_id: "Burpple" },
  { name: "Ponggol Nasi Lemak", station_id: "kovan", source_id: "Supper" },
  { name: "Praelum Wine Bistro", station_id: "tanjong-pagar", source_id: "Burpple" },
  { name: "PS.Cafe (Harding Road)", station_id: "redhill", source_id: "Honeycombers" },
  { name: "Punch", station_id: "maxwell", source_id: "Burpple" },
  { name: "Shubby Sweets", station_id: "bedok", source_id: "Editor's Choice" },
  { name: "Sin Hoi Sai Eating House", station_id: "marine-parade", source_id: "Supper" },
  { name: "Sourbombe Artisanal Bakery (Park Mall)", station_id: "bencoolen", source_id: "EatBook" },
  { name: "Srisun Express", station_id: "lorong-chuan", source_id: "Supper" },
  { name: "SuiTok Dessert", station_id: "somerset", source_id: "Dessert" },
  { name: "Supper Deck", station_id: "bedok", source_id: "Supper" },
  { name: "Swee Choon", station_id: "jalan-besar", source_id: "Popular" },
  { name: "Sync Haus Café", station_id: "tiong-bahru", source_id: "Editor's Choice" },
  { name: "The Brewing Ground", station_id: "eunos", source_id: "Burpple" },
  { name: "The Dim Sum Place", station_id: "nicoll-highway", source_id: "Supper" },
  { name: "The Ramen Stall", station_id: "nicoll-highway", source_id: "Supper" },
  { name: "The Roti Prata House", station_id: "upper-thomson", source_id: "Supper" },
  { name: "Tiong Bahru Bakery", station_id: "havelock", source_id: "Honeycombers" },
  { name: "Tolido's Espresso Nook", station_id: "lavender", source_id: "Burpple" },
  { name: "Tom's Palette", station_id: "bugis", source_id: "EatBook" },
  { name: "Waa Cow!", station_id: "harbourfront", source_id: "EatBook" },
  { name: "Warabimochi Kamakura", station_id: "holland-village", source_id: "EatBook" },
  { name: "Whiskdom", station_id: "havelock", source_id: "Burpple" },
  { name: "Windowsill Pies", station_id: "marine-parade", source_id: "Burpple" },
  { name: "Wunderfolks", station_id: "tampines", source_id: "Burpple" },
  { name: "Xiang Peng La Mian Xiao Long Bao", station_id: "clementi", source_id: "Editor's Choice" },
  { name: "Xing Ji Rou Cuo Mian", station_id: "bedok", source_id: "Editor's Choice" },
  { name: "Yaowarat Thai Kway Chap", station_id: "kovan", source_id: "Supper" },
];

// Listings with prices from CSV
const listingsWithPrices = [
  { name: "Abundance", station_id: "redhill", source_id: "Seth Lui", price_low: 15, price_high: 30 },
  { name: "Ah Bowl Den", station_id: "joo-koon", source_id: "EatBook", price_low: 6, price_high: 10 },
  { name: "Boon Lay Power Nasi Lemak", station_id: "boon-lay", source_id: "Seth Lui", price_low: 3, price_high: 6 },
  { name: "Boon Lay Satay", station_id: "boon-lay", source_id: "Editor's Choice", price_low: 6, price_high: 15 },
  { name: "Broadway Canteen", station_id: "gul-circle", source_id: "Editor's Choice", price_low: 3, price_high: 6 },
  { name: "Captain's Table", station_id: "tuas-link", source_id: "Editor's Choice", price_low: 18, price_high: 50 },
  { name: "Chef Hainanese Western Food", station_id: "queenstown", source_id: "EatBook", price_low: 5, price_high: 10 },
  { name: "Crab Corner", station_id: "joo-koon", source_id: "Editor's Choice", price_low: 15, price_high: 40 },
  { name: "Depot Road Zhen Shan Mei Claypot Laksa", station_id: "queenstown", source_id: "Michelin Hawker", price_low: 4, price_high: 6 },
  { name: "Eden Cafe", station_id: "chinese-garden", source_id: "danielfooddiary", price_low: 15, price_high: 28 },
  { name: "Fai Kee Fish Head Bee Hoon", station_id: "commonwealth", source_id: "Editor's Choice", price_low: 6, price_high: 15 },
  { name: "Foong Kee Traditional Charcoal Roaster", station_id: "commonwealth", source_id: "Seth Lui", price_low: 5, price_high: 10 },
  { name: "Grill Werkz", station_id: "dover", source_id: "EatBook", price_low: 10, price_high: 20 },
  { name: "Ho Huat's Fried Hokkien Mee", station_id: "boon-lay", source_id: "EatBook", price_low: 4, price_high: 8 },
  { name: "Hock Shun Traditional Homemade Curry", station_id: "redhill", source_id: "Seth Lui", price_low: 4, price_high: 8 },
  { name: "Hong Kee Porridge", station_id: "commonwealth", source_id: "Seth Lui", price_low: 4, price_high: 7 },
  { name: "Hwang's", station_id: "dover", source_id: "EatBook", price_low: 4, price_high: 10 },
  { name: "iEat Canteen", station_id: "tuas-link", source_id: "Editor's Choice", price_low: 4, price_high: 8 },
  { name: "Jian Bo Shui Kueh", station_id: "tiong-bahru", source_id: "Michelin Hawker", price_low: 3.5, price_high: 5 },
  { name: "Keng Eng Kee Seafood", station_id: "queenstown", source_id: "Michelin Hawker", price_low: 6, price_high: 40 },
  { name: "Kueh Garden", station_id: "chinese-garden", source_id: "EatBook", price_low: 0.9, price_high: 2 },
  { name: "Lian Yi BBQ Seafood", station_id: "boon-lay", source_id: "Seth Lui", price_low: 15, price_high: 35 },
  { name: "Lor Mee 178", station_id: "tiong-bahru", source_id: "Michelin Hawker", price_low: 4, price_high: 6 },
  { name: "Marina Bistro", station_id: "tuas-link", source_id: "Editor's Choice", price_low: 12, price_high: 25 },
  { name: "Maruhachi Donburi & Curry", station_id: "lakeside", source_id: "EatBook", price_low: 8, price_high: 15 },
  { name: "MONKI", station_id: "buona-vista", source_id: "EatBook", price_low: 6, price_high: 15 },
  { name: "Prata Planet", station_id: "clementi", source_id: "Editor's Choice", price_low: 1.5, price_high: 8 },
  { name: "Santoshimaa Indian Restaurant", station_id: "tuas-crescent", source_id: "Editor's Choice", price_low: 1, price_high: 11 },
  { name: "Shi Le Yuan Kway Chap", station_id: "redhill", source_id: "Michelin Hawker", price_low: 3, price_high: 7 },
  { name: "Shi Nian Pig Leg Rice", station_id: "pioneer", source_id: "Time Out Singapore 2025", price_low: 5, price_high: 8 },
  { name: "Skirt & Dirt", station_id: "tiong-bahru", source_id: "EatBook", price_low: 8, price_high: 15 },
  { name: "SZ Kitchen", station_id: "joo-koon", source_id: "Editor's Choice", price_low: 10, price_high: 30 },
  { name: "The Carving Board", station_id: "chinese-garden", source_id: "EatBook", price_low: 8, price_high: 22 },
  { name: "The Ride Side Skate Cafe", station_id: "lakeside", source_id: "EatBook", price_low: 10, price_high: 20 },
  { name: "Third Place", station_id: "tuas-west-road", source_id: "Editor's Choice", price_low: 4, price_high: 8 },
  { name: "Tien Lai Rice Stall", station_id: "lakeside", source_id: "EatBook", price_low: 5, price_high: 8 },
  { name: "Uncle Peter Hokkien Mee", station_id: "redhill", source_id: "Seth Lui", price_low: 5, price_high: 8 },
  { name: "Viet Food", station_id: "pioneer", source_id: "Time Out Singapore 2025", price_low: 3, price_high: 7 },
  { name: "W & W Roasted Duck Chicken Rice", station_id: "tuas-crescent", source_id: "Editor's Choice", price_low: 4, price_high: 8 },
  { name: "Wakon Ramen", station_id: "dover", source_id: "EatBook", price_low: 6.5, price_high: 12 },
  { name: "Wild Crumbs", station_id: "buona-vista", source_id: "EatBook", price_low: 9, price_high: 15 },
  { name: "XO Fish Head Bee Hoon", station_id: "dover", source_id: "EatBook", price_low: 5, price_high: 10 },
];

// Source name to ID mapping
const sourceNameToId = {
  'Burpple': 'burpple',
  'Supper': 'supper',
  'Honeycombers': 'honeycombers',
  'Michelin Hawker': 'michelin-hawker',
  'EatBook': 'eatbook',
  'Editor\'s Choice': 'editors-choice',
  'Dessert': 'dessert',
  'Popular': 'popular',
  'Seth Lui': 'seth-lui',
  'Time Out Singapore 2025': 'timeout-sg-2025',
  'danielfooddiary': 'danielfooddiary',
};

async function updateFromCSV() {
  console.log('=== UPDATING SOURCES ===\n');

  let sourcesUpdated = 0;
  let sourcesFailed = 0;

  for (const listing of listingsWithSources) {
    const sourceId = sourceNameToId[listing.source_id];
    if (!sourceId) {
      console.log(`Unknown source: ${listing.source_id} for ${listing.name}`);
      sourcesFailed++;
      continue;
    }

    const { error } = await supabase
      .from('food_listings')
      .update({ source_id: sourceId })
      .eq('name', listing.name);

    if (error) {
      console.log(`Error updating ${listing.name}: ${error.message}`);
      sourcesFailed++;
    } else {
      console.log(`Updated source for: ${listing.name} -> ${sourceId}`);
      sourcesUpdated++;
    }
  }

  console.log(`\nSources updated: ${sourcesUpdated}`);
  console.log(`Sources failed: ${sourcesFailed}`);

  console.log('\n=== UPDATING PRICES ===\n');

  let pricesUpdated = 0;
  let pricesFailed = 0;

  for (const listing of listingsWithPrices) {
    // First update source if provided
    const sourceId = sourceNameToId[listing.source_id];
    if (sourceId) {
      await supabase
        .from('food_listings')
        .update({ source_id: sourceId })
        .eq('name', listing.name);
    }

    // Get the listing ID
    const { data: listingData } = await supabase
      .from('food_listings')
      .select('id')
      .eq('name', listing.name)
      .single();

    if (!listingData) {
      console.log(`Listing not found: ${listing.name}`);
      pricesFailed++;
      continue;
    }

    // Check if price already exists
    const { data: existingPrice } = await supabase
      .from('listing_prices')
      .select('id')
      .eq('listing_id', listingData.id)
      .limit(1);

    if (existingPrice && existingPrice.length > 0) {
      // Update existing price
      const { error } = await supabase
        .from('listing_prices')
        .update({
          price: listing.price_low,
          description: `$${listing.price_low} - $${listing.price_high}`
        })
        .eq('listing_id', listingData.id);

      if (error) {
        console.log(`Error updating price for ${listing.name}: ${error.message}`);
        pricesFailed++;
      } else {
        console.log(`Updated price for: ${listing.name} -> $${listing.price_low}-${listing.price_high}`);
        pricesUpdated++;
      }
    } else {
      // Insert new price
      const { error } = await supabase
        .from('listing_prices')
        .insert({
          listing_id: listingData.id,
          item_name: 'Main',
          price: listing.price_low,
          description: `$${listing.price_low} - $${listing.price_high}`,
          is_signature: true,
          sort_order: 0
        });

      if (error) {
        console.log(`Error inserting price for ${listing.name}: ${error.message}`);
        pricesFailed++;
      } else {
        console.log(`Added price for: ${listing.name} -> $${listing.price_low}-${listing.price_high}`);
        pricesUpdated++;
      }
    }
  }

  console.log(`\nPrices updated/added: ${pricesUpdated}`);
  console.log(`Prices failed: ${pricesFailed}`);

  console.log('\n=== SUMMARY ===');
  console.log(`Sources: ${sourcesUpdated} updated, ${sourcesFailed} failed`);
  console.log(`Prices: ${pricesUpdated} updated/added, ${pricesFailed} failed`);
}

updateFromCSV().catch(console.error);
