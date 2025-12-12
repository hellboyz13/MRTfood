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
  'sethlui.com': 'sethlui',
  'eatbook.sg': 'eatbook',
  'timeout.com': 'timeout-2025',
  'tripadvisor.com.sg': 'tripadvisor',
  'tripadvisor.com': 'tripadvisor',
  'misstamchiak.com': 'misstamchiak',
  'hungrygowhere.com': 'hungrygowhere',
  'danielfooddiary.com': 'danielfooddiary',
  'foodadvisor.com.sg': 'foodadvisor',
  'womensweekly.com.sg': 'womensweekly',
  'thefatguide.com': 'thefatguide',
  'getgo.sg': 'getgo',
  'herworld.com': 'herworld',
  'burpple.com': 'burpple',
  'cheapandgood.sg': 'cheapandgood',
  'travelfish.org': 'travelfish',
  'yelp.com': 'yelp',
  'guide.michelin.com': 'michelin-hawker',
  'honeycombers.com': 'honeycombers',
  'monsterdaytours.com': 'editors-choice',
  'supasoya.com': 'editors-choice',
  'entersingapore.com': 'editors-choice',
  'nickblitzz.sg': 'editors-choice',
  'hawkerpedia.com.sg': 'editors-choice',
  'tidbitsmag.com': 'editors-choice',
  'singaporefoodie.com': 'editors-choice',
  'Various': 'editors-choice',
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
  if (c.includes('middle eastern')) tags.push('Middle Eastern', 'Halal');
  if (c.includes('italian')) tags.push('Italian');
  if (c.includes('mexican')) tags.push('Mexican');
  if (c.includes('fusion')) tags.push('Fusion');
  if (c.includes('seafood')) tags.push('Seafood');
  if (c.includes('dessert')) tags.push('Dessert');
  if (c.includes('dim sum')) tags.push('Dim Sum', 'Chinese');
  if (c.includes('hakka')) tags.push('Hakka', 'Chinese');
  if (c.includes('various')) tags.push('Food Court', 'Various');
  if (c.includes('taiwanese')) tags.push('Taiwanese');
  if (c.includes('teochew')) tags.push('Teochew', 'Chinese');
  if (c.includes('hong kong')) tags.push('Hong Kong', 'Chinese');
  if (c.includes('hainanese')) tags.push('Hainanese', 'Chinese');
  if (c.includes('malaysian')) tags.push('Malaysian');
  if (c.includes('pakistani')) tags.push('Pakistani', 'Halal');

  return tags.length > 0 ? tags : ['Hawker'];
}

