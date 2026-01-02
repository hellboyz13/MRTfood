const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Straits Times Food 2025 data
const ST_FOOD_2025 = [
  {
    name: "Encore by Rhubarb",
    address: "3 Duxton Hill, Singapore 089589",
    lat: 1.2797,
    lng: 103.8428,
    nearest_mrt: "tanjong-pagar",
    tags: ["Fine Dining", "French", "Set Lunch", "Set Dinner", "European", "Michelin", "ST Food 2025"],
    opening_hours: "Mon-Tue Thu-Sat: 12pm-2:30pm 6:30pm-9:30pm; Closed Wed & Sun",
    phone: "+65 8127 5001",
    website: "www.encorebyrhubarb.sg"
  },
  {
    name: "Loca Niru",
    address: "House of Tan Yeok Nee, 101 Penang Road #02-01, Singapore 238466",
    lat: 1.3003,
    lng: 103.8456,
    nearest_mrt: "dhoby-ghaut",
    tags: ["Fine Dining", "Japanese", "French", "Peranakan", "Omakase", "Heritage", "National Monument", "ST Food 2025"],
    opening_hours: "Tue-Sat: 6pm-11pm (last seating 8pm); Closed Sun & Mon",
    phone: "+65 6592 5815",
    website: "locaniru.sg"
  },
  {
    name: "Revolution Wine Bistro",
    address: "211 Henderson Road #01-05, Singapore 159552",
    lat: 1.2826,
    lng: 103.8198,
    nearest_mrt: "redhill",
    tags: ["Pasta", "Wine Bar", "Italian", "Natural Wine", "Casual Dining", "Designer Furniture", "ST Food 2025"],
    opening_hours: "Wed-Sat: 11am-3pm 6pm-12am; Sun: 11am-4pm; Closed Mon & Tue",
    website: "www.r-evolution.sg"
  },
  {
    name: "The Weirdoughs",
    address: "211 Serangoon Avenue 4 #01-10, Singapore 550211",
    lat: 1.3514,
    lng: 103.8735,
    nearest_mrt: "serangoon",
    tags: ["Cafe", "Bakery", "Croissant", "Focaccia", "Tartine", "Brunch", "Heartland", "ST Food 2025"],
    opening_hours: "Mon Thu Fri: 10am-7:30pm; Sat-Sun: 8am-3pm; Closed Tue & Wed",
    instagram_url: "https://instagram.com/theweirdoughs.sg"
  },
  {
    name: "Ten Ten Otoko",
    address: "Lucky Plaza, 304 Orchard Road #06-48A Stall 7, Singapore 238863",
    lat: 1.3039,
    lng: 103.8334,
    nearest_mrt: "orchard",
    tags: ["Hawker", "Japanese", "Donburi", "Rice Bowl", "Budget", "Coffeeshop", "ST Food 2025"],
    opening_hours: "Daily: 11am-8:30pm",
    phone: "9862-7740"
  },
  {
    name: "Choon Hoy Parlor",
    address: "The Arcade Capitol Singapore, 15 Stamford Road #01-84A, Singapore 178906",
    lat: 1.2936,
    lng: 103.8525,
    nearest_mrt: "city-hall",
    tags: ["Chinese", "Hokkien", "Local", "Comfort Food", "Heritage", "Home-style", "ST Food 2025"],
    opening_hours: "Daily: 11:30am-3pm 5:30pm-9:30pm",
    website: "www.choonhoyparlor.sg"
  },
  {
    name: "Artichoke",
    address: "New Bahru, 46 Kim Yam Road #01-02, Singapore 239351",
    lat: 1.2957,
    lng: 103.8388,
    nearest_mrt: "somerset",
    tags: ["Mediterranean", "Pizza", "Pasta", "Middle Eastern", "Local Chef", "ST Food 2025"],
    opening_hours: "Tue: 5pm-10pm; Wed-Sun: 11am-10pm; Closed Mon",
    phone: "9650-2290",
    website: "www.artichoke.com.sg"
  },
  {
    name: "Bee Hoe Coffee",
    address: "55 Joo Chiat Place, Singapore 427790",
    lat: 1.3134,
    lng: 103.9015,
    nearest_mrt: "paya-lebar",
    tags: ["Cafe", "Coffee", "Specialty Coffee", "Joo Chiat", "Katong", "ST Food 2025"],
    opening_hours: "Mon-Fri: 8:30am-3pm; Sat-Sun: 8:30am-4pm",
    instagram_url: "https://instagram.com/beehoecoffee"
  },
  {
    name: "Luli Singapore",
    address: "Marina Square, 6 Raffles Boulevard #02-184/185, Singapore 039594",
    lat: 1.2913,
    lng: 103.8576,
    nearest_mrt: "city-hall",
    tags: ["Cafe", "Tea", "TCM", "Chinese", "Herbal", "Wellness", "ST Food 2025"],
    opening_hours: "Daily: 10am-10pm",
    website: "luli.sg"
  },
  {
    name: "Mondo",
    address: "92A Amoy Street, Singapore 069912",
    lat: 1.2798,
    lng: 103.8467,
    nearest_mrt: "telok-ayer",
    tags: ["Dessert", "Ice Cream", "Gelato", "Artisanal", "Telok Ayer", "ST Food 2025"],
    opening_hours: "Mon-Thu: 11:30am-10pm; Fri-Sat: 11:30am-12am; Closed Sun",
    instagram_url: "https://instagram.com/mondo.gram"
  },
  {
    name: "Scarpetta",
    address: "47 Amoy Street, Singapore 069874",
    lat: 1.2802,
    lng: 103.8469,
    nearest_mrt: "telok-ayer",
    tags: ["Pasta", "Italian", "Queue", "No Reservation", "Budget Fine Dining", "Telok Ayer", "ST Food 2025"],
    opening_hours: "Tue-Sat Lunch: 11:30am-2:30pm; Tue-Wed Dinner: 6pm-10:30pm; Thu: 6pm-11pm; Fri-Sat: 6pm-11:30pm; Closed Sun & Mon",
    instagram_url: "https://instagram.com/scarpetta.sg"
  }
];

