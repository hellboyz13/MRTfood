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
  'Eatbook': 'eatbook',
  'SetLui': 'sethlui',
  'DanielFoodDiary': 'danielfooddiary',
  'HungryGoWhere': 'hungrygowhere',
  'Michelin Guide': 'michelin-hawker',
  'MissTamChiak': 'misstamchiak',
  'Makansutra': 'editors-choice',
  'Local Guide': 'editors-choice',
  'OrdinaryPatrons': 'editors-choice',
  'NickBlitzz': 'editors-choice',
  'MustShareNews': 'editors-choice',
  'HillV2 Directory': 'editors-choice',
  'KAP Directory': 'editors-choice',
  'Lemon8': 'editors-choice',
  'The Living Cafe': 'editors-choice',
  'Newton FC': 'editors-choice',
  'Gardens by the Bay': 'editors-choice',
  'Singapore Savvy': 'editors-choice',
  'Roots.gov.sg': 'editors-choice',
};

// Cuisine to tags mapping
function cuisineToTags(cuisine) {
  const tags = [];
  const c = cuisine.toLowerCase();

  if (c.includes('chinese')) tags.push('Chinese');
  if (c.includes('local')) tags.push('Local', 'Hawker');
  if (c.includes('malay')) tags.push('Malay', 'Halal');
  if (c.includes('indian')) tags.push('Indian');
  if (c.includes('western')) tags.push('Western');
  if (c.includes('thai')) tags.push('Thai');
  if (c.includes('japanese')) tags.push('Japanese');
  if (c.includes('korean')) tags.push('Korean');
  if (c.includes('vietnamese')) tags.push('Vietnamese');
  if (c.includes('indonesian')) tags.push('Indonesian');
  if (c.includes('italian')) tags.push('Italian');
  if (c.includes('french')) tags.push('French');
  if (c.includes('american')) tags.push('American');
  if (c.includes('fusion')) tags.push('Fusion');
  if (c.includes('seafood')) tags.push('Seafood');
  if (c.includes('dessert')) tags.push('Dessert');
  if (c.includes('dim sum')) tags.push('Dim Sum', 'Chinese');
  if (c.includes('hakka')) tags.push('Hakka', 'Chinese');
  if (c.includes('various')) tags.push('Food Court', 'Various');
  if (c.includes('teochew')) tags.push('Teochew', 'Chinese');
  if (c.includes('hong kong')) tags.push('Hong Kong', 'Chinese');
  if (c.includes('hainanese')) tags.push('Hainanese', 'Chinese');
  if (c.includes('peranakan')) tags.push('Peranakan');
  if (c.includes('cafe')) tags.push('Cafe');
  if (c.includes('bakery')) tags.push('Bakery');
  if (c.includes('vegetarian')) tags.push('Vegetarian');
  if (c.includes('hawker')) tags.push('Hawker');
  if (c.includes('european')) tags.push('European', 'Fine Dining');
  if (c.includes('asian fusion')) tags.push('Asian', 'Fusion');

  return tags.length > 0 ? tags : ['Hawker'];
}

