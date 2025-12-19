// Script to add west/east recommended restaurants with OneMap distance calculations
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Use service role key to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4'
);

// New restaurants from west_east_recommended_food.csv
const newRestaurants = [
  {
    name: "Traditional Hakka Lui Cha",
    address: "505 Jurong West Street 52, #01-08, Singapore 640505",
    lat: 1.35,
    lng: 103.696,
    station_id: "pioneer",
    price_range: "$4 - $5",
    sources: ["sethLui", "michelin-bib-gourmand"],
    tags: ["Hakka", "Healthy", "Hawker"]
  },
  {
    name: "Du Du Shou Shi",
    address: "505 Jurong West Street 52, #01-19, Singapore 640505",
    lat: 1.35,
    lng: 103.696,
    station_id: "pioneer",
    price_range: "$2 - $4",
    sources: ["danielfooddiary", "michelin-bib-gourmand"],
    tags: ["Dessert", "Tutu Kueh", "Traditional"]
  },
  {
    name: "Heng Heng Seafood Bee Hoon",
    address: "505 Jurong West Street 52, Singapore 640505",
    lat: 1.35,
    lng: 103.696,
    station_id: "pioneer",
    price_range: "$5 - $8",
    sources: ["sethLui", "michelin-bib-gourmand"],
    tags: ["Chinese", "Seafood", "Bee Hoon", "Hawker"]
  },
  {
    name: "Xiang Peng La Mian Xiao Long Bao",
    address: "442 Clementi Avenue 3, Bistro8@Clementi, Singapore 120442",
    lat: 1.314,
    lng: 103.766,
    station_id: "clementi",
    price_range: "$5 - $8",
    sources: ["eatbook"],
    tags: ["Chinese", "Xiao Long Bao", "La Mian", "Dumplings"]
  },
  {
    name: "OLLA Specialty Coffee",
    address: "381 Clementi Avenue 5, #01-402, Singapore 120381",
    lat: 1.312,
    lng: 103.762,
    station_id: "clementi",
    price_range: "$10 - $20",
    sources: ["eatbook"],
    tags: ["Cafe", "Coffee", "Specialty Coffee"]
  },
  {
    name: "Giraffa",
    address: "3 Gateway Drive, #02-05, Westgate, Singapore 608532",
    lat: 1.3338,
    lng: 103.742,
    station_id: "jurong-east",
    price_range: "$4 - $10",
    sources: ["sethLui"],
    tags: ["Japanese", "Curry Bun", "Bakery"]
  },
  {
    name: "He Ji Braised Duck",
    address: "West Coast Market Square, #01-33, Singapore 127768",
    lat: 1.307,
    lng: 103.765,
    station_id: "clementi",
    price_range: "$4 - $6",
    sources: ["sethLui"],
    tags: ["Chinese", "Braised Duck", "Hawker"]
  },
  {
    name: "Hock Hai Curry Chicken Noodle",
    address: "84 Punggol Way, Punggol Coast Hawker Centre, Singapore 829911",
    lat: 1.409,
    lng: 103.91,
    station_id: "punggol-coast",
    price_range: "$5 - $8",
    sources: ["michelin-hawker"],
    tags: ["Hawker", "Curry", "Noodles", "Chinese"]
  },
  {
    name: "Inspirasi Mee Soto",
    address: "208B New Upper Changi Road, #01-11, Bedok Interchange Hawker Centre, Singapore 460207",
    lat: 1.324,
    lng: 103.93,
    station_id: "bedok",
    price_range: "$3 - $5",
    sources: ["eatbook"],
    tags: ["Malay", "Mee Soto", "Hawker"]
  },
  {
    name: "Xing Ji Rou Cuo Mian",
    address: "Bedok North area, Singapore",
    lat: 1.329,
    lng: 103.932,
    station_id: "bedok",
    price_range: "$4 - $6",
    sources: ["eatbook"],
    tags: ["Chinese", "Noodles", "Hawker"]
  },
  {
    name: "Chai Chee Pork Porridge",
    address: "85 Bedok North Road, #01-23, Fengshan Hawker Centre, Singapore 470085",
    lat: 1.328,
    lng: 103.933,
    station_id: "bedok",
    price_range: "$4 - $6",
    sources: ["eatbook"],
    tags: ["Chinese", "Porridge", "Hawker", "Supper"]
  },
  {
    name: "Ma Bo Lor Mee",
    address: "Bedok area, Singapore",
    lat: 1.328,
    lng: 103.933,
    station_id: "bedok",
    price_range: "$3 - $5",
    sources: ["eatbook"],
    tags: ["Chinese", "Lor Mee", "Hawker"]
  },
  {
    name: "Ho Yun Tim Sum",
    address: "Blk 419 Tampines Street 41, #01-80, Singapore 520419",
    lat: 1.352,
    lng: 103.95,
    station_id: "tampines",
    price_range: "$3 - $5",
    sources: ["eatbook"],
    tags: ["Chinese", "Dim Sum", "Hawker"]
  },
  {
    name: "Old World Bakuteh",
    address: "1 Tampines North Drive, #01-34, T-Space, Singapore 528559",
    lat: 1.37,
    lng: 103.945,
    station_id: "tampines",
    price_range: "$6 - $10",
    sources: ["eatbook"],
    tags: ["Chinese", "Bak Kut Teh", "Teochew"]
  },
  {
    name: "Lawa Bintang",
    address: "9008 Tampines Street 93, Singapore 528843",
    lat: 1.356,
    lng: 103.97,
    station_id: "tampines-west",
    price_range: "$12 - $25",
    sources: ["eatbook"],
    tags: ["Malay", "Seafood", "Lobster", "Nasi Lemak"]
  },
  {
    name: "Little Tokio",
    address: "824 Tampines Street 81, #01-22, Singapore 520824",
    lat: 1.347,
    lng: 103.94,
    station_id: "tampines",
    price_range: "$15 - $25",
    sources: ["eatbook"],
    tags: ["Japanese", "Izakaya", "Restaurant"]
  },
  {
    name: "Haruyama Udon",
    address: "10 Tampines Central 1, #B1-09, Tampines 1, Singapore 529536",
    lat: 1.354,
    lng: 103.945,
    station_id: "tampines",
    price_range: "$16 - $20",
    sources: ["eatbook"],
    tags: ["Japanese", "Udon", "Noodles"]
  },
  {
    name: "Mister Donut",
    address: "10 Tampines Central 1, #B1-K6, Tampines 1, Singapore 529536",
    lat: 1.354,
    lng: 103.945,
    station_id: "tampines",
    price_range: "$2 - $5",
    sources: ["eatbook"],
    tags: ["Japanese", "Dessert", "Donuts", "Bakery"]
  },
  {
    name: "Hundred Acre Creamery",
    address: "Block 824 Tampines Street 81, #01-24, Singapore 520824",
    lat: 1.356,
    lng: 103.936,
    station_id: "tampines",
    price_range: "$5 - $12",
    sources: ["eatbook"],
    tags: ["Dessert", "Ice Cream", "Waffles", "Cafe"]
  },
  {
    name: "New Deli Bakery",
    address: "462 Tampines Street 44, #01-66, Singapore 520462",
    lat: 1.352,
    lng: 103.947,
    station_id: "tampines-east",
    price_range: "$4 - $7",
    sources: ["eatbook"],
    tags: ["Bakery", "Croissants", "Pastries"]
  },
  {
    name: "Eat 3 Bowls",
    address: "2 Tampines Central 5, Century Square, Singapore 529509",
    lat: 1.353,
    lng: 103.944,
    station_id: "tampines",
    price_range: "$5 - $10",
    sources: ["hungrygowhere"],
    tags: ["Taiwanese", "Rice", "Braised Pork"]
  },
  {
    name: "Hae! Prawn Claypot",
    address: "Bedok Industrial Park area, Singapore",
    lat: 1.335,
    lng: 103.94,
    station_id: "bedok",
    price_range: "$15 - $35",
    sources: ["eatbook"],
    tags: ["Seafood", "Claypot", "Prawn", "Restaurant"]
  },
  {
    name: "Shubby Sweets",
    address: "42 Chai Chee Street, #01-68, Singapore 461042",
    lat: 1.326,
    lng: 103.925,
    station_id: "bedok",
    price_range: "$6 - $11",
    sources: ["eatbook"],
    tags: ["Dessert", "Cookies", "Bakery"]
  },
  {
    name: "Hakka Leipopo",
    address: "308C Anchorvale Road, #02-05, Anchorvale Village, Singapore 544308",
    lat: 1.392,
    lng: 103.886,
    station_id: "sengkang",
    price_range: "$6 - $9",
    sources: ["sethLui"],
    tags: ["Hakka", "Lei Cha", "Healthy"]
  }
];