async function run() {
  console.log('='.repeat(60));
  console.log('IMPORTING STRAITS TIMES FOOD 2025');
  console.log('='.repeat(60));

  // Check for existing listings to skip duplicates
  const { data: existing } = await supabase
    .from('food_listings')
    .select('name');

  const existingNames = new Set((existing || []).map(e => e.name.toLowerCase().trim()));
  console.log(`\nExisting listings in DB: ${existingNames.size}`);

  let inserted = 0;
  let skipped = 0;

  for (const restaurant of ST_FOOD_2025) {
    // Check duplicate
    if (existingNames.has(restaurant.name.toLowerCase().trim())) {
      console.log(`SKIP (duplicate): ${restaurant.name}`);
      skipped++;
      continue;
    }

    // Build the listing
    const listing = {
      name: restaurant.name,
      address: restaurant.address,
      station_id: restaurant.nearest_mrt,
      source_id: 'straits-times',
      lat: restaurant.lat,
      lng: restaurant.lng,
      tags: restaurant.tags,
      opening_hours: restaurant.opening_hours || null,
      phone: restaurant.phone || null,
      website: restaurant.website || null,
      instagram_url: restaurant.instagram_url || null,
      is_active: true
    };

    const { error } = await supabase
      .from('food_listings')
      .insert(listing);

    if (error) {
      console.log(`ERROR: ${restaurant.name} - ${error.message}`);
    } else {
      console.log(`+ ${restaurant.name} -> ${restaurant.nearest_mrt}`);
      inserted++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Inserted: ${inserted}`);
  console.log(`Skipped (duplicate): ${skipped}`);
}

run().catch(console.error);
