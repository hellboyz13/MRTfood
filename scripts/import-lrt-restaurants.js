const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Haversine distance in meters
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// OneMap API for walking distance
async function getWalkingDistance(startLat, startLng, endLat, endLng) {
  try {
    const url = `https://www.onemap.gov.sg/api/public/routingsvc/route?start=${startLat},${startLng}&end=${endLat},${endLng}&routeType=walk`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.route_summary) {
      return {
        distance: Math.round(data.route_summary.total_distance),
        time: Math.round(data.route_summary.total_time / 60)
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Source name to ID mapping
const sourceNameToId = {
  'Seth Lui': 'sethlui',
  'EatBook': 'eatbook',
  'danielfooddiary': 'danielfooddiary',
  'Time Out Singapore 2025': 'timeout-2025',
  'HungryGoWhere': 'hungrygowhere',
  'Miss Tam Chiak': 'misstamchiak',
  'Burpple': 'burpple',
  'Honeycombers': 'honeycombers',
};

// LRT restaurants from CSV
const restaurants = [
  { name: "Hai Xian Zhu Zhou (Ke Kou Mian)", address: "259 Bukit Panjang Ring Rd, #01-36, Singapore 670259", lat: 1.3805, lng: 103.7632, source: "Seth Lui", tags: ["Hawker", "Noodles"], price_low: 3.5, price_high: 5 },
  { name: "Zheng Wei Braised Duck Noodle", address: "257 Bangkit Road, Bangkit 257 Coffee House, Singapore 670257", lat: 1.3798, lng: 103.7689, source: "Seth Lui", tags: ["Hawker", "Braised Duck", "Noodles"], price_low: 4, price_high: 5 },
  { name: "Tongue Tip Lanzhou Beef Noodles", address: "17 Petir Road, #01-07, Hillion Mall, Singapore 678278", lat: 1.3779, lng: 103.7637, source: "EatBook", tags: ["Restaurant", "Halal", "Beef Noodles", "Chinese"], price_low: 12, price_high: 15 },
  { name: "Pin Wei Hong Kong Style Chee Cheong Fun (BP)", address: "2 Senja Close, #02-27, Senja Hawker Centre, Singapore 677632", lat: 1.3842, lng: 103.7618, source: "EatBook", tags: ["Hawker", "Chee Cheong Fun", "Michelin Bib Gourmand"], price_low: 3, price_high: 6 },
  { name: "Heng Gi Goose and Duck Rice (Senja)", address: "2 Senja Close, #02-07, Senja Hawker Centre, Singapore 677632", lat: 1.3842, lng: 103.7618, source: "danielfooddiary", tags: ["Hawker", "Braised Duck", "Michelin Plate"], price_low: 4, price_high: 6 },
  { name: "Amoy Street Lor Mee (Senja)", address: "2 Senja Close, #02-01, Senja Hawker Centre, Singapore 677632", lat: 1.3842, lng: 103.7618, source: "Time Out Singapore 2025", tags: ["Hawker", "Lor Mee", "Heritage"], price_low: 4, price_high: 6 },
  { name: "97 Nasi Lemak (Senja)", address: "2 Senja Close, #02-03, Senja Hawker Centre, Singapore 677632", lat: 1.3842, lng: 103.7618, source: "HungryGoWhere", tags: ["Hawker", "Halal", "Nasi Lemak"], price_low: 3.2, price_high: 3.5 },
  { name: "Project Penyek by Ansar", address: "2 Senja Close, #02-17, Senja Hawker Centre, Singapore 677632", lat: 1.3842, lng: 103.7618, source: "EatBook", tags: ["Hawker", "Halal", "Ayam Penyet", "Indonesian"], price_low: 6, price_high: 8 },
  { name: "Shi Nian Braised Pork Trotter", address: "2 Senja Close, #02-11, Senja Hawker Centre, Singapore 677632", lat: 1.3842, lng: 103.7618, source: "Seth Lui", tags: ["Hawker", "Pig Trotter", "Braised"], price_low: 5.9, price_high: 18 },
  { name: "Jiao Cai Seafood", address: "2 Senja Close, #02-14, Senja Hawker Centre, Singapore 677632", lat: 1.3842, lng: 103.7618, source: "Time Out Singapore 2025", tags: ["Hawker", "Seafood", "Michelin Plate"], price_low: 5, price_high: 15 },
  { name: "China Whampoa Home Made Noodle (Senja)", address: "2 Senja Close, Senja Hawker Centre, Singapore 677632", lat: 1.3842, lng: 103.7618, source: "Seth Lui", tags: ["Hawker", "Ban Mian", "Noodles"], price_low: 5, price_high: 14 },
  { name: "Fiordilatte Gelateria Artigianale", address: "Senja Heights, Bukit Panjang, Singapore", lat: 1.381, lng: 103.765, source: "Seth Lui", tags: ["Cafe", "Gelato", "Dessert", "Italian"], price_low: 4.5, price_high: 10 },
  { name: "Whitley Road Big Prawn Noodle (Fernvale)", address: "21 Sengkang West Avenue, #03-09, Fernvale Hawker Centre, Singapore 797650", lat: 1.392, lng: 103.8756, source: "EatBook", tags: ["Hawker", "Prawn Noodles"], price_low: 6, price_high: 8 },
  { name: "Seng Hiang Bak Chor Mee", address: "21 Sengkang West Avenue, #03-07, Fernvale Hawker Centre, Singapore 797650", lat: 1.392, lng: 103.8756, source: "danielfooddiary", tags: ["Hawker", "Bak Chor Mee"], price_low: 4.5, price_high: 5 },
  { name: "Xin Xin Claypot Rice", address: "21 Sengkang West Avenue, #03-13, Fernvale Hawker Centre, Singapore 797650", lat: 1.392, lng: 103.8756, source: "Miss Tam Chiak", tags: ["Hawker", "Claypot Rice"], price_low: 7.5, price_high: 10 },
  { name: "Hock Hai (Hong Lim) Curry Chicken Noodle (Fernvale)", address: "21 Sengkang West Avenue, Fernvale Hawker Centre, Singapore 797650", lat: 1.392, lng: 103.8756, source: "danielfooddiary", tags: ["Hawker", "Curry Chicken", "Michelin Bib Gourmand"], price_low: 3.5, price_high: 7.5 },
  { name: "Munchi Pancakes (Fernvale)", address: "21 Sengkang West Avenue, #03-04, Fernvale Hawker Centre, Singapore 797650", lat: 1.392, lng: 103.8756, source: "EatBook", tags: ["Hawker", "Halal", "Min Jiang Kueh", "Dessert"], price_low: 1.5, price_high: 2.5 },
  { name: "China Whampoa Home Made Noodle (Fernvale)", address: "21 Sengkang West Avenue, #03-24, Fernvale Hawker Centre, Singapore 797650", lat: 1.392, lng: 103.8756, source: "danielfooddiary", tags: ["Hawker", "Ban Mian", "Noodles"], price_low: 5, price_high: 14 },
  { name: "Song Zhou Carrot Cake", address: "21 Sengkang West Avenue, Fernvale Hawker Centre, Singapore 797650", lat: 1.392, lng: 103.8756, source: "Seth Lui", tags: ["Hawker", "Carrot Cake"], price_low: 4, price_high: 6 },
  { name: "Ah Er Soup (Fernvale)", address: "21 Sengkang West Avenue, #03-26, Fernvale Hawker Centre, Singapore 797650", lat: 1.392, lng: 103.8756, source: "HungryGoWhere", tags: ["Hawker", "Soup", "Michelin Bib Gourmand"], price_low: 5, price_high: 9 },
  { name: "Greentea Rice (Lei Cha)", address: "21 Sengkang West Avenue, #03-18, Fernvale Hawker Centre, Singapore 797650", lat: 1.392, lng: 103.8756, source: "EatBook", tags: ["Hawker", "Halal", "Thunder Tea Rice", "Healthy"], price_low: 5.9, price_high: 6.9 },
  { name: "Saudagar Penyek", address: "21 Sengkang West Avenue, #03-21, Fernvale Hawker Centre, Singapore 797650", lat: 1.392, lng: 103.8756, source: "EatBook", tags: ["Hawker", "Halal", "Ayam Penyet", "Indonesian"], price_low: 3, price_high: 6 },
  { name: "Umi's Spices", address: "21 Sengkang West Avenue, #03-16, Fernvale Hawker Centre, Singapore 797650", lat: 1.392, lng: 103.8756, source: "Seth Lui", tags: ["Hawker", "Halal", "Nasi Padang", "Malay"], price_low: 3.2, price_high: 7.8 },
  { name: "Feng Xiang Bak Kut Teh", address: "21 Sengkang West Avenue, Fernvale Hawker Centre, Singapore 797650", lat: 1.392, lng: 103.8756, source: "Burpple", tags: ["Hawker", "Bak Kut Teh"], price_low: 6, price_high: 10 },
  { name: "Tong Fong Fatt Hainanese Boneless Chicken Rice", address: "21 Sengkang West Avenue, #03-25, Fernvale Hawker Centre, Singapore 797650", lat: 1.392, lng: 103.8756, source: "EatBook", tags: ["Hawker", "Chicken Rice"], price_low: 4, price_high: 5 },
  { name: "Kopitiam Square", address: "10 Sengkang Square, Singapore 544829", lat: 1.3917, lng: 103.8953, source: "Seth Lui", tags: ["Food Court", "24 Hours"], price_low: 3, price_high: 15 },
  { name: "King of Fried Rice (Sengkang)", address: "10 Sengkang Square, #01-48, Kopitiam Square, Singapore 544829", lat: 1.3917, lng: 103.8953, source: "Seth Lui", tags: ["Hawker", "Fried Rice"], price_low: 4, price_high: 6.5 },
  { name: "Old Bugis Kway Chap", address: "10 Sengkang Square, #01-38, Kopitiam Square, Singapore 544829", lat: 1.3917, lng: 103.8953, source: "EatBook", tags: ["Hawker", "Kway Chap", "Heritage"], price_low: 5, price_high: 8 },
  { name: "Sengkang Square Oyster Omelette", address: "10 Sengkang Square, Kopitiam Square, Singapore 544829", lat: 1.3917, lng: 103.8953, source: "Seth Lui", tags: ["Hawker", "Halal", "Oyster Omelette"], price_low: 6, price_high: 8 },
  { name: "Thohirah Restaurant", address: "258 Jalan Kayu, Singapore 799487", lat: 1.4024, lng: 103.8742, source: "Burpple", tags: ["Restaurant", "Halal", "Indian Muslim", "Supper"], price_low: 5, price_high: 15 },
  { name: "Nakhon Kitchen (Compass One)", address: "1 Sengkang Square, #02-30, Compass One, Singapore 545078", lat: 1.3918, lng: 103.8954, source: "Seth Lui", tags: ["Restaurant", "Thai"], price_low: 5, price_high: 12 },
  { name: "Teck Ee Seafood", address: "277C Compassvale Link, #01-13, Singapore 543277", lat: 1.3898, lng: 103.8944, source: "Seth Lui", tags: ["Zi Char", "Seafood"], price_low: 24, price_high: 38 },
  { name: "No. 25 Minced Meat Noodle", address: "1 Punggol Drive, #02-28, One Punggol Hawker Centre, Singapore 828629", lat: 1.4053, lng: 103.9025, source: "EatBook", tags: ["Hawker", "Bak Chor Mee"], price_low: 4, price_high: 12 },
  { name: "Souperb!", address: "1 Punggol Drive, One Punggol Hawker Centre, Singapore 828629", lat: 1.4053, lng: 103.9025, source: "EatBook", tags: ["Hawker", "Steamed Food", "Soup"], price_low: 4, price_high: 5 },
  { name: "Lim Bo Rojak", address: "1 Punggol Drive, #02-11, One Punggol Hawker Centre, Singapore 828629", lat: 1.4053, lng: 103.9025, source: "EatBook", tags: ["Hawker", "Rojak", "Penang"], price_low: 5.5, price_high: 12 },
  { name: "75 Ah Balling Peanut Soup", address: "1 Punggol Drive, One Punggol Hawker Centre, Singapore 828629", lat: 1.4053, lng: 103.9025, source: "Seth Lui", tags: ["Hawker", "Dessert", "Tang Yuan"], price_low: 2.4, price_high: 3.2 },
  { name: "Uncle Penyet", address: "1 Punggol Drive, #02-01, One Punggol Hawker Centre, Singapore 828629", lat: 1.4053, lng: 103.9025, source: "EatBook", tags: ["Hawker", "Halal", "Ayam Penyet"], price_low: 3.9, price_high: 8 },
  { name: "Botak Cantonese Porridge", address: "1 Punggol Drive, #02-14, One Punggol Hawker Centre, Singapore 828629", lat: 1.4053, lng: 103.9025, source: "Seth Lui", tags: ["Hawker", "Porridge", "Cantonese"], price_low: 4, price_high: 7 },
  { name: "Kwang Kee Teochew Fish Porridge (Punggol)", address: "1 Punggol Drive, One Punggol Hawker Centre, Singapore 828629", lat: 1.4053, lng: 103.9025, source: "Seth Lui", tags: ["Hawker", "Fish Porridge", "Michelin Bib Gourmand"], price_low: 5, price_high: 10 },
  { name: "Timbre Pizza", address: "1 Punggol Drive, One Punggol Hawker Centre, Singapore 828629", lat: 1.4053, lng: 103.9025, source: "Seth Lui", tags: ["Hawker", "Pizza", "Western"], price_low: 9.8, price_high: 17.8 },
  { name: "Hakka Leipopo (Punggol)", address: "1 Punggol Drive, One Punggol Hawker Centre, Singapore 828629", lat: 1.4053, lng: 103.9025, source: "EatBook", tags: ["Hawker", "Thunder Tea Rice", "Healthy"], price_low: 5, price_high: 7.2 },
  { name: "Huay Kwang Thai Wanton Mee", address: "84 Punggol Way, #02-K58, Punggol Coast Hawker Centre, Singapore 829911", lat: 1.4105, lng: 103.9148, source: "Honeycombers", tags: ["Hawker", "Thai", "Wanton Mee"], price_low: 5, price_high: 7 },
  { name: "South Buona Vista Braised Duck (Punggol Coast)", address: "84 Punggol Way, #02-K59, Punggol Coast Hawker Centre, Singapore 829911", lat: 1.4105, lng: 103.9148, source: "Honeycombers", tags: ["Hawker", "Braised Duck"], price_low: 5, price_high: 7 },
  { name: "What The Puff! (Punggol Coast)", address: "84 Punggol Way, Punggol Coast Hawker Centre, Singapore 829911", lat: 1.4105, lng: 103.9148, source: "Seth Lui", tags: ["Hawker", "Curry Puff", "Snacks"], price_low: 2, price_high: 2.5 },
  { name: "Hee Hee Steamed Fish (Punggol Coast)", address: "84 Punggol Way, #02-K55, Punggol Coast Hawker Centre, Singapore 829911", lat: 1.4105, lng: 103.9148, source: "Time Out Singapore 2025", tags: ["Hawker", "Steamed Fish", "Seafood"], price_low: 7, price_high: 10 },
  { name: "Xiang Chi Mian Traditional Bak Chor Mee", address: "84 Punggol Way, #02-K76, Punggol Coast Hawker Centre, Singapore 829911", lat: 1.4105, lng: 103.9148, source: "Seth Lui", tags: ["Hawker", "Bak Chor Mee"], price_low: 4.5, price_high: 5.8 },
  { name: "S.J Sickander Ammal Muslim Foods", address: "84 Punggol Way, #02-K5, Punggol Coast Hawker Centre, Singapore 829911", lat: 1.4105, lng: 103.9148, source: "Seth Lui", tags: ["Hawker", "Halal", "Prata", "Indian Muslim"], price_low: 2, price_high: 14.2 },
  { name: "You Fu Ban Mian & Pao Fan", address: "84 Punggol Way, Punggol Coast Hawker Centre, Singapore 829911", lat: 1.4105, lng: 103.9148, source: "Seth Lui", tags: ["Hawker", "Ban Mian", "Pao Fan"], price_low: 5, price_high: 8.8 },
  { name: "Jade's Chicken (Korean Fried Chicken)", address: "84 Punggol Way, Punggol Coast Hawker Centre, Singapore 829911", lat: 1.4105, lng: 103.9148, source: "Seth Lui", tags: ["Hawker", "Korean", "Fried Chicken"], price_low: 6, price_high: 7 },
  { name: "Whampoa Traditional Fried Oyster", address: "84 Punggol Way, #02-K56, Punggol Coast Hawker Centre, Singapore 829911", lat: 1.4105, lng: 103.9148, source: "Honeycombers", tags: ["Hawker", "Oyster Omelette"], price_low: 3.5, price_high: 8 },
  { name: "Dosa Delights", address: "84 Punggol Way, Punggol Coast Hawker Centre, Singapore 829911", lat: 1.4105, lng: 103.9148, source: "Honeycombers", tags: ["Hawker", "Vegetarian", "Indian", "Dosa"], price_low: 3, price_high: 6 },
  { name: "Kedai Salima", address: "84 Punggol Way, #02-K80, Punggol Coast Hawker Centre, Singapore 829911", lat: 1.4105, lng: 103.9148, source: "Honeycombers", tags: ["Hawker", "Halal", "Malay", "Mee Soto"], price_low: 3, price_high: 6 },
  { name: "Pin Wei Hong Kong Style Chee Cheong Fun (Punggol Coast)", address: "84 Punggol Way, Punggol Coast Hawker Centre, Singapore 829911", lat: 1.4105, lng: 103.9148, source: "Time Out Singapore 2025", tags: ["Hawker", "Chee Cheong Fun", "Michelin Selected"], price_low: 4, price_high: 6 },
];

async function importRestaurants() {
  // Get all stations
  const { data: stations } = await supabase
    .from('stations')
    .select('id, name, lat, lng')
    .not('lat', 'is', null)
    .not('lng', 'is', null);

  console.log(`Loaded ${stations.length} stations\n`);
  console.log('=== IMPORTING LRT RESTAURANTS ===\n');

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const restaurant of restaurants) {
    // Check if already exists
    const { data: existing } = await supabase
      .from('food_listings')
      .select('id')
      .eq('name', restaurant.name)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`Skipping (exists): ${restaurant.name}`);
      skipped++;
      continue;
    }

    // Find nearest station using haversine
    let nearestStation = null;
    let minDistance = Infinity;

    for (const station of stations) {
      const distance = haversineDistance(restaurant.lat, restaurant.lng, station.lat, station.lng);
      if (distance < minDistance) {
        minDistance = distance;
        nearestStation = station;
      }
    }

    if (!nearestStation) {
      console.log(`No station found for: ${restaurant.name}`);
      failed++;
      continue;
    }

    // Skip if too far (>2km)
    if (minDistance > 2000) {
      console.log(`Skipping (too far): ${restaurant.name} - ${Math.round(minDistance)}m from ${nearestStation.id}`);
      skipped++;
      continue;
    }

    // Get walking distance from OneMap
    const walkingData = await getWalkingDistance(
      restaurant.lat, restaurant.lng,
      nearestStation.lat, nearestStation.lng
    );

    const distanceToStation = walkingData ? walkingData.distance : Math.round(minDistance);
    const walkingTime = walkingData ? walkingData.time : Math.round(minDistance / 80);

    // Get source ID
    const sourceId = sourceNameToId[restaurant.source] || 'editors-choice';

    // Insert listing
    const { data: newListing, error: insertError } = await supabase
      .from('food_listings')
      .insert({
        name: restaurant.name,
        station_id: nearestStation.id,
        address: restaurant.address,
        lat: restaurant.lat,
        lng: restaurant.lng,
        tags: restaurant.tags,
        source_id: sourceId,
        distance_to_station: distanceToStation,
        walking_time: walkingTime
      })
      .select('id')
      .single();

    if (insertError) {
      console.log(`Error inserting ${restaurant.name}: ${insertError.message}`);
      failed++;
      continue;
    }

    // Insert price
    const { error: priceError } = await supabase
      .from('listing_prices')
      .insert({
        listing_id: newListing.id,
        item_name: 'Main',
        price: restaurant.price_low,
        description: `$${restaurant.price_low} - $${restaurant.price_high}`,
        is_signature: true,
        sort_order: 0
      });

    if (priceError) {
      console.log(`Error inserting price for ${restaurant.name}: ${priceError.message}`);
    }

    console.log(`✅ ${restaurant.name} -> ${nearestStation.id} (${distanceToStation}m, ${walkingTime} min)`);
    imported++;

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 100));
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Imported: ${imported}`);
  console.log(`Skipped (exists): ${skipped}`);
  console.log(`Failed: ${failed}`);

  // Get new total count
  const { count } = await supabase
    .from('food_listings')
    .select('*', { count: 'exact', head: true });

  console.log(`\nTotal listings in database: ${count}`);
}

importRestaurants().catch(console.error);