// Purple Line (NEL) restaurants from CSV
const restaurants = [
  { name: "Seah Im Food Centre", cuisine: "Various", price: 4.00, address: "2 Seah Im Road, Singapore 099114", lat: 1.2651, lng: 103.8222, source: "burpple.com" },
  { name: "Aspirasi Chicken Rice", cuisine: "Malay", price: 6.50, address: "2 Seah Im Road, #01-45, Seah Im Food Centre", lat: 1.2651, lng: 103.8222, source: "eatbook.sg" },
  { name: "Lor Mee Shi Ji Noodle Stall", cuisine: "Chinese", price: 5.00, address: "2 Seah Im Road, #01-56, Seah Im Food Centre", lat: 1.2651, lng: 103.8222, source: "burpple.com" },
  { name: "Farasha Muslim Food", cuisine: "Malay", price: 5.50, address: "2 Seah Im Road, Seah Im Food Centre", lat: 1.2651, lng: 103.8222, source: "eatbook.sg" },
  { name: "Food Republic VivoCity", cuisine: "Various", price: 8.00, address: "1 HarbourFront Walk, #03-01, VivoCity", lat: 1.2644, lng: 103.8221, source: "yelp.com" },
  { name: "Ya Hua Rou Gu Cha", cuisine: "Chinese", price: 7.00, address: "7 Keppel Road, #01-05/07, Tanjong Pagar Complex", lat: 1.2767, lng: 103.8424, source: "foodadvisor.com.sg" },
  { name: "Hong Kong Soya Sauce Chicken", cuisine: "Chinese", price: 3.50, address: "335 Smith Street, #02-126, Chinatown Complex", lat: 1.2829, lng: 103.8442, source: "guide.michelin.com" },
  { name: "Zhong Guo La Mian Xiao Long Bao", cuisine: "Chinese", price: 8.00, address: "335 Smith Street, #02-135, Chinatown Complex", lat: 1.2829, lng: 103.8442, source: "sethlui.com" },
  { name: "Old Amoy Chendol (Chinatown Complex)", cuisine: "Dessert", price: 2.50, address: "335 Smith Street, #02-156, Chinatown Complex", lat: 1.2829, lng: 103.8442, source: "monsterdaytours.com" },
  { name: "Zhu Zhu Zai", cuisine: "Taiwanese", price: 3.80, address: "335 Smith Street, Chinatown Complex", lat: 1.2829, lng: 103.8442, source: "sethlui.com" },
  { name: "Ann Chin Popiah", cuisine: "Local", price: 2.50, address: "335 Smith Street, Chinatown Complex", lat: 1.2829, lng: 103.8442, source: "supasoya.com" },
  { name: "Food Street Fried Kway Teow Mee", cuisine: "Chinese", price: 5.00, address: "335 Smith Street, Chinatown Complex Level 2", lat: 1.2829, lng: 103.8442, source: "guide.michelin.com" },
  { name: "Aziz Jaffar Muslim Food", cuisine: "Malay", price: 3.50, address: "335 Smith Street, #02-70, Chinatown Complex", lat: 1.2829, lng: 103.8442, source: "eatbook.sg" },
  { name: "Hong Lim Market & Food Centre", cuisine: "Various", price: 4.00, address: "531A Upper Cross Street", lat: 1.2856, lng: 103.8465, source: "burpple.com" },
  { name: "SG Hawker", cuisine: "Various", price: 5.00, address: "Clarke Quay Block E, #01-08", lat: 1.2888, lng: 103.8463, source: "danielfooddiary.com" },
  { name: "Nasi Lemak Ayam Taliwang", cuisine: "Indonesian", price: 6.20, address: "Clarke Quay Block E, #01-08, SG Hawker", lat: 1.2888, lng: 103.8463, source: "danielfooddiary.com" },
  { name: "Kallang Airport Wanton Mee", cuisine: "Chinese", price: 5.00, address: "Clarke Quay Block E, #01-08, SG Hawker", lat: 1.2888, lng: 103.8463, source: "sethlui.com" },
  { name: "Tekka Centre", cuisine: "Various", price: 4.00, address: "665 Buffalo Road", lat: 1.3065, lng: 103.851, source: "guide.michelin.com" },
  { name: "Allauddin's Briyani (Tekka)", cuisine: "Indian", price: 7.00, address: "665 Buffalo Road, #01-267, Tekka Centre", lat: 1.3065, lng: 103.851, source: "guide.michelin.com" },
  { name: "545 Whampoa Prawn Noodles (Tekka)", cuisine: "Chinese", price: 5.00, address: "665 Buffalo Road, #01-326, Tekka Centre", lat: 1.3065, lng: 103.851, source: "monsterdaytours.com" },
  { name: "Heng Gi Goose and Duck Rice", cuisine: "Teochew", price: 5.50, address: "665 Buffalo Road, #01-335, Tekka Centre", lat: 1.3065, lng: 103.851, source: "guide.michelin.com" },
  { name: "Imaroy Thai Food", cuisine: "Thai", price: 4.00, address: "665 Buffalo Road, #01-277, Tekka Centre", lat: 1.3065, lng: 103.851, source: "eatbook.sg" },
  { name: "Grandma Mee Siam", cuisine: "Local", price: 3.00, address: "665 Buffalo Road, Tekka Centre", lat: 1.3065, lng: 103.851, source: "sethlui.com" },
  { name: "Pek Kio Market & Food Centre", cuisine: "Various", price: 4.00, address: "41 Cambridge Road", lat: 1.3142, lng: 103.853, source: "honeycombers.com" },
  { name: "Wah Kee Big Prawn Noodles", cuisine: "Chinese", price: 6.00, address: "41A Cambridge Road, #01-15, Pek Kio Market", lat: 1.3142, lng: 103.853, source: "burpple.com" },
  { name: "Pin Wei Hong Kong Style Chee Cheong Fun", cuisine: "Hong Kong", price: 4.00, address: "41 Cambridge Road, Pek Kio Market", lat: 1.3142, lng: 103.853, source: "honeycombers.com" },
  { name: "Bendemeer Market & Food Centre", cuisine: "Various", price: 4.00, address: "29 Bendemeer Road", lat: 1.3155, lng: 103.863, source: "danielfooddiary.com" },
  { name: "Upper Boon Keng Market & Food Centre", cuisine: "Various", price: 5.00, address: "18 Upper Boon Keng Road", lat: 1.3112, lng: 103.8695, source: "tripadvisor.com" },
  { name: "Ah Hock Fried Hokkien Mee", cuisine: "Chinese", price: 5.00, address: "18 Upper Boon Keng Road, Upper Boon Keng Food Centre", lat: 1.3112, lng: 103.8695, source: "entersingapore.com" },
  { name: "River South (Hoe Nam) Prawn Noodle", cuisine: "Chinese", price: 6.00, address: "Tai Thong Crescent kopitiam", lat: 1.3315, lng: 103.868, source: "nickblitzz.sg" },
  { name: "Sweet Cheeks Gelato", cuisine: "Dessert", price: 5.00, address: "Potong Pasir area", lat: 1.3315, lng: 103.868, source: "danielfooddiary.com" },
  { name: "Woodleigh Village Hawker Centre", cuisine: "Various", price: 5.00, address: "Bidadari estate", lat: 1.339, lng: 103.8708, source: "timeout.com" },
  { name: "NEX Food Junction", cuisine: "Various", price: 6.00, address: "23 Serangoon Central, #04-36/37, NEX", lat: 1.3505, lng: 103.8718, source: "eatbook.sg" },
  { name: "Chomp Chomp Food Centre", cuisine: "Various", price: 8.00, address: "20 Kensington Park Road", lat: 1.3634, lng: 103.868, source: "timeout.com" },
  { name: "Penang Culture NEX", cuisine: "Malaysian", price: 10.90, address: "23 Serangoon Central, NEX", lat: 1.3505, lng: 103.8718, source: "sethlui.com" },
  { name: "The Hainan Story Coffee House", cuisine: "Hainanese", price: 10.80, address: "23 Serangoon Central, NEX", lat: 1.3505, lng: 103.8718, source: "sethlui.com" },
  { name: "Ah Seng Braised Duck Rice", cuisine: "Teochew", price: 5.00, address: "263 Serangoon Central Drive, #01-43", lat: 1.3521, lng: 103.8725, source: "misstamchiak.com" },
  { name: "Kovan 209 Market & Food Centre", cuisine: "Various", price: 4.00, address: "209 Hougang Street 21", lat: 1.3605, lng: 103.885, source: "sethlui.com" },
  { name: "Fatt Soon Kueh", cuisine: "Teochew", price: 1.00, address: "209 Hougang Street 21, #01-57, Kovan 209 Market", lat: 1.3605, lng: 103.885, source: "sethlui.com" },
  { name: "Davis Prawn Court", cuisine: "Chinese", price: 5.00, address: "209 Hougang Street 21, Kovan 209 Market", lat: 1.3605, lng: 103.885, source: "herworld.com" },
  { name: "Hajjah Mariam Muslim Food", cuisine: "Malay", price: 4.00, address: "209 Hougang Street 21, #01-53, Kovan 209 Market", lat: 1.3605, lng: 103.885, source: "womensweekly.com.sg" },
  { name: "Yong's Teochew Kueh", cuisine: "Teochew", price: 1.70, address: "1022 Upper Serangoon Road", lat: 1.361, lng: 103.8865, source: "eatbook.sg" },
  { name: "Hougang Hainanese Village Centre", cuisine: "Various", price: 4.00, address: "105 Hougang Avenue 1", lat: 1.3571, lng: 103.8831, source: "sethlui.com" },
  { name: "Lorong Ah Soo Lor Mee", cuisine: "Chinese", price: 5.00, address: "105 Hougang Ave 1, #02-51, Hainanese Village Centre", lat: 1.3571, lng: 103.8831, source: "sethlui.com" },
  { name: "Punggol Noodles", cuisine: "Chinese", price: 4.00, address: "105 Hougang Ave 1, #02-24, Hainanese Village Centre", lat: 1.3571, lng: 103.8831, source: "tidbitsmag.com" },
  { name: "He He Min Jiang Kueh", cuisine: "Local", price: 1.50, address: "105 Hougang Ave 1, Hainanese Village Centre", lat: 1.3571, lng: 103.8831, source: "tidbitsmag.com" },
  { name: "Buangkok Hawker Centre", cuisine: "Various", price: 4.00, address: "Buangkok area", lat: 1.3831, lng: 103.893, source: "foodadvisor.com.sg" },
  { name: "Fernvale Hawker Centre & Market", cuisine: "Various", price: 5.00, address: "21 Sengkang West Avenue", lat: 1.3916, lng: 103.876, source: "eatbook.sg" },
  { name: "JIN Kimchi Express", cuisine: "Korean", price: 6.00, address: "21 Sengkang West Ave, #03-22/35-38, Fernvale Hawker", lat: 1.3916, lng: 103.876, source: "eatbook.sg" },
  { name: "Anchorvale Village Hawker Centre", cuisine: "Various", price: 5.00, address: "Anchorvale Village", lat: 1.3975, lng: 103.8895, source: "sethlui.com" },
  { name: "One Punggol Hawker Centre", cuisine: "Various", price: 5.00, address: "1 Punggol Drive", lat: 1.4046, lng: 103.9027, source: "herworld.com" },
  { name: "Eng Kee Chicken Wings (One Punggol)", cuisine: "Local", price: 1.70, address: "1 Punggol Drive, #02-34, One Punggol Hawker", lat: 1.4046, lng: 103.9027, source: "herworld.com" },
  { name: "OBBA Jjajang Express", cuisine: "Korean", price: 6.80, address: "1 Punggol Drive, One Punggol Hawker", lat: 1.4046, lng: 103.9027, source: "herworld.com" },
  { name: "Rendang Nation", cuisine: "Malay", price: 4.00, address: "1 Punggol Drive, One Punggol Hawker", lat: 1.4046, lng: 103.9027, source: "herworld.com" },
  { name: "Punggol Coast Hawker Centre", cuisine: "Various", price: 5.00, address: "84 Punggol Way, #02-55", lat: 1.413, lng: 103.9095, source: "eatbook.sg" },
  { name: "Singapore Fried Hokkien Mee (Punggol Coast)", cuisine: "Chinese", price: 5.20, address: "84 Punggol Way, Punggol Coast Hawker Centre", lat: 1.413, lng: 103.9095, source: "timeout.com" },
  { name: "Hock Hai (Hong Lim) Curry Chicken", cuisine: "Chinese", price: 5.50, address: "84 Punggol Way, Punggol Coast Hawker Centre", lat: 1.413, lng: 103.9095, source: "sethlui.com" },
  { name: "Hee Hee Steamed Fish & Seafood", cuisine: "Chinese", price: 10.00, address: "84 Punggol Way, Punggol Coast Hawker Centre", lat: 1.413, lng: 103.9095, source: "timeout.com" },
  { name: "Pondok Makan Indonesia", cuisine: "Indonesian", price: 3.00, address: "270 Queen Street, #01-97, Albert Centre", lat: 1.3003, lng: 103.8545, source: "guide.michelin.com" },
  { name: "Bai Nian Niang Dou Fu", cuisine: "Chinese", price: 6.00, address: "270 Queen Street, #01-106, Albert Centre", lat: 1.3003, lng: 103.8545, source: "sethlui.com" },
  { name: "Singapore Famous Rojak", cuisine: "Local", price: 4.00, address: "270 Queen Street, Albert Centre", lat: 1.3003, lng: 103.8545, source: "singaporefoodie.com" },
  { name: "Hock Lee Fishball Noodles", cuisine: "Chinese", price: 4.00, address: "270 Queen Street, Albert Centre", lat: 1.3003, lng: 103.8545, source: "singaporefoodie.com" },
  { name: "Food Republic Plaza Singapura", cuisine: "Various", price: 8.00, address: "68 Orchard Road, Plaza Singapura", lat: 1.3006, lng: 103.8452, source: "yelp.com" },
  { name: "Takagi Ramen (Dhoby Ghaut)", cuisine: "Japanese", price: 10.00, address: "11 Orchard Road, #B1-11, Dhoby Ghaut MRT", lat: 1.2988, lng: 103.846, source: "foodadvisor.com.sg" },
];

async function importRestaurants() {
  // Get all stations
  const { data: stations } = await supabase
    .from('stations')
    .select('id, name, lat, lng')
    .not('lat', 'is', null)
    .not('lng', 'is', null);

  console.log(`Loaded ${stations.length} stations\n`);
  console.log('=== IMPORTING PURPLE LINE (NEL) RESTAURANTS ===\n');

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
