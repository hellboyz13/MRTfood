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
  if (c.includes('shaanxi') || c.includes('shanxi')) tags.push('Chinese', 'Shaanxi');

  return tags.length > 0 ? tags : ['Hawker'];
}

// New restaurants from CSV
const restaurants = [
  { name: "Kungfu JB Pau", cuisine: "Dim Sum", price: 2.5, address: "10 Kranji Road, Kranji MRT Kopitiam, S739520", lat: 1.4251, lng: 103.762, source: "foodadvisor.com.sg" },
  { name: "Poison Ivy Bistro", cuisine: "Western/Local", price: 12, address: "100 Neo Tiew Road, Bollywood Veggies, S719026", lat: 1.4183, lng: 103.7148, source: "timeout.com" },
  { name: "Cheval Cafe Bar Bistro", cuisine: "Western/Asian", price: 15, address: "1 Equestrian Walk, Singapore Turf Club Riding Centre", lat: 1.414, lng: 103.7626, source: "tripadvisor.com.sg" },
  { name: "Ye Lai Xiang Laksa", cuisine: "Local", price: 4, address: "4 Woodlands St 12, #01-73, Marsiling Mall HC, S738632", lat: 1.4325, lng: 103.7741, source: "sethlui.com" },
  { name: "Arabica Kebab", cuisine: "Middle Eastern", price: 6, address: "4 Woodlands St 12, Marsiling Mall HC, S738632", lat: 1.4325, lng: 103.7741, source: "sethlui.com" },
  { name: "Ah Yi Handmade Noodle", cuisine: "Chinese", price: 5, address: "4 Woodlands St 12, Marsiling Mall HC, S738632", lat: 1.4325, lng: 103.7741, source: "sethlui.com" },
  { name: "Hong Ji Claypot BKT", cuisine: "Chinese", price: 5.5, address: "19 Marsiling Lane, #01-329, S730019", lat: 1.438, lng: 103.773, source: "eatbook.sg" },
  { name: "Al-Ameen Eating Corner", cuisine: "Indian/Malay", price: 9.2, address: "19 Marsiling Lane, S730019", lat: 1.438, lng: 103.773, source: "eatbook.sg" },
  { name: "Fu Shi Traditional Roasted", cuisine: "Chinese", price: 5, address: "4 Woodlands St 12, #01-26, Marsiling Mall, S738632", lat: 1.4325, lng: 103.7741, source: "misstamchiak.com" },
  { name: "Yan Ji Seafood Soup", cuisine: "Chinese", price: 8, address: "4 Woodlands St 12, Marsiling Mall HC, S738632", lat: 1.4325, lng: 103.7741, source: "misstamchiak.com" },
  { name: "MEL's Western", cuisine: "Western", price: 6, address: "4 Woodlands St 12, Marsiling Mall HC, S738632", lat: 1.4325, lng: 103.7741, source: "tripadvisor.com" },
  { name: "Pangkor Island Nasi Lemak", cuisine: "Malay", price: 7.9, address: "21 Canberra Link, Bukit Canberra HC, S756973", lat: 1.4481, lng: 103.8275, source: "sethlui.com" },
  { name: "Ah Heng Char Kway Teow", cuisine: "Local", price: 5.5, address: "21 Canberra Link, Bukit Canberra HC, S756973", lat: 1.4481, lng: 103.8275, source: "sethlui.com" },
  { name: "LiXin Teochew Fishball Noodles (Canberra)", cuisine: "Chinese", price: 5.9, address: "21 Canberra Link, #01-31, Bukit Canberra HC, S756973", lat: 1.4481, lng: 103.8275, source: "sethlui.com" },
  { name: "Home Treasure Salted Duck", cuisine: "Chinese", price: 4.3, address: "21 Canberra Link, #01-16, Bukit Canberra HC, S756973", lat: 1.4481, lng: 103.8275, source: "sethlui.com" },
  { name: "Arabest Middle Eastern Cuisine", cuisine: "Middle Eastern", price: 10, address: "21 Canberra Link, #01-32, Bukit Canberra HC, S756973", lat: 1.4481, lng: 103.8275, source: "sethlui.com" },
  { name: "Granny's Thunder Tea", cuisine: "Hakka", price: 4.5, address: "21 Canberra Link, Bukit Canberra HC, S756973", lat: 1.4481, lng: 103.8275, source: "sethlui.com" },
  { name: "Boat Noodle Place", cuisine: "Thai", price: 5, address: "21 Canberra Link, #01-13, Bukit Canberra HC, S756973", lat: 1.4481, lng: 103.8275, source: "womensweekly.com.sg" },
  { name: "STFU Snack That Food Up", cuisine: "Mexican-Indian Fusion", price: 6.2, address: "21 Canberra Link, #01-47, Bukit Canberra HC, S756973", lat: 1.4481, lng: 103.8275, source: "womensweekly.com.sg" },
  { name: "King Grouper Fish Soup", cuisine: "Chinese", price: 6, address: "21 Canberra Link, Bukit Canberra HC, S756973", lat: 1.443, lng: 103.8296, source: "thefatguide.com" },
  { name: "Liu Kou Shui (Canberra)", cuisine: "Chinese", price: 7, address: "21 Canberra Link, Bukit Canberra HC, S756973", lat: 1.443, lng: 103.8296, source: "womensweekly.com.sg" },
  { name: "Yunos N Family", cuisine: "Malay", price: 4.3, address: "724 Ang Mo Kio Ave 6, #01-XX, S560724", lat: 1.37, lng: 103.8495, source: "sethlui.com" },
  { name: "Ang Mo Kio Char Kway Teow", cuisine: "Local", price: 4, address: "724 Ang Mo Kio Ave 6, #01-28, S560724", lat: 1.37, lng: 103.8495, source: "sethlui.com" },
  { name: "Yong Xin", cuisine: "Chinese", price: 6, address: "Chong Boon Market & Food Centre, S560453", lat: 1.368, lng: 103.851, source: "sethlui.com" },
  { name: "Malaysian Hup Kee Fishball", cuisine: "Chinese", price: 5, address: "158 Ang Mo Kio Ave 4, S560158", lat: 1.3712, lng: 103.8423, source: "sethlui.com" },
  { name: "Sumo Fried Hokkien Mee", cuisine: "Local", price: 5, address: "628 Ang Mo Kio Ave 4, #01-76, S560628", lat: 1.375, lng: 103.838, source: "getgo.sg" },
  { name: "Lao San Kway Chap", cuisine: "Chinese", price: 5, address: "232 Ang Mo Kio Ave 3, #01-1196, S560232", lat: 1.369, lng: 103.845, source: "eatbook.sg" },
  { name: "Shi Xiang Ge", cuisine: "Chinese (Shanxi)", price: 7, address: "514 Bishan St 13, L2 Bishan Bus Int, S570514", lat: 1.3513, lng: 103.8492, source: "sethlui.com" },
  { name: "Ming Kee Chicken Rice", cuisine: "Chinese", price: 6.5, address: "511 Bishan St 13, #01-522 Kim San Leng, S570511", lat: 1.3505, lng: 103.848, source: "eatbook.sg" },
  { name: "Jiak Mee", cuisine: "Chinese", price: 5.3, address: "514 Bishan St 13, L2 Bishan Bus Int, S570514", lat: 1.3513, lng: 103.8492, source: "eatbook.sg" },
  { name: "Galangal", cuisine: "Thai", price: 13.5, address: "3 Bishan St 14, Bishan Clubhouse, S579780", lat: 1.352, lng: 103.835, source: "eatbook.sg" },
  { name: "Denzy Gelato", cuisine: "Dessert", price: 7, address: "506 Bishan St 11, #01-404, S570506", lat: 1.35, lng: 103.8485, source: "hungrygowhere.com" },
  { name: "Come Daily Hokkien Mee", cuisine: "Local", price: 5, address: "127 Lorong 1 Toa Payoh, Toa Payoh West Mkt, S310127", lat: 1.334, lng: 103.8555, source: "sethlui.com" },
  { name: "Hometaste Hakka Lei Cha", cuisine: "Hakka", price: 5, address: "127 Lorong 1 Toa Payoh, Toa Payoh West Mkt, S310127", lat: 1.334, lng: 103.8555, source: "sethlui.com" },
  { name: "Xi'an Famous Food", cuisine: "Chinese (Shaanxi)", price: 7.4, address: "Toa Payoh Food Alley, S310168", lat: 1.3326, lng: 103.8497, source: "sethlui.com" },
  { name: "Fire Rice", cuisine: "Chinese", price: 5, address: "168 Lorong 1 Toa Payoh, Maxim Coffee Shop, S310168", lat: 1.3326, lng: 103.8497, source: "sethlui.com" },
  { name: "Hup Chong Hakka Yong Tau Foo", cuisine: "Hakka", price: 5, address: "206 Toa Payoh North, S310206", lat: 1.3385, lng: 103.852, source: "sethlui.com" },
  { name: "127 Lorong 1 Fish Soup", cuisine: "Chinese", price: 5, address: "127 Lorong 1 Toa Payoh, #02-33, S310127", lat: 1.334, lng: 103.8555, source: "sethlui.com" },
  { name: "Il Piccolo Pizzeria", cuisine: "Italian", price: 11, address: "Toa Payoh area coffeeshop", lat: 1.3326, lng: 103.8497, source: "sethlui.com" },
  { name: "Toa Payoh Scissors Cut Curry Rice", cuisine: "Local", price: 5, address: "210 Lorong 8 Toa Payoh, #01-28, S310210", lat: 1.334, lng: 103.862, source: "herworld.com" },
  { name: "Balestier Road Hokkien Mee", cuisine: "Local", price: 5, address: "Balestier Road area", lat: 1.3265, lng: 103.852, source: "Various" },
  { name: "Hup Kee Fried Oyster Omelette", cuisine: "Local", price: 8, address: "Newton Food Centre, #01-73, S229495", lat: 1.312, lng: 103.838, source: "sethlui.com" },
  { name: "Newton Old Signboard 25", cuisine: "Local", price: 6, address: "Newton Food Centre, #01-25, S229495", lat: 1.312, lng: 103.838, source: "sethlui.com" },
  { name: "Heng Carrot Cake", cuisine: "Local", price: 5, address: "Newton Food Centre, #01-28, S229495", lat: 1.312, lng: 103.838, source: "danielfooddiary.com" },
  { name: "Alliance Seafood BBQ", cuisine: "Seafood", price: 35, address: "Newton Food Centre, S229495", lat: 1.312, lng: 103.838, source: "tripadvisor.com" },
  { name: "Bangkok Express", cuisine: "Thai", price: 6, address: "Newton Food Centre, S229495", lat: 1.312, lng: 103.838, source: "sethlui.com" },
  { name: "Food Opera ION", cuisine: "Various", price: 8, address: "2 Orchard Turn, #B4-03/04 ION Orchard, S238801", lat: 1.3039, lng: 103.8318, source: "foodadvisor.com.sg" },
  { name: "Food Republic Wisma Atria", cuisine: "Various", price: 7, address: "435 Orchard Rd, #04-XX, Wisma Atria, S238877", lat: 1.3015, lng: 103.833, source: "travelfish.org" },
  { name: "Song Fa Bak Kut Teh (Paragon)", cuisine: "Chinese", price: 8.8, address: "290 Orchard Rd, #B1-07, Paragon, S238859", lat: 1.304, lng: 103.836, source: "eatbook.sg" },
  { name: "Fiie's Cafe (Mister Grumpy)", cuisine: "Malay", price: 6.5, address: "304 Orchard Rd, #06-22, Lucky Plaza, S238863", lat: 1.303, lng: 103.833, source: "eatbook.sg" },
  { name: "Ayam Penyet Ria", cuisine: "Indonesian", price: 8, address: "Lucky Plaza, Orchard Road, S238863", lat: 1.303, lng: 103.833, source: "cheapandgood.sg" },
  { name: "Kebuke", cuisine: "Taiwanese", price: 5.6, address: "160 Orchard Rd, #01-11/12, Taste Orchard, S238842", lat: 1.3005, lng: 103.8385, source: "eatbook.sg" },
  { name: "Signs A Taste Of Vietnam", cuisine: "Vietnamese", price: 12, address: "277 Orchard Rd, #B2-22, Orchardgateway, S238858", lat: 1.3, lng: 103.8395, source: "eatbook.sg" },
  { name: "Morinaga Izakaya", cuisine: "Japanese", price: 13, address: "220 Orchard Rd, #B1-08, Midpoint Orchard, S238852", lat: 1.299, lng: 103.838, source: "eatbook.sg" },
  { name: "Albert Centre Food Court", cuisine: "Various", price: 4, address: "270 Queen St, Albert Centre, S180270", lat: 1.3015, lng: 103.8545, source: "yelp.com" },
  { name: "Food Junction Plaza Singapura", cuisine: "Various", price: 6, address: "68 Orchard Rd, Plaza Singapura, S238839", lat: 1.3005, lng: 103.8455, source: "Various" },
  { name: "Makansutra Gluttons Bay", cuisine: "Various", price: 5, address: "8 Raffles Ave, Esplanade, S039802", lat: 1.2895, lng: 103.8555, source: "travelfish.org" },
  { name: "Esplanade Mall Food Court", cuisine: "Various", price: 8, address: "8 Raffles Ave, Esplanade Mall, S039802", lat: 1.2895, lng: 103.8555, source: "Various" },
  { name: "Lau Pa Sat - Seng Kee", cuisine: "Local", price: 4, address: "18 Raffles Quay, Stall 10, S048582", lat: 1.2806, lng: 103.8505, source: "sethlui.com" },
  { name: "Lau Pa Sat - Song Kee Fishball", cuisine: "Chinese", price: 5, address: "18 Raffles Quay, Stall 19, S048582", lat: 1.2806, lng: 103.8505, source: "sethlui.com" },
  { name: "Lau Pa Sat - Qiu Lian Ban Mian", cuisine: "Chinese", price: 5, address: "18 Raffles Quay, Stall 83, S048582", lat: 1.2806, lng: 103.8505, source: "sethlui.com" },
  { name: "Lau Pa Sat - Sanuki Don", cuisine: "Japanese", price: 5.9, address: "18 Raffles Quay, Stall 45, S048582", lat: 1.2806, lng: 103.8505, source: "sethlui.com" },
  { name: "Market Street HC - Golden Nur", cuisine: "Indian", price: 6.5, address: "86 Market St, #03-11/12, CapitaSpring, S048947", lat: 1.283, lng: 103.85, source: "eatbook.sg" },
  { name: "Market Street HC - Nasi Lemak", cuisine: "Malay", price: 5, address: "86 Market St, CapitaSpring, S048947", lat: 1.283, lng: 103.85, source: "timeout.com" },
  { name: "ROKUS a.g.b", cuisine: "Korean Fusion", price: 13.9, address: "18 Raffles Quay, Lau Pa Sat, Stall 22, S048582", lat: 1.2806, lng: 103.8505, source: "sethlui.com" },
  { name: "LiXin Teochew Fishball Noodles (Lau Pa Sat)", cuisine: "Chinese", price: 8.9, address: "18 Raffles Quay, Lau Pa Sat, S048582", lat: 1.2806, lng: 103.8505, source: "eatbook.sg" },
  { name: "Rasapura Masters", cuisine: "Various", price: 10, address: "2 Bayfront Ave, #B2-XX, The Shoppes MBS, S018972", lat: 1.2835, lng: 103.8607, source: "sethlui.com" },
  { name: "Toast Box MBS", cuisine: "Local", price: 11.2, address: "2 Bayfront Ave, The Shoppes MBS, S018972", lat: 1.2835, lng: 103.8607, source: "sethlui.com" },
  { name: "Shenton Food Hall", cuisine: "Various", price: 8, address: "1 Shenton Way, Shenton House", lat: 1.2785, lng: 103.851, source: "burpple.com" },
  { name: "Food Garden Asia Square", cuisine: "Various", price: 8, address: "8 Marina View, Asia Square Tower 1, S018960", lat: 1.281, lng: 103.853, source: "burpple.com" },
  { name: "Marina South Pier Snack Shops", cuisine: "Various", price: 5, address: "31 Marina Coastal Dr, Marina South Pier, S018988", lat: 1.2715, lng: 103.8632, source: "tripadvisor.com" },
];

async function importRestaurants() {
  // Get all stations
  const { data: stations } = await supabase
    .from('stations')
    .select('id, name, lat, lng')
    .not('lat', 'is', null)
    .not('lng', 'is', null);

  console.log(`Loaded ${stations.length} stations\n`);
  console.log('=== IMPORTING RED LINE RESTAURANTS ===\n');

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

    // Get walking distance from OneMap
    const walkingData = await getWalkingDistance(
      restaurant.lat, restaurant.lng,
      nearestStation.lat, nearestStation.lng
    );

    const distanceToStation = walkingData ? walkingData.distance : Math.round(minDistance);
    const walkingTime = walkingData ? walkingData.time : Math.round(minDistance / 80); // ~80m/min

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
