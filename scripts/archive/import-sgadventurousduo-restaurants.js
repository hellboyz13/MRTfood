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

// SG Adventurous Duo restaurant picks
const restaurants = [
  { name: "Riverside Indonesian Grill", address: "23 Serangoon Central #04-36/37 NEX", lat: 1.3503, lng: 103.8718, tags: ["Indonesian"], price_low: 6, price_high: 10, rating: 4.5 },
  { name: "FYP (For You People) Cafe", address: "181 Orchard Rd #04-22 Orchard Central", lat: 1.3006, lng: 103.839, tags: ["Cafe", "Western"], price_low: 12, price_high: 22, rating: 4.2 },
  { name: "Zhang Ji Shanghai La Mian XLB", address: "120 Bukit Merah Lane 1 #01-56", lat: 1.2872, lng: 103.8186, tags: ["Shanghainese", "Xiao Long Bao"], price_low: 5, price_high: 8, rating: 4.4 },
  { name: "Five Oars Coffee Roasters", address: "43 Tanjong Pagar Rd #01-01", lat: 1.2792, lng: 103.8434, tags: ["Cafe", "Coffee"], price_low: 8, price_high: 15, rating: 4.4 },
  { name: "Joji's Diner", address: "534 Upper Serangoon Rd", lat: 1.3553, lng: 103.8716, tags: ["American", "Diner"], price_low: 12, price_high: 20, rating: 4.3 },
  { name: "Fiie's Cafe", address: "304 Orchard Rd #06-52 Lucky Plaza", lat: 1.3039, lng: 103.8318, tags: ["Cafe"], price_low: 10, price_high: 15, rating: 4.3 },
  { name: "Wang Omakase Sushi Bar", address: "178 Tyrwhitt Rd", lat: 1.3121, lng: 103.8584, tags: ["Japanese", "Omakase", "Sushi"], price_low: 40, price_high: 80, rating: 4.6 },
  { name: "One Fattened Calf Burgers", address: "46 Kim Yam Rd (New Bahru)", lat: 1.294, lng: 103.8378, tags: ["American", "Burgers"], price_low: 12, price_high: 18, rating: 4.5 },
  { name: "Meadesmoore Steakhouse", address: "21A Boon Tat St Level 2", lat: 1.2816, lng: 103.8479, tags: ["Steakhouse", "Western"], price_low: 35, price_high: 60, rating: 4.4 },
  { name: "Sen-ryo", address: "2 Orchard Turn #03-17/18 ION", lat: 1.304, lng: 103.8318, tags: ["Japanese", "Sushi"], price_low: 20, price_high: 35, rating: 4.2 },
  { name: "Hot Duck", address: "1 North Point Dr B2-147", lat: 1.4304, lng: 103.8354, tags: ["Chinese", "Duck"], price_low: 6, price_high: 12, rating: 4.3 },
  { name: "Khao Hom", address: "Multiple locations", lat: 1.3, lng: 103.85, tags: ["Thai"], price_low: 8, price_high: 12, rating: 4.4 },
  { name: "Sin Heng Kee Porridge", address: "Multiple locations", lat: 1.3, lng: 103.85, tags: ["Chinese", "Porridge"], price_low: 4, price_high: 8, rating: 4.3 },
  { name: "Common Man Coffee Roasters", address: "Multiple locations", lat: 1.3, lng: 103.85, tags: ["Cafe", "Coffee", "Brunch"], price_low: 15, price_high: 25, rating: 4.4 },
  { name: "Nassim Hill Bakery", address: "56 Tanglin Rd #01-03", lat: 1.3062, lng: 103.8217, tags: ["Bakery", "Bistro"], price_low: 15, price_high: 25, rating: 4.3 },
  { name: "A Hot Hideout", address: "8 Grange Rd B1-08/09 Cineleisure", lat: 1.3013, lng: 103.8365, tags: ["Mala", "Sichuan"], price_low: 15, price_high: 25, rating: 4.2 },
  { name: "Beach Road Scissors Cut Curry Rice", address: "229 Jalan Besar", lat: 1.3089, lng: 103.8577, tags: ["Local", "Curry Rice"], price_low: 4, price_high: 7, rating: 4.1 },
  { name: "Chong Qing Grilled Fish", address: "2 Maju Ave", lat: 1.3517, lng: 103.8725, tags: ["Sichuan", "Grilled Fish"], price_low: 20, price_high: 35, rating: 4.2 },
  { name: "G7 Frog Porridge", address: "163 Geylang Rd Lorong 3", lat: 1.3137, lng: 103.8746, tags: ["Chinese", "Frog Porridge", "Supper"], price_low: 12, price_high: 20, rating: 4.5 },
  { name: "J.B. Ah Meng Restaurant", address: "534 Geylang Rd", lat: 1.3137, lng: 103.891, tags: ["Zi Char", "Seafood"], price_low: 25, price_high: 50, rating: 4.2 },
  { name: "Fei Mookata", address: "11 Northshore Dr #01-S6 Punggol", lat: 1.4115, lng: 103.905, tags: ["Thai BBQ", "Mookata"], price_low: 20, price_high: 30, rating: 4.3 },
  { name: "Rochor Original Beancurd (Short St)", address: "2 Short St", lat: 1.3025, lng: 103.8527, tags: ["Dessert", "Beancurd"], price_low: 2, price_high: 4, rating: 4.4 },
  { name: "Sin Heng Claypot BKT", address: "439 Joo Chiat Rd", lat: 1.3135, lng: 103.904, tags: ["Bak Kut Teh", "Claypot"], price_low: 10, price_high: 15, rating: 4.4 },
  { name: "Charen Thai Kitchen", address: "684 Hougang Ave 8 #01-977", lat: 1.3741, lng: 103.8869, tags: ["Thai"], price_low: 10, price_high: 15, rating: 4.3 },
  { name: "Feng Sheng Chicken Rice & Steamboat", address: "4 Short St", lat: 1.3025, lng: 103.8527, tags: ["Chinese", "Chicken Rice", "Steamboat"], price_low: 6, price_high: 12, rating: 4.2 },
  { name: "Founder Bak Kut Teh", address: "347 Balestier Rd", lat: 1.326, lng: 103.8528, tags: ["Bak Kut Teh"], price_low: 8, price_high: 15, rating: 4.1 },
  { name: "Siam Square Mookata", address: "61 Ang Mo Kio Ave 8 #01-01", lat: 1.3698, lng: 103.8485, tags: ["Thai BBQ", "Mookata"], price_low: 18, price_high: 25, rating: 4.2 },
  { name: "Chong Pang Nasi Lemak", address: "447 Sembawang Rd", lat: 1.4534, lng: 103.82, tags: ["Malay", "Nasi Lemak"], price_low: 4, price_high: 7, rating: 4.4 },
  { name: "Lickers", address: "124 Hougang Ave 1 #01-1446", lat: 1.3723, lng: 103.8862, tags: ["Western"], price_low: 12, price_high: 18, rating: 4.3 },
  { name: "284 Kway Chap", address: "Bishan St 22", lat: 1.3515, lng: 103.8491, tags: ["Local", "Kway Chap"], price_low: 5, price_high: 8, rating: 4.3 },
  { name: "Finest Song Kee Fishball", address: "532 Upper Serangoon Rd", lat: 1.3553, lng: 103.8716, tags: ["Local", "Fishball Noodles"], price_low: 4, price_high: 7, rating: 4.3 },
  { name: "Nakhon Kitchen", address: "212 Hougang St 21 #01-341", lat: 1.36, lng: 103.885, tags: ["Thai"], price_low: 10, price_high: 15, rating: 4.3 },
  { name: "Picolino", address: "1 Scotts Rd #03-23/24 Shaw Centre", lat: 1.3073, lng: 103.8327, tags: ["Italian"], price_low: 20, price_high: 35, rating: 4.4 },
  { name: "Dal In Korean Restaurant", address: "17 Boon Tat St", lat: 1.2816, lng: 103.8479, tags: ["Korean"], price_low: 20, price_high: 35, rating: 4.3 },
  { name: "June Coffee", address: "49 E Coast Rd", lat: 1.3069, lng: 103.9029, tags: ["Cafe", "Coffee"], price_low: 6, price_high: 12, rating: 4.4 },
  { name: "Greenview Cafe", address: "14 Scotts Rd #04-96 Far East Plaza", lat: 1.3073, lng: 103.8327, tags: ["Local", "Fusion"], price_low: 6, price_high: 10, rating: 4.2 },
  { name: "Gum Gang Won", address: "133 New Bridge Rd B1-51A", lat: 1.2843, lng: 103.8446, tags: ["Korean"], price_low: 10, price_high: 15, rating: 4.3 },
  { name: "Brawn & Brains Coffee", address: "20 Kallang Ave Pico Creative Centre", lat: 1.3108, lng: 103.8687, tags: ["Cafe", "Coffee"], price_low: 5, price_high: 10, rating: 4.5 },
  { name: "Selegie Soyabean", address: "102 Towner Rd #01-278", lat: 1.3189, lng: 103.8561, tags: ["Dessert", "Soyabean"], price_low: 2, price_high: 4, rating: 4.4 },
  { name: "Scarpetta", address: "47 Amoy St", lat: 1.2816, lng: 103.8479, tags: ["Italian", "Fine Dining"], price_low: 30, price_high: 50, rating: 4.5 },
  { name: "Daniele's Pizza", address: "1 Changi Business Park Crescent #01-19", lat: 1.3342, lng: 103.962, tags: ["Italian", "Pizza"], price_low: 15, price_high: 25, rating: 4.8 },
  { name: "Orchid Live Seafood", address: "2 Yishun Walk #03-01 HomeTeamNS", lat: 1.4235, lng: 103.829, tags: ["Seafood", "Zi Char"], price_low: 40, price_high: 80, rating: 4.2 },
  { name: "Grace Espresso", address: "428 River Valley Rd #01-14 Loft@Nathan", lat: 1.2942, lng: 103.8315, tags: ["Cafe", "Coffee"], price_low: 10, price_high: 15, rating: 4.3 },
  { name: "Sweedy", address: "377 Hougang St 32 #01-32", lat: 1.37, lng: 103.89, tags: ["Cafe", "Dessert"], price_low: 6, price_high: 10, rating: 4.5 },
  { name: "Yong Xiang Xing Dou Fu", address: "32 New Market Rd #01-1084", lat: 1.2843, lng: 103.8446, tags: ["Local", "Tofu"], price_low: 4, price_high: 6, rating: 4.2 },
  { name: "Beach Road Prawn Noodle House", address: "370 E Coast Rd", lat: 1.31, lng: 103.905, tags: ["Local", "Prawn Noodles"], price_low: 6, price_high: 10, rating: 4.2 },
  { name: "La Pizzaiola", address: "Bukit Timah #881", lat: 1.339, lng: 103.776, tags: ["Italian", "Pizza"], price_low: 18, price_high: 28, rating: 4.4 },
  { name: "Hoodadak Korean Restaurant", address: "Multiple locations", lat: 1.3, lng: 103.85, tags: ["Korean", "Fried Chicken"], price_low: 12, price_high: 20, rating: 4.2 },
];

