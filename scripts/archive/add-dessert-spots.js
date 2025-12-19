const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4'
);

// Haversine formula for distance
function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Source name to ID mapping
const sourceMapping = {
  'Eatbook': 'eatbook',
  'Seth Lui': 'sethlui',
  'Lady Iron Chef': 'ladyironchef',
  'Burpple': 'burpple',
  'Daniel Food Diary': 'danielfooddiary',
  'HungryGoWhere': 'hungrygowhere',
  'Miss Tam Chiak': 'misstamchiak'
};

const desserts = [
  // 4.7★ Rating
  { name: "Birds of Paradise", rating: 4.7, lat: 1.2785, lng: 103.8432, address: "53 Craig Road #01-01, Singapore 089691", station: "tanjong-pagar", sources: "Eatbook, Seth Lui, Lady Iron Chef, Burpple", tags: ["Dessert", "Gelato", "Ice Cream"] },
  { name: "Birds of Paradise (Katong)", rating: 4.7, lat: 1.3056, lng: 103.9042, address: "63 East Coast Road #01-05, Singapore 428776", station: "dakota", sources: "Eatbook, Seth Lui, Lady Iron Chef, Burpple", tags: ["Dessert", "Gelato", "Ice Cream"] },
  { name: "Tom's Palette", rating: 4.7, lat: 1.2993, lng: 103.8565, address: "36 Arab Street, Singapore 199735", station: "bugis", sources: "Eatbook, Seth Lui, Daniel Food Diary, Burpple", tags: ["Dessert", "Gelato", "Ice Cream"] },

  // 4.6★ Rating
  { name: "Apiary", rating: 4.6, lat: 1.2792, lng: 103.8412, address: "84 Neil Road, Singapore 088842", station: "outram-park", sources: "Eatbook, Seth Lui, Burpple", tags: ["Dessert", "Ice Cream", "Gelato"] },
  { name: "LUNA", rating: 4.6, lat: 1.2819, lng: 103.8479, address: "53 Amoy Street, Singapore 069879", station: "tanjong-pagar", sources: "Eatbook, Seth Lui", tags: ["Dessert", "Cakes", "Patisserie"] },
  { name: "Nesuto", rating: 4.6, lat: 1.2772, lng: 103.8439, address: "21 Tras Street, Singapore 078994", station: "tanjong-pagar", sources: "Eatbook, Lady Iron Chef", tags: ["Dessert", "Cakes", "Patisserie"] },
  { name: "Sourbombe Artisanal Bakery (Park Mall)", rating: 4.6, lat: 1.2981, lng: 103.8486, address: "9 Penang Road #01-07 Park Mall, Singapore 238459", station: "dhoby-ghaut", sources: "Eatbook, Seth Lui", tags: ["Dessert", "Bombolini", "Bakery"] },
  { name: "Patisserie Clé", rating: 4.6, lat: 1.2919, lng: 103.8350, address: "474 River Valley Road #01-07, Singapore 248356", station: "fort-canning", sources: "Eatbook, Burpple", tags: ["Dessert", "Tarts", "Patisserie"] },
  { name: "Dopa", rating: 4.6, lat: 1.2827, lng: 103.8458, address: "29 South Bridge Road #01-01, Singapore 058664", station: "raffles-place", sources: "Eatbook, Seth Lui, Burpple", tags: ["Dessert", "Gelato", "Ice Cream"] },
  { name: "Jin Yu Man Tang", rating: 4.6, lat: 1.3074, lng: 103.9051, address: "66 East Coast Road #01-03, Singapore 428778", station: "dakota", sources: "Eatbook, HungryGoWhere", tags: ["Dessert", "Chinese Dessert"] },

  // 4.5★ Rating
  { name: "Ah Chew Desserts", rating: 4.5, lat: 1.2992, lng: 103.8558, address: "1 Liang Seah Street #01-10/11, Singapore 189022", station: "bugis", sources: "Eatbook, Burpple", tags: ["Dessert", "Chinese Dessert"] },
  { name: "Whiskdom", rating: 4.5, lat: 1.2846, lng: 103.8334, address: "71 Seng Poh Road #01-33, Singapore 160071", station: "tiong-bahru", sources: "Eatbook, Burpple", tags: ["Dessert", "Cookies", "Bakery"] },
  { name: "Pantler", rating: 4.5, lat: 1.2905, lng: 103.8355, address: "474 River Valley Road, Singapore 248356", station: "fort-canning", sources: "Lady Iron Chef, Burpple", tags: ["Dessert", "Cakes", "Patisserie"] },
  { name: "Fluff Bakery", rating: 4.5, lat: 1.3031, lng: 103.8608, address: "795 North Bridge Road, Singapore 198763", station: "lavender", sources: "Eatbook, Burpple", tags: ["Dessert", "Cakes", "Halal", "Bakery"] },
  { name: "Momolato", rating: 4.5, lat: 1.3015, lng: 103.8592, address: "34 Haji Lane, Singapore 189227", station: "bugis", sources: "Eatbook, Burpple", tags: ["Dessert", "Gelato", "Halal", "Ice Cream"] },
  { name: "Old Amoy Chendol (Chinatown)", rating: 4.5, lat: 1.2831, lng: 103.8437, address: "335 Smith Street #02-008 Chinatown Complex, Singapore 050335", station: "chinatown", sources: "Eatbook", tags: ["Dessert", "Chendol", "Chinese Dessert"] },
  { name: "Hay Gelato", rating: 4.5, lat: 1.3053, lng: 103.9028, address: "68 East Coast Road #01-03, Singapore 428779", station: "dakota", sources: "Eatbook, Burpple", tags: ["Dessert", "Gelato", "Ice Cream"] },
  { name: "2am Dessert Bar", rating: 4.5, lat: 1.3116, lng: 103.7962, address: "21A Lorong Liput, Singapore 277733", station: "holland-village", sources: "Eatbook, Lady Iron Chef", tags: ["Dessert", "Plated Dessert", "Late Night"] },
  { name: "Mr Bucket Chocolaterie", rating: 4.5, lat: 1.3053, lng: 103.8089, address: "13 Dempsey Road, Singapore 249674", station: "botanic-gardens", sources: "Eatbook, Lady Iron Chef", tags: ["Dessert", "Chocolate"] },
  { name: "Homm Dessert", rating: 4.5, lat: 1.2939, lng: 103.8537, address: "252 North Bridge Road #B2-12 Raffles City, Singapore 179103", station: "city-hall", sources: "Eatbook, HungryGoWhere", tags: ["Dessert", "Bingsu", "Thai Dessert"] },
  { name: "Duke Dessert", rating: 4.5, lat: 1.3005, lng: 103.8530, address: "190 Middle Road #02-06 Fortune Centre, Singapore 188979", station: "bugis", sources: "Eatbook, HungryGoWhere", tags: ["Dessert", "Chinese Dessert"] },
  { name: "Warabimochi Kamakura", rating: 4.5, lat: 1.3115, lng: 103.7965, address: "1 Holland Village Way #01-11, Singapore 275746", station: "holland-village", sources: "Eatbook", tags: ["Dessert", "Japanese Dessert", "Mochi"] },
  { name: "Kind Kones", rating: 4.5, lat: 1.3043, lng: 103.8265, address: "583 Orchard Road #B1-27 Forum The Shopping Mall, Singapore 238884", station: "orchard", sources: "Eatbook, Burpple", tags: ["Dessert", "Ice Cream", "Vegan"] },
  { name: "Burnt Cones", rating: 4.5, lat: 1.3190, lng: 103.7678, address: "106 Clementi Street 12 #01-62, Singapore 120106", station: "clementi", sources: "Eatbook, Burpple", tags: ["Dessert", "Gelato", "Ice Cream"] },
  { name: "Edith Patisserie", rating: 4.5, lat: 1.2846, lng: 103.8321, address: "56 Eng Hoon Street #01-82, Singapore 160056", station: "tiong-bahru", sources: "Lady Iron Chef, Burpple", tags: ["Dessert", "Cakes", "Patisserie"] },
  { name: "Windowsill Pies", rating: 4.5, lat: 1.3033, lng: 103.9058, address: "50 East Coast Road #01-63 Roxy Square, Singapore 428769", station: "dakota", sources: "Eatbook, Burpple", tags: ["Dessert", "Pies", "Tarts"] },
  { name: "Wunderfolks", rating: 4.5, lat: 1.3531, lng: 103.9447, address: "4 Tampines Central 5 #03-24 Tampines Mall, Singapore 529510", station: "tampines", sources: "Eatbook, Burpple", tags: ["Dessert", "Tarts", "Bakery"] },
  { name: "Matchaya", rating: 4.5, lat: 1.3602, lng: 103.9894, address: "78 Airport Blvd #B2-256 Jewel Changi Airport, Singapore 819666", station: "changi-airport", sources: "Eatbook, Burpple", tags: ["Dessert", "Matcha", "Japanese Dessert"] }
];