// OneMap API token cache
let cachedToken = null;
let tokenExpiry = 0;

async function getOneMapToken() {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const email = process.env.ONEMAP_EMAIL;
  const password = process.env.ONEMAP_PASSWORD;

  if (!email || !password) {
    console.warn('OneMap credentials not configured');
    return null;
  }

  try {
    const response = await fetch('https://www.onemap.gov.sg/api/auth/post/getToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) throw new Error(`Token request failed: ${response.status}`);

    const data = await response.json();
    cachedToken = data.access_token;
    tokenExpiry = parseInt(data.expiry_timestamp) * 1000 - (60 * 60 * 1000);
    console.log('✅ OneMap token obtained');
    return cachedToken;
  } catch (error) {
    console.error('Failed to get OneMap token:', error);
    return null;
  }
}

async function getWalkingDistance(startLat, startLng, endLat, endLng) {
  try {
    const token = await getOneMapToken();

    const url = new URL('https://www.onemap.gov.sg/api/public/routingsvc/route');
    url.searchParams.append('start', `${startLat},${startLng}`);
    url.searchParams.append('end', `${endLat},${endLng}`);
    url.searchParams.append('routeType', 'walk');

    const headers = { 'Accept': 'application/json' };
    if (token) headers['Authorization'] = token;

    const response = await fetch(url.toString(), { method: 'GET', headers });

    if (!response.ok) throw new Error(`OneMap API error: ${response.status}`);

    const data = await response.json();

    if (data.status !== 0 || !data.route_summary) {
      throw new Error(data.status_message || 'Route not found');
    }

    return {
      distance: Math.round(data.route_summary.total_distance), // meters
      duration: Math.round(data.route_summary.total_time / 60), // minutes
      success: true
    };
  } catch (error) {
    console.error('OneMap error:', error.message);
    // Fallback to haversine calculation
    const straightLine = haversineDistance(startLat, startLng, endLat, endLng);
    const estimatedWalking = Math.round(straightLine * 1.3);
    return {
      distance: estimatedWalking,
      duration: Math.round(estimatedWalking / 80),
      success: false
    };
  }
}

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function toRad(deg) {
  return deg * Math.PI / 180;
}

async function main() {
  console.log('=== Adding West/East Recommended Restaurants ===\n');

  // Get station coordinates
  const { data: stations } = await supabase
    .from('stations')
    .select('id, name, lat, lng');

  const stationMap = {};
  stations.forEach(s => stationMap[s.id] = s);

  // Check for existing restaurants to avoid duplicates
  const { data: existingListings } = await supabase
    .from('food_listings')
    .select('name')
    .eq('is_active', true);

  const existingNames = new Set((existingListings || []).map(l => l.name.toLowerCase()));

  let added = 0;
  let skipped = 0;

  for (const restaurant of newRestaurants) {
    console.log(`\n📍 Processing: ${restaurant.name}`);

    // Check if already exists
    if (existingNames.has(restaurant.name.toLowerCase())) {
      console.log(`   ⏭️  Already exists, skipping`);
      skipped++;
      continue;
    }

    const station = stationMap[restaurant.station_id];
    if (!station) {
      console.log(`   ❌ Station ${restaurant.station_id} not found`);
      continue;
    }

    // Calculate walking distance using OneMap
    let distance = null;
    let walkingTime = null;

    if (station.lat && station.lng && restaurant.lat && restaurant.lng) {
      console.log(`   🚶 Calculating walking distance from ${station.name}...`);
      const walkResult = await getWalkingDistance(
        station.lat, station.lng,
        restaurant.lat, restaurant.lng
      );
      distance = walkResult.distance;
      walkingTime = walkResult.duration;
      console.log(`   📏 Distance: ${distance}m, Walking: ${walkingTime} min ${walkResult.success ? '(OneMap)' : '(estimated)'}`);
    }

    // Insert the listing
    const { data: listing, error: insertError } = await supabase
      .from('food_listings')
      .insert({
        name: restaurant.name,
        address: restaurant.address,
        lat: restaurant.lat,
        lng: restaurant.lng,
        station_id: restaurant.station_id,
        tags: restaurant.tags,
        distance_to_station: distance,
        walking_time: walkingTime,
        is_active: true
      })
      .select()
      .single();

    if (insertError) {
      console.log(`   ❌ Insert error: ${insertError.message}`);
      continue;
    }

    console.log(`   ✅ Inserted listing: ${listing.id}`);

    // Add sources to listing_sources
    for (const sourceId of restaurant.sources) {
      const { error: sourceError } = await supabase
        .from('listing_sources')
        .insert({
          listing_id: listing.id,
          source_id: sourceId,
          is_primary: restaurant.sources.indexOf(sourceId) === 0
        });

      if (sourceError) {
        console.log(`   ⚠️  Source ${sourceId} error: ${sourceError.message}`);
      } else {
        console.log(`   🏷️  Added source: ${sourceId}`);
      }
    }

    // Add price range to listing_prices
    const { error: priceError } = await supabase
      .from('listing_prices')
      .insert({
        listing_id: listing.id,
        item_name: 'Price Range',
        price: 0,
        description: restaurant.price_range
      });

    if (priceError) {
      console.log(`   ⚠️  Price error: ${priceError.message}`);
    } else {
      console.log(`   💰 Added price: ${restaurant.price_range}`);
    }

    added++;

    // Rate limiting delay
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Added: ${added} restaurants`);
  console.log(`   ⏭️  Skipped: ${skipped} (already exist)`);
}

main().catch(console.error);
