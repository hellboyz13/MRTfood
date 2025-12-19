/**
 * Import restaurants with price ranges and walking distances from OneMap
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { getWalkingDistance, haversineDistance } from '../lib/onemap';

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Restaurant data with prices
const restaurants = [
  { name: "Gwanghwamun Mijin", lat: 1.2833, lng: 103.8495, station_id: "telok-ayer", description: "Michelin Bib Gourmand Korean restaurant specializing in cold buckwheat noodles. 70-year heritage from Seoul.", tags: ["Korean", "Noodles", "Michelin", "Bib Gourmand"], rating: 4.3, price_low: 15, price_high: 30, source_id: "eatbook" },
  { name: "Kikanbo", lat: 1.2644, lng: 103.8222, station_id: "harbourfront", description: "Tokyo-famous spicy ramen specializing in karashibi (spicy-numbing) miso ramen.", tags: ["Japanese", "Ramen", "Spicy"], rating: 4.4, price_low: 15, price_high: 22, source_id: "eatbook" },
  { name: "Kyo Komachi", lat: 1.2644, lng: 103.8222, station_id: "harbourfront", description: "Japanese restaurant famous for handmade Himokawa udon - ultra-wide flat noodles.", tags: ["Japanese", "Udon", "Noodles"], rating: 4.2, price_low: 14, price_high: 25, source_id: "eatbook" },
  { name: "Niku Niku Oh Kome", lat: 1.2546, lng: 103.8238, station_id: "harbourfront", description: "Hamburg steak spot with free-flow rice and fresh Wagyu patties.", tags: ["Japanese", "Western", "Wagyu"], rating: 4.3, price_low: 20, price_high: 40, source_id: "eatbook" },
  { name: "Big Fried Chicken", lat: 1.3271, lng: 103.8893, station_id: "macpherson", description: "Viral hawker stall with $4.50 fried chicken rice.", tags: ["Hawker", "Fried Chicken", "Affordable"], rating: 4.1, price_low: 4.5, price_high: 8, source_id: "eatbook" },
  { name: "5:59+ Cafe and Bistro", lat: 1.3006, lng: 103.8387, station_id: "somerset", description: "Popular panda-themed cafe from Chengdu with Sichuan-Western fusion and mala coffee.", tags: ["Cafe", "Themed", "Sichuan"], rating: 4.2, price_low: 12, price_high: 25, source_id: "eatbook" },
  { name: "Udon Shin", lat: 1.3006, lng: 103.8387, station_id: "somerset", description: "Tokyo-famous udon named Best Udon in Tokyo by Time Out. Known for Udon Carbonara.", tags: ["Japanese", "Udon"], rating: 4.5, price_low: 12, price_high: 20, source_id: "eatbook" },
  { name: "Wonderful Bapsang", lat: 1.2931, lng: 103.8577, station_id: "promenade", description: "Korean restaurant revamped to focus on house-made tofu and sundubu stew in 13 ways.", tags: ["Korean", "Tofu", "Stew"], rating: 4.1, price_low: 12, price_high: 22, source_id: "eatbook" },
  { name: "Bon Broth", lat: 1.2937, lng: 103.8535, station_id: "city-hall", description: "Chef André Chiang's first hotpot restaurant. Individual hotpot with 8 broth options.", tags: ["Hotpot", "Fine Dining"], rating: 4.6, price_low: 35, price_high: 80, source_id: "eatbook" },
  { name: "Cavern Restaurant", lat: 1.4045, lng: 103.7894, station_id: "woodlands", description: "Singapore's first cave-in-a-restaurant concept with Western dishes inside Mandai.", tags: ["Western", "Themed", "Family"], rating: 4.0, price_low: 20, price_high: 45, source_id: "eatbook" },
  { name: "Kowboy", lat: 1.2988, lng: 103.8579, station_id: "bugis", description: "Korean-style UFO burgers including A5 Wagyu options under $20.", tags: ["Korean", "Burgers", "Affordable"], rating: 4.2, price_low: 12, price_high: 20, source_id: "eatbook" },
  { name: "Tofu G", lat: 1.3014, lng: 103.8355, station_id: "somerset", description: "Korean pop-up serving premium tofu gelato in six flavours.", tags: ["Korean", "Dessert", "Gelato"], rating: 4.3, price_low: 6, price_high: 12, source_id: "eatbook" },
  { name: "Noci", lat: 1.2931, lng: 103.8577, station_id: "promenade", description: "Singapore's first Korean pasta bar with handmade pasta and pizza.", tags: ["Korean", "Italian", "Pasta"], rating: 4.3, price_low: 18, price_high: 35, source_id: "eatbook" },
  { name: "Bomul Samgyetang", lat: 1.2954, lng: 103.8516, station_id: "city-hall", description: "Korean restaurant specializing in ginseng chicken broth in 10 flavours.", tags: ["Korean", "Soup", "Ginseng"], rating: 4.2, price_low: 18, price_high: 35, source_id: "eatbook" },
  { name: "Partage Patisserie", lat: 1.3103, lng: 103.8634, station_id: "lavender", description: "Artisanal French pastries and petit gateau by award-winning pastry chef Terence Lin.", tags: ["Cafe", "French", "Pastry"], rating: 4.5, price_low: 8, price_high: 18, source_id: "eatbook" },
  { name: "Keming Bing Sat", lat: 1.2949, lng: 103.8523, station_id: "city-hall", description: "HK-famous cha chaan teng that sold 3 million bowls of char siew rice in a year.", tags: ["Hong Kong", "Char Siew"], rating: 4.3, price_low: 8, price_high: 18, source_id: "eatbook" },
  { name: "Dragon Curry", lat: 1.3029, lng: 103.8639, station_id: "nicoll-highway", description: "New curry stall at Golden Mile run by ex-Jumbo chef. Curry rice from $5.", tags: ["Hawker", "Curry", "Affordable"], rating: 4.2, price_low: 5, price_high: 10, source_id: "eatbook" },
  { name: "HunBun", lat: 1.3393, lng: 103.7763, station_id: "beauty-world", description: "Sandwich stall run by young couple with focaccia and sourdough toasts under $20.", tags: ["Cafe", "Sandwiches", "Affordable"], rating: 4.3, price_low: 10, price_high: 20, source_id: "eatbook" },
  { name: "Menya Saku", lat: 1.3007, lng: 103.8546, station_id: "rochor", description: "New ramen spot by ex-Ramen Champion chef with ramen under $15.", tags: ["Japanese", "Ramen", "Affordable"], rating: 4.2, price_low: 10, price_high: 15, source_id: "eatbook" },
  { name: "Swag & Sizzle", lat: 1.2766, lng: 103.8412, station_id: "tanjong-pagar", description: "Restaurant-quality hawker steak by ex-L'Entrecôte chefs. Hanger steak and brunch plates.", tags: ["Hawker", "Western", "Steak"], rating: 4.4, price_low: 12, price_high: 25, source_id: "sethlui" },
  { name: "The Neighbourwok", lat: 1.3489, lng: 103.7478, station_id: "bukit-gombak", description: "Popular Hokkien mee stall - Seth Lui's personal favourite in Singapore.", tags: ["Hawker", "Hokkien Mee"], rating: 4.5, price_low: 5, price_high: 10, source_id: "sethlui" },
  { name: "545 Whampoa Prawn Noodle", lat: 1.3214, lng: 103.8432, station_id: "novena", description: "Michelin-recommended prawn noodle with rich umami broth. New branch at Novena.", tags: ["Hawker", "Prawn Noodle", "Michelin"], rating: 4.4, price_low: 5, price_high: 10, source_id: "sethlui" },
  { name: "Jia Le Man Fen Guo", lat: 1.3351, lng: 103.8486, station_id: "toa-payoh", description: "20-year-old stall serving fish soup and mee hoon kueh.", tags: ["Hawker", "Fish Soup", "Mee Hoon Kueh"], rating: 4.2, price_low: 4, price_high: 8, source_id: "sethlui" },
  { name: "Singapore Fried Hokkien Mee (Punggol)", lat: 1.4094, lng: 103.9093, station_id: "punggol-coast", description: "Michelin Bib Gourmand Hokkien mee at new Punggol Coast Hawker Centre.", tags: ["Hawker", "Hokkien Mee", "Michelin", "Bib Gourmand"], rating: 4.5, price_low: 5, price_high: 10, source_id: "sethlui" },
  { name: "One Soy", lat: 1.4094, lng: 103.9093, station_id: "punggol-coast", description: "Fresh house-made soya milk with unique flavours like Black Soy Milk and Watermelon Soy.", tags: ["Hawker", "Dessert", "Drinks"], rating: 4.1, price_low: 2, price_high: 5, source_id: "sethlui" },
  { name: "Boon Tong Kee (Balestier)", lat: 1.3264, lng: 103.8527, station_id: "toa-payoh", description: "Upgraded to Michelin Bib Gourmand 2025. Legendary chicken rice since 1983.", tags: ["Chicken Rice", "Chinese", "Michelin", "Bib Gourmand"], rating: 4.3, price_low: 5, price_high: 15, source_id: "michelin-hawker" },
  { name: "Omakase@Stevens", lat: 1.3202, lng: 103.8269, station_id: "orchard", description: "New Michelin One Star 2025. Chef Kazuki Arimoto - Young Chef Award winner.", tags: ["Japanese", "Omakase", "Michelin Star"], rating: 4.7, price_low: 200, price_high: 400, source_id: "michelin-hawker" },
  { name: "Sushi Sakuta", lat: 1.3014, lng: 103.8355, station_id: "somerset", description: "Promoted to Michelin Two Stars 2025. Season-driven omakase with all-Japanese kitchen.", tags: ["Japanese", "Sushi", "Omakase", "Michelin Star"], rating: 4.8, price_low: 300, price_high: 500, source_id: "michelin-hawker" },
  { name: "Tsujiri Premium", lat: 1.2749, lng: 103.8453, station_id: "tanjong-pagar", description: "Three-storey matcha cafe with matchamisu bolo bun and sparkling yuzu matcha.", tags: ["Cafe", "Matcha", "Japanese"], rating: 4.2, price_low: 8, price_high: 18, source_id: "editors-choice" },
  { name: "Gelato Messina", lat: 1.2813, lng: 103.8453, station_id: "telok-ayer", description: "Highly acclaimed Australian gelato chain. Singapore exclusive flavours like Kaya Toast.", tags: ["Dessert", "Gelato", "Australian"], rating: 4.5, price_low: 6, price_high: 15, source_id: "eatbook" },
  { name: "Hvala Kissa", lat: 1.2749, lng: 103.8453, station_id: "tanjong-pagar", description: "Japanese kissaten-style cafe focusing on decaf coffee with coffee-forward desserts.", tags: ["Cafe", "Japanese", "Coffee"], rating: 4.3, price_low: 8, price_high: 18, source_id: "danielfooddiary" },
  { name: "22 Grams Coffee", lat: 1.2749, lng: 103.8453, station_id: "tanjong-pagar", description: "Minimalist coffee kiosk using exactly 22 grams of coffee per double ristretto.", tags: ["Cafe", "Coffee"], rating: 4.2, price_low: 5, price_high: 10, source_id: "danielfooddiary" },
  { name: "Corner Corner", lat: 1.2749, lng: 103.8455, station_id: "tanjong-pagar", description: "Japanese-style cafe with vinyl vibes serving specialty coffee and Japanese desserts.", tags: ["Cafe", "Japanese", "Dessert"], rating: 4.4, price_low: 8, price_high: 18, source_id: "danielfooddiary" },
  { name: "Borderless Coffee", lat: 1.2749, lng: 103.8455, station_id: "tanjong-pagar", description: "Stylishly homely cafe with specialty green coffee from Curate Coffee Roasters.", tags: ["Cafe", "Coffee"], rating: 4.3, price_low: 6, price_high: 12, source_id: "editors-choice" },
  { name: "IM JAI by Pun Im", lat: 1.2749, lng: 103.8453, station_id: "tanjong-pagar", description: "Thai restaurant by Michelin-starred Wana Yook chef. IM JAI Bento with 4 Thai elements.", tags: ["Thai", "Restaurant"], rating: 4.2, price_low: 15, price_high: 35, source_id: "editors-choice" },
  { name: "Kimchi Mama", lat: 1.3007, lng: 103.8546, station_id: "bugis", description: "Affordable Korean eatery with dishes from $5.90 including sundubu and stew pots.", tags: ["Korean", "Affordable"], rating: 4.0, price_low: 5.9, price_high: 15, source_id: "editors-choice" },
  { name: "Mensho Tokyo", lat: 1.2937, lng: 103.8535, station_id: "city-hall", description: "Award-winning Tokyo ramen chain. Signature Toripaitan and A5 Wagyu options.", tags: ["Japanese", "Ramen", "Premium"], rating: 4.5, price_low: 15, price_high: 30, source_id: "eatbook" },
  { name: "Ramen-ya", lat: 1.3241, lng: 103.9300, station_id: "bedok", description: "Hidden ramen shop run by Japanese chef. 400+ Google reviews with 4.7 rating.", tags: ["Japanese", "Ramen", "Hidden Gem"], rating: 4.7, price_low: 12, price_high: 20, source_id: "eatbook" },
  { name: "Kajiken", lat: 1.2749, lng: 103.8453, station_id: "tanjong-pagar", description: "Japan's #1 mazesoba spot. Taiwan Mazesoba with spicy minced pork.", tags: ["Japanese", "Ramen", "Mazesoba"], rating: 4.4, price_low: 12, price_high: 18, source_id: "eatbook" },
  { name: "Torasho Ramen", lat: 1.2749, lng: 103.8453, station_id: "tanjong-pagar", description: "Elevated tonkotsu with truffle ragout and uni options. Open till 3am on weekends.", tags: ["Japanese", "Ramen", "Supper"], rating: 4.3, price_low: 15, price_high: 30, source_id: "eatbook" },
  { name: "Takagi Ramen", lat: 1.3694, lng: 103.8521, station_id: "ang-mo-kio", description: "24-hour Hakata-style ramen from $7.90. Black Tonkotsu with slow-roasted garlic.", tags: ["Japanese", "Ramen", "24-Hour", "Affordable"], rating: 4.2, price_low: 7.9, price_high: 15, source_id: "editors-choice" },
  { name: "Liu Lang Mian", lat: 1.2863, lng: 103.8045, station_id: "queenstown", description: "By ex-Kilo Kitchen chef. Made soba kits during pandemic before opening noodle bar.", tags: ["Japanese", "Noodles", "Hidden Gem"], rating: 4.4, price_low: 12, price_high: 20, source_id: "editors-choice" },
  { name: "Ikkousha", lat: 1.2937, lng: 103.8535, station_id: "city-hall", description: "Authentic Hakata-style tonkotsu. Black Tonkotsu with strong black garlic oil.", tags: ["Japanese", "Ramen", "Tonkotsu"], rating: 4.3, price_low: 14, price_high: 22, source_id: "editors-choice" },
  { name: "Kokoro Mazesoba", lat: 1.3007, lng: 103.8546, station_id: "bugis", description: "Original Mazesoba with perfectly balanced flavours.", tags: ["Japanese", "Mazesoba"], rating: 4.4, price_low: 10, price_high: 16, source_id: "editors-choice" },
  { name: "Le Shrimp Ramen", lat: 1.3034, lng: 103.8316, station_id: "tanjong-pagar", description: "Japanese ramen with Chinese prawn depth. Unique Long Jing tea lava egg.", tags: ["Japanese", "Ramen", "Fusion"], rating: 4.3, price_low: 14, price_high: 22, source_id: "editors-choice" },
  { name: "Ramen Hitoyoshi", lat: 1.3202, lng: 103.8269, station_id: "orchard", description: "By two ex-Keisuke chefs. Consistent quality across growing chain.", tags: ["Japanese", "Ramen", "Chain"], rating: 4.2, price_low: 12, price_high: 18, source_id: "editors-choice" },
  { name: "Ichikokudo", lat: 1.2937, lng: 103.8535, station_id: "city-hall", description: "Singapore's leading halal ramen chain. Slow-cooked chicken broth with bonito and mackerel.", tags: ["Japanese", "Ramen", "Halal"], rating: 4.1, price_low: 12, price_high: 18, source_id: "eatbook" },
  { name: "Tonkotsu Kazan", lat: 1.2937, lng: 103.8535, station_id: "city-hall", description: "Volcano ramen with dramatic steaming stone bowl presentation.", tags: ["Japanese", "Ramen", "Interactive"], rating: 4.2, price_low: 15, price_high: 25, source_id: "eatbook" },
  { name: "Gwangjang Gaon", lat: 1.3007, lng: 103.8546, station_id: "bugis", description: "By famous Korean celebrity chef Professor Hyo Soon Park. Lee Jung-jae approved.", tags: ["Korean", "Celebrity Chef"], rating: 4.3, price_low: 20, price_high: 40, source_id: "eatbook" },
  { name: "Curly's", lat: 1.2988, lng: 103.8102, station_id: "botanic-gardens", description: "8000sqft grocer-diner with organic ingredients and pet-friendly garden.", tags: ["Western", "Brunch", "Pet-Friendly"], rating: 4.2, price_low: 18, price_high: 40, source_id: "editors-choice" },
  { name: "Legendary Hong Kong", lat: 1.3524, lng: 103.9456, station_id: "tampines", description: "Hong Kong-style restaurant with 200+ items including dim sum and roast meats.", tags: ["Hong Kong", "Dim Sum", "Chinese"], rating: 4.3, price_low: 10, price_high: 30, source_id: "eatbook" },
  { name: "Alice Boulangerie Fine Crumbs", lat: 1.2937, lng: 103.8535, station_id: "city-hall", description: "New bakery concept with artisanal buns using Japanese breadmaking techniques.", tags: ["Bakery", "Japanese", "Cafe"], rating: 4.4, price_low: 5, price_high: 15, source_id: "editors-choice" },
  { name: "Yoajung", lat: 1.3006, lng: 103.8387, station_id: "somerset", description: "Korea's most popular frozen yoghurt chain with customizable toppings.", tags: ["Dessert", "Korean", "Frozen Yogurt"], rating: 4.1, price_low: 6, price_high: 12, source_id: "eatbook" },
  { name: "Apartment Coffee", lat: 1.3007, lng: 103.8546, station_id: "rochor", description: "6th place on World's Top 100 Coffee Shops 2025. Pour-overs with tasting notes.", tags: ["Cafe", "Coffee", "Award-Winning"], rating: 4.6, price_low: 6, price_high: 15, source_id: "eatbook" },
  { name: "DJDH Ramen", lat: 1.3070, lng: 103.9044, station_id: "marine-parade", description: "More than comforting ramen - full dining experience in Katong.", tags: ["Japanese", "Ramen", "Katong"], rating: 4.3, price_low: 14, price_high: 22, source_id: "editors-choice" },
  { name: "Koung's Wan Tan Mee", lat: 1.3022, lng: 103.7650, station_id: "clementi", description: "Renowned wanton mee at new Hawkers' Street Clementi.", tags: ["Hawker", "Wanton Mee"], rating: 4.2, price_low: 4, price_high: 8, source_id: "sethlui" },
  { name: "HJH Maimunah Mini", lat: 1.3022, lng: 103.7650, station_id: "clementi", description: "Mini version of famous Hjh Maimunah at Clementi Mall food court.", tags: ["Hawker", "Malay", "Halal"], rating: 4.4, price_low: 6, price_high: 12, source_id: "sethlui" },
  { name: "Ci Yuan HK Wanton Noodle", lat: 1.3706, lng: 103.8922, station_id: "hougang", description: "Tasty wanton mee at Singapore's only hawker centre in community club.", tags: ["Hawker", "Wanton Mee"], rating: 4.2, price_low: 4, price_high: 7, source_id: "sethlui" },
  { name: "Shu Xiang Kitchen", lat: 1.3706, lng: 103.8922, station_id: "hougang", description: "Chinese dumplings and noodles haven at Ci Yuan. XLB for $5.", tags: ["Hawker", "Chinese", "Dumplings"], rating: 4.1, price_low: 5, price_high: 10, source_id: "sethlui" },
];

// Convert price range to display format
function formatPriceRange(low: number, high: number): string {
  if (low === high) {
    return `$${low}`;
  }
  return `$${low}-$${high}`;
}

async function main() {
  console.log('🚀 Starting restaurant import with prices...\n');

  // Get all stations from database
  const { data: stations, error: stationsError } = await supabase
    .from('stations')
    .select('id, lat, lng');

  if (stationsError || !stations) {
    console.error('❌ Failed to fetch stations:', stationsError);
    return;
  }

  const stationMap = new Map(stations.map(s => [s.id, { lat: s.lat, lng: s.lng }]));
  console.log(`📍 Loaded ${stations.length} stations\n`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const r of restaurants) {
    console.log(`\n📍 Processing: ${r.name}`);

    // Check if already exists
    const { data: existing } = await supabase
      .from('food_listings')
      .select('id')
      .ilike('name', r.name)
      .single();

    if (existing) {
      console.log(`  ⏭️ Already exists`);
      skipped++;
      continue;
    }

    // Get walking distance from OneMap
    const station = stationMap.get(r.station_id);
    let walkingDistance = 500;
    let walkingTime = 6;

    if (station?.lat && station?.lng) {
      try {
        const result = await getWalkingDistance(station.lat, station.lng, r.lat, r.lng);
        if (result.success) {
          walkingDistance = result.distance;
          walkingTime = Math.max(1, result.duration);
          console.log(`  ✅ OneMap: ${walkingDistance}m, ${walkingTime} min`);
        } else {
          // Use haversine fallback
          walkingDistance = Math.round(haversineDistance(station.lat, station.lng, r.lat, r.lng));
          walkingTime = Math.max(1, Math.round(walkingDistance / 80));
          console.log(`  ⚠️ Fallback: ${walkingDistance}m, ${walkingTime} min`);
        }
        // Rate limit - 200ms between calls
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err) {
        walkingDistance = Math.round(haversineDistance(station.lat, station.lng, r.lat, r.lng));
        walkingTime = Math.max(1, Math.round(walkingDistance / 80));
        console.log(`  ⚠️ Error, using fallback: ${walkingDistance}m, ${walkingTime} min`);
      }
    }

    // Format price range
    const priceRange = formatPriceRange(r.price_low, r.price_high);

    // Prepare listing
    const listing = {
      name: r.name,
      description: r.description,
      station_id: r.station_id,
      lat: r.lat,
      lng: r.lng,
      rating: r.rating,
      source_id: r.source_id,
      tags: r.tags,
      distance_to_station: walkingDistance,
      walking_time: walkingTime,
      price_range: priceRange,
      is_active: true,
      is_24h: r.tags.some(t => t.toLowerCase().includes('24-hour') || t.toLowerCase().includes('supper')),
    };

    // Insert
    const { error: insertError } = await supabase
      .from('food_listings')
      .insert(listing);

    if (insertError) {
      console.log(`  ❌ Insert failed: ${insertError.message}`);
      failed++;
    } else {
      console.log(`  ✅ Imported: ${r.name} (${priceRange})`);
      imported++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`📊 Import Summary:`);
  console.log(`   ✅ Imported: ${imported}`);
  console.log(`   ⏭️ Skipped: ${skipped}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log('='.repeat(50));
}

main().catch(console.error);