async function addDesserts() {
  console.log('=== ADDING TOP RATED DESSERTS ===\n');

  // Create missing source if needed
  console.log('1. Creating Miss Tam Chiak source if needed...');
  await supabase.from('food_sources').upsert({
    id: 'misstamchiak',
    name: 'Miss Tam Chiak',
    icon: '🍜',
    bg_color: '#FEF3C7',
    weight: 25
  }, { onConflict: 'id' });

  // Get station coordinates
  console.log('\n2. Fetching station coordinates...');
  const { data: stations } = await supabase.from('stations').select('id, name, lat, lng');
  const stationMap = {};
  stations.forEach(s => stationMap[s.id] = s);

  // Add desserts
  console.log('\n3. Adding desserts...\n');
  let added = 0;
  let skipped = 0;

  for (const dessert of desserts) {
    // Check if exists
    const { data: existing } = await supabase
      .from('food_listings')
      .select('id')
      .ilike('name', dessert.name)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`SKIP (exists): ${dessert.name}`);
      skipped++;
      continue;
    }

    // Get station
    const station = stationMap[dessert.station];
    if (!station) {
      console.log(`SKIP (no station): ${dessert.name} - ${dessert.station}`);
      skipped++;
      continue;
    }

    // Calculate distance
    const straightLine = getDistance(station.lat, station.lng, dessert.lat, dessert.lng);
    const walkingDistance = Math.round(straightLine * 1.3);
    const walkingTime = Math.round(walkingDistance / 80) * 60; // seconds

    // Parse sources
    const sourceNames = dessert.sources.split(', ').map(s => s.trim());
    const sourceIds = sourceNames.map(name => sourceMapping[name]).filter(Boolean);

    // Insert listing
    const { data: inserted, error: insertError } = await supabase
      .from('food_listings')
      .insert({
        name: dessert.name,
        address: dessert.address,
        lat: dessert.lat,
        lng: dessert.lng,
        station_id: dessert.station,
        rating: dessert.rating,
        tags: dessert.tags,
        description: `Top-rated dessert spot (${dessert.rating}★). Featured on ${dessert.sources}`,
        is_active: true,
        distance_to_station: walkingDistance,
        walking_time: walkingTime
      })
      .select('id')
      .single();

    if (insertError) {
      console.log(`ERROR: ${dessert.name} - ${insertError.message}`);
      continue;
    }

    // Add source badges
    for (const sourceId of sourceIds) {
      await supabase
        .from('listing_sources')
        .upsert({
          listing_id: inserted.id,
          source_id: sourceId,
          is_primary: sourceId === sourceIds[0]
        }, { onConflict: 'listing_id,source_id' });
    }

    // Add dessert source badge
    await supabase
      .from('listing_sources')
      .upsert({
        listing_id: inserted.id,
        source_id: 'dessert',
        is_primary: false
      }, { onConflict: 'listing_id,source_id' });

    console.log(`ADDED: ${dessert.name}`);
    console.log(`  Station: ${station.name}`);
    console.log(`  Distance: ${walkingDistance}m, Walking: ${Math.round(walkingTime/60)} min`);
    console.log(`  Sources: ${sourceIds.join(', ')}\n`);
    added++;

    await new Promise(r => setTimeout(r, 50));
  }

  console.log(`\n=== DONE! Added: ${added}, Skipped: ${skipped} ===`);
}

addDesserts();