async function importRestaurants() {
  // Get all stations
  const { data: stations } = await supabase
    .from('stations')
    .select('id, name, lat, lng')
    .not('lat', 'is', null);

  if (!stations || stations.length === 0) {
    console.log('No stations found');
    return;
  }

  console.log(`Found ${stations.length} stations`);

  const sourceId = 'sgadventurousduo';

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const restaurant of restaurants) {
    // Check if already exists
    const { data: existing } = await supabase
      .from('food_listings')
      .select('id')
      .eq('name', restaurant.name)
      .single();

    if (existing) {
      console.log(`Skipping (exists): ${restaurant.name}`);
      skipped++;
      continue;
    }

    // Find nearest station
    let nearestStation = null;
    let minDistance = Infinity;

    for (const station of stations) {
      const dist = haversineDistance(restaurant.lat, restaurant.lng, station.lat, station.lng);
      if (dist < minDistance) {
        minDistance = dist;
        nearestStation = station;
      }
    }

    if (!nearestStation || minDistance > 2000) {
      console.log(`No nearby station for: ${restaurant.name}`);
      failed++;
      continue;
    }

    // Get walking distance
    let distanceToStation = Math.round(minDistance);
    let walkingTime = Math.round(minDistance / 80);

    const walkingData = await getWalkingDistance(
      restaurant.lat, restaurant.lng,
      nearestStation.lat, nearestStation.lng
    );

    if (walkingData) {
      distanceToStation = walkingData.distance;
      walkingTime = walkingData.time;
    }

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
        walking_time: walkingTime,
        rating: restaurant.rating
      })
      .select('id')
      .single();

    if (insertError) {
      console.log(`Error inserting ${restaurant.name}: ${insertError.message}`);
      failed++;
      continue;
    }

    // Insert price
    const priceDesc = `$${restaurant.price_low} - $${restaurant.price_high}`;
    await supabase.from('listing_prices').insert({
      listing_id: newListing.id,
      item_name: 'Price Range',
      description: priceDesc,
      price: restaurant.price_low,
      is_signature: true,
      sort_order: 0
    });

    console.log(`Imported: ${restaurant.name} -> ${nearestStation.id} (${walkingTime} min, rating: ${restaurant.rating})`);
    imported++;

    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n=== IMPORT COMPLETE ===`);
  console.log(`Imported: ${imported}`);
  console.log(`Skipped (existing): ${skipped}`);
  console.log(`Failed: ${failed}`);

  // Get new total count
  const { count } = await supabase
    .from('food_listings')
    .select('*', { count: 'exact', head: true });

  console.log(`\nTotal listings in database: ${count}`);
}

importRestaurants().catch(console.error);