// Blue Line (DTL) restaurants from CSV
const restaurants = [
  { name: "Tai Wah Pork Noodle (Bukit Panjang)", cuisine: "Chinese", price: 9, address: "Bukit Panjang Plaza #03-08, 1 Jelebu Road", lat: 1.378, lng: 103.7621, source: "Eatbook" },
  { name: "You Xiang Teochew Noodles", cuisine: "Teochew", price: 2.7, address: "Bukit Panjang Hawker Centre #01-13", lat: 1.3775, lng: 103.7619, source: "SetLui" },
  { name: "Zai Lai Lor Mee", cuisine: "Chinese", price: 2.7, address: "Bukit Panjang Hawker Centre", lat: 1.3775, lng: 103.7619, source: "Eatbook" },
  { name: "Hai Nan Hometown Curry", cuisine: "Hainanese", price: 6, address: "Bukit Panjang Hawker Centre", lat: 1.3775, lng: 103.7619, source: "SetLui" },
  { name: "Project Penyek", cuisine: "Indonesian", price: 6, address: "Senja Hawker Centre #02-17", lat: 1.3827, lng: 103.7626, source: "SetLui" },
  { name: "Munchi Pancakes (Senja)", cuisine: "Local", price: 1.5, address: "Senja Hawker Centre #02-23", lat: 1.3827, lng: 103.7626, source: "Eatbook" },
  { name: "Onigirazu Don", cuisine: "Japanese", price: 3.5, address: "Senja Hawker Centre #02-04", lat: 1.3827, lng: 103.7626, source: "Eatbook" },
  { name: "Pin Wei Hong Kong Style CCF (Senja)", cuisine: "Hong Kong", price: 5, address: "Senja Hawker Centre #02-27", lat: 1.3827, lng: 103.7626, source: "Eatbook" },
  { name: "The Art @ APS", cuisine: "Western", price: 15, address: "Assumption Pathway School, Cashew Road", lat: 1.3691, lng: 103.761, source: "Local Guide" },
  { name: "iO Italian Osteria", cuisine: "Italian", price: 28, address: "HillV2 #02-01, 4 Hillview Rise", lat: 1.3628, lng: 103.7673, source: "DanielFoodDiary" },
  { name: "Tandoori Culture", cuisine: "Indian", price: 16.9, address: "HillV2 #02-03, 4 Hillview Rise", lat: 1.3628, lng: 103.7673, source: "Eatbook" },
  { name: "Kinsa Sushi", cuisine: "Japanese", price: 24.8, address: "HillV2 #02-02, 4 Hillview Rise", lat: 1.3628, lng: 103.7673, source: "Eatbook" },
  { name: "Galbiati Gourmet Deli", cuisine: "Italian", price: 12, address: "Rail Mall, 398 Upper Bukit Timah Road", lat: 1.3592, lng: 103.7633, source: "DanielFoodDiary" },
  { name: "Jiak", cuisine: "Local", price: 5, address: "HillV2 Mall", lat: 1.3628, lng: 103.7673, source: "HillV2 Directory" },
  { name: "Sin Chew Satay Bee Hoon", cuisine: "Local", price: 5, address: "Bukit Timah Market #01-037, 2A Jln Seh Chuan", lat: 1.3402, lng: 103.7765, source: "Eatbook" },
  { name: "Seng Heng Hainanese Chicken Rice", cuisine: "Hainanese", price: 4, address: "Bukit Timah Market #01-049", lat: 1.3402, lng: 103.7765, source: "Eatbook" },
  { name: "Top 1 Home Made Noodle", cuisine: "Chinese", price: 5, address: "Beauty World Centre #04-44", lat: 1.3396, lng: 103.7759, source: "HungryGoWhere" },
  { name: "Big Boys Western", cuisine: "Western", price: 10.4, address: "Beauty World Food Centre #04-25", lat: 1.3396, lng: 103.7759, source: "HungryGoWhere" },
  { name: "Ye Tang Chendol", cuisine: "Dessert", price: 2.2, address: "Beauty World Centre #04-26", lat: 1.3396, lng: 103.7759, source: "HungryGoWhere" },
  { name: "Bosong Rice Cake", cuisine: "Korean", price: 5, address: "Beauty World Plaza #02-04", lat: 1.3399, lng: 103.7756, source: "Eatbook" },
  { name: "Mong Kok Dim Sum", cuisine: "Dim Sum", price: 4.5, address: "Beauty World area", lat: 1.3396, lng: 103.7759, source: "Eatbook" },
  { name: "Nonya Delicatessen", cuisine: "Peranakan", price: 8.5, address: "Bukit Timah Plaza #B1-K69", lat: 1.3399, lng: 103.7756, source: "Makansutra" },
  { name: "EagleWings Loft", cuisine: "Western", price: 38, address: "KAP Mall, 9 King Albert Park", lat: 1.3358, lng: 103.7831, source: "Eatbook" },
  { name: "Carl's Jr (KAP)", cuisine: "American", price: 12, address: "KAP Mall", lat: 1.3358, lng: 103.7831, source: "KAP Directory" },
  { name: "Yeast Side", cuisine: "Cafe", price: 8, address: "KAP area", lat: 1.3358, lng: 103.7831, source: "Lemon8" },
  { name: "The Tea Party Cafe", cuisine: "Western", price: 16, address: "Sixth Avenue Centre #01-07, 805 Bukit Timah Road", lat: 1.3307, lng: 103.7964, source: "DanielFoodDiary" },
  { name: "Amano Italian Ristorante", cuisine: "Italian", price: 22, address: "Namly Place", lat: 1.3289, lng: 103.7919, source: "NickBlitzz" },
  { name: "Patisserie Woo", cuisine: "French", price: 9, address: "Guthrie House #01-01, 1 Fifth Ave", lat: 1.3311, lng: 103.7973, source: "NickBlitzz" },
  { name: "Lazy Lizard", cuisine: "Western", price: 18, address: "Sixth Avenue", lat: 1.3307, lng: 103.7964, source: "NickBlitzz" },
  { name: "The Living Cafe", cuisine: "Vegetarian", price: 15, address: "779 Bukit Timah Road", lat: 1.3303, lng: 103.7958, source: "The Living Cafe" },
  { name: "Selera Rasa Nasi Lemak", cuisine: "Malay", price: 7, address: "Adam Road Food Centre #01-02", lat: 1.3247, lng: 103.8137, source: "Michelin Guide" },
  { name: "Warong Pak Sapari", cuisine: "Malay", price: 4.5, address: "Adam Road Food Centre #01-09", lat: 1.3247, lng: 103.8137, source: "Michelin Guide" },
  { name: "Adam's Indian Rojak", cuisine: "Indian", price: 5, address: "Adam Road Food Centre", lat: 1.3247, lng: 103.8137, source: "MissTamChiak" },
  { name: "No.1 Adam's Nasi Lemak", cuisine: "Malay", price: 5, address: "Adam Road Food Centre #01-01", lat: 1.3247, lng: 103.8137, source: "DanielFoodDiary" },
  { name: "The Halia", cuisine: "Asian Fusion", price: 30, address: "Singapore Botanic Gardens, Ginger Garden", lat: 1.3137, lng: 103.8156, source: "Eatbook" },
  { name: "Prairie by Craftsmen", cuisine: "Cafe", price: 22, address: "Cluny Court", lat: 1.3186, lng: 103.8128, source: "OrdinaryPatrons" },
  { name: "Bee's Knees", cuisine: "Cafe", price: 18, address: "Singapore Botanic Gardens, The Garage", lat: 1.3149, lng: 103.815, source: "OrdinaryPatrons" },
  { name: "Simply Bread", cuisine: "Bakery", price: 3, address: "Cluny Court area", lat: 1.3186, lng: 103.8128, source: "Eatbook" },
  { name: "Sprouts Food Place", cuisine: "Hawker", price: 0.6, address: "Singapore Botanic Gardens, near Raffles Building", lat: 1.3145, lng: 103.8148, source: "MustShareNews" },
  { name: "TK Satay", cuisine: "Malay", price: 0.8, address: "Newton Food Centre", lat: 1.312, lng: 103.8396, source: "SetLui" },
  { name: "Soon Wah Fishball", cuisine: "Chinese", price: 4, address: "Newton Food Centre #01-27", lat: 1.312, lng: 103.8396, source: "Newton FC" },
  { name: "Taste Good", cuisine: "Chinese", price: 5, address: "Sim Lim Square #02-10", lat: 1.303, lng: 103.854, source: "SetLui" },
  { name: "Bugis Street Food", cuisine: "Various", price: 5, address: "Bugis Street", lat: 1.2994, lng: 103.8552, source: "Eatbook" },
  { name: "Jurassic Nest Food Hall", cuisine: "Various", price: 6, address: "Gardens by the Bay", lat: 1.2816, lng: 103.8636, source: "Gardens by the Bay" },
  { name: "Yuan Chun Famous Lor Mee", cuisine: "Chinese", price: 4, address: "Amoy Street Food Centre", lat: 1.2816, lng: 103.847, source: "Michelin Guide" },
  { name: "Hong Kee Beef Noodle", cuisine: "Chinese", price: 6, address: "Amoy Street Food Centre", lat: 1.2816, lng: 103.847, source: "HungryGoWhere" },
  { name: "Petite Krumbs", cuisine: "French", price: 3.5, address: "Amoy Street Food Centre", lat: 1.2816, lng: 103.847, source: "HungryGoWhere" },
  { name: "Flutes at Fort Canning", cuisine: "European", price: 80, address: "Fort Canning Centre", lat: 1.293, lng: 103.8463, source: "Local Guide" },
  { name: "Food Republic (Bugis Junction)", cuisine: "Various", price: 8, address: "Bugis Junction", lat: 1.299, lng: 103.8547, source: "Local Guide" },
  { name: "Geylang Bahru Market", cuisine: "Various", price: 4, address: "Geylang Bahru Market, 69 Geylang Bahru", lat: 1.3217, lng: 103.8716, source: "Eatbook" },
  { name: "Circuit Road Hawker Centre", cuisine: "Various", price: 4, address: "Circuit Road area", lat: 1.3265, lng: 103.8838, source: "Local Guide" },
  { name: "Tai Thong Crescent Food", cuisine: "Various", price: 5, address: "MacPherson area", lat: 1.3268, lng: 103.8873, source: "Local Guide" },
  { name: "Eunos Crescent Market", cuisine: "Various", price: 3.5, address: "Eunos area", lat: 1.3256, lng: 103.8997, source: "Local Guide" },
  { name: "Kaki Bukit 511 Market", cuisine: "Various", price: 4, address: "Kaki Bukit 511 Market", lat: 1.3349, lng: 103.9049, source: "Local Guide" },
  { name: "Blk 511 Bedok North Food", cuisine: "Various", price: 5, address: "Bedok North area", lat: 1.3346, lng: 103.918, source: "Local Guide" },
  { name: "Bedok Reservoir Food Centre", cuisine: "Various", price: 4, address: "Bedok Reservoir Road", lat: 1.3373, lng: 103.9325, source: "Local Guide" },
  { name: "Our Tampines Hub Hawker", cuisine: "Various", price: 4, address: "Our Tampines Hub", lat: 1.3535, lng: 103.9393, source: "Eatbook" },
  { name: "Tampines Round Market", cuisine: "Various", price: 4, address: "Tampines Round Market, 137 Tampines St 11", lat: 1.3558, lng: 103.9456, source: "Roots.gov.sg" },
  { name: "Al Mahboob Indian Rojak", cuisine: "Indian", price: 5, address: "NTUC Income @ Tampines Junction #01-02", lat: 1.352, lng: 103.944, source: "Eatbook" },
  { name: "Tampines Mall Food Court", cuisine: "Various", price: 6, address: "Tampines Mall", lat: 1.3524, lng: 103.9448, source: "Local Guide" },
  { name: "Changi Village Hawker Centre", cuisine: "Various", price: 4, address: "Changi Village Hawker Centre, 2 Changi Village Road", lat: 1.3895, lng: 103.9879, source: "Eatbook" },
  { name: "Expo Food Court", cuisine: "Various", price: 6, address: "Singapore Expo", lat: 1.3352, lng: 103.9616, source: "Local Guide" },
];

async function importRestaurants() {
  // Get all stations
  const { data: stations } = await supabase
    .from('stations')
    .select('id, name, lat, lng')
    .not('lat', 'is', null)
    .not('lng', 'is', null);

  console.log(`Loaded ${stations.length} stations\n`);
  console.log('=== IMPORTING BLUE LINE (DTL) RESTAURANTS ===\n');

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

    // Skip if too far (>2.5km)
    if (minDistance > 2500) {
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

    // Get tags from cuisine
    const tags = cuisineToTags(restaurant.cuisine);

    // Insert listing
    const { data: newListing, error: insertError } = await supabase
      .from('food_listings')
      .insert({
        name: restaurant.name,
        station_id: nearestStation.id,
        address: restaurant.address,
        lat: restaurant.lat,
        lng: restaurant.lng,
        tags: tags,
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
        price: restaurant.price,
        description: `From $${restaurant.price}`,
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
