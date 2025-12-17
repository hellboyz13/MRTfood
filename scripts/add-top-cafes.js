const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4'
);

// OneMap API for walking distance
async function getOneMapToken() {
  const email = process.env.ONEMAP_EMAIL;
  const password = process.env.ONEMAP_PASSWORD;

  if (!email || !password) {
    console.log('OneMap credentials not set, using fallback calculation');
    return null;
  }

  try {
    const response = await fetch('https://www.onemap.gov.sg/api/auth/post/getToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.log('Failed to get OneMap token:', error.message);
    return null;
  }
}

async function getWalkingDistance(token, startLat, startLng, endLat, endLng) {
  try {
    const url = new URL('https://www.onemap.gov.sg/api/public/routingsvc/route');
    url.searchParams.append('start', `${startLat},${startLng}`);
    url.searchParams.append('end', `${endLat},${endLng}`);
    url.searchParams.append('routeType', 'walk');

    const headers = { 'Accept': 'application/json' };
    if (token) headers['Authorization'] = token;

    const response = await fetch(url.toString(), { method: 'GET', headers });
    const data = await response.json();

    if (data.status === 0 && data.route_summary) {
      return {
        distance: Math.round(data.route_summary.total_distance),
        duration: Math.round(data.route_summary.total_time / 60),
        success: true
      };
    }
  } catch (error) {
    // Fall through to fallback
  }

  // Fallback: Haversine formula
  const R = 6371000;
  const dLat = (endLat - startLat) * Math.PI / 180;
  const dLng = (endLng - startLng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(startLat * Math.PI / 180) * Math.cos(endLat * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const straightLine = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const walkingDistance = Math.round(straightLine * 1.3);

  return {
    distance: walkingDistance,
    duration: Math.round(walkingDistance / 80),
    success: false
  };
}

// Source name to ID mapping
const sourceMapping = {
  'Daniel Food Diary': 'danielfooddiary',
  'Eatbook': 'eatbook',
  'Seth Lui': 'sethlui',
  'ieatishootipost': 'ieatishootipost',
  'HungryGoWhere': 'hungrygowhere',
  'Lady Iron Chef': 'ladyironchef',
  'Burpple': 'burpple'
};

const cafes = [
  { name: "Average Service", rating: 4.7, lat: 1.3091, lng: 103.8569, address: "315 Jalan Besar, Singapore 208973", station: "farrer-park", source: "Daniel Food Diary, Eatbook" },
  { name: "Chye Seng Huat Hardware", rating: 4.6, lat: 1.3113, lng: 103.8585, address: "150 Tyrwhitt Road, Singapore 207563", station: "lavender", source: "Seth Lui, ieatishootipost, HungryGoWhere" },
  { name: "Common Man Coffee Roasters", rating: 4.5, lat: 1.2904, lng: 103.8383, address: "22 Martin Road #01-00, Singapore 239058", station: "fort-canning", source: "Seth Lui, HungryGoWhere, Lady Iron Chef" },
  { name: "Tiong Bahru Bakery", rating: 4.5, lat: 1.2846, lng: 103.8334, address: "56 Eng Hoon Street #01-70, Singapore 160056", station: "tiong-bahru", source: "Daniel Food Diary, Seth Lui, Lady Iron Chef" },
  { name: "Atlas Coffeehouse", rating: 4.5, lat: 1.3214, lng: 103.8153, address: "6 Duke's Road, Singapore 268886", station: "botanic-gardens", source: "Eatbook, Burpple, HungryGoWhere, Lady Iron Chef" },
  { name: "Hello Arigato (Upper Thomson)", rating: 4.6, lat: 1.3545, lng: 103.8367, address: "227 Upper Thomson Road, Singapore 574359", station: "upper-thomson", source: "Daniel Food Diary, Lady Iron Chef, Eatbook" },
  { name: "Hello Arigato (Joo Chiat)", rating: 4.5, lat: 1.3114, lng: 103.9014, address: "314 Joo Chiat Road, Singapore 427565", station: "eunos", source: "Daniel Food Diary, Lady Iron Chef" },
  { name: "La Levain", rating: 4.6, lat: 1.3088, lng: 103.8604, address: "23 Hamilton Road, Singapore 209193", station: "lavender", source: "Eatbook, Daniel Food Diary" },
  { name: "The Populus Coffee and Food Co", rating: 4.5, lat: 1.2808, lng: 103.8421, address: "146 Neil Road, Singapore 088875", station: "outram-park", source: "Seth Lui, Burpple, HungryGoWhere" },
  { name: "Plain Vanilla (Tiong Bahru)", rating: 4.6, lat: 1.2842, lng: 103.8317, address: "1D Yong Siak Street, Singapore 168641", station: "tiong-bahru", source: "Daniel Food Diary, Lady Iron Chef" },
  { name: "Lola's Cafe", rating: 4.6, lat: 1.3245, lng: 103.8638, address: "5 Simon Road, Singapore 545893", station: "kovan", source: "Burpple, HungryGoWhere, Eatbook" },
  { name: "The Brewing Ground", rating: 4.6, lat: 1.3133, lng: 103.9068, address: "406 Joo Chiat Place #01-24, Singapore 428084", station: "eunos", source: "Eatbook" },
  { name: "Two Bakers", rating: 4.5, lat: 1.3100, lng: 103.8587, address: "88 Horne Road, Singapore 209083", station: "lavender", source: "Seth Lui, Burpple" },
  { name: "Tolido's Espresso Nook", rating: 4.5, lat: 1.3059, lng: 103.8616, address: "462 Crawford Lane #01-63, Singapore 190462", station: "lavender", source: "Seth Lui, Burpple" },
  { name: "Hvala", rating: 4.6, lat: 1.2993, lng: 103.8451, address: "2 Handy Road #01-09, Singapore 229233", station: "dhoby-ghaut", source: "Eatbook, Lady Iron Chef" },
  { name: "Alchemist (The Mill)", rating: 4.5, lat: 1.3201, lng: 103.8138, address: "1 North Bridge Road #01-19, Singapore 179094", station: "city-hall", source: "Seth Lui, Burpple" },
  { name: "Micro Bakery & Kitchen", rating: 4.7, lat: 1.3186, lng: 103.8122, address: "10 Jalan Serene #01-05, Singapore 258748", station: "botanic-gardens", source: "Daniel Food Diary, Seth Lui" },
  { name: "Wildseed Cafe", rating: 4.5, lat: 1.2756, lng: 103.8101, address: "10 Telok Blangah Green, Singapore 109178", station: "telok-blangah", source: "Lady Iron Chef, HungryGoWhere" },
  { name: "Little Rogue Coffee", rating: 4.6, lat: 1.3056, lng: 103.9042, address: "336 Tanjong Katong Road, Singapore 437108", station: "dakota", source: "HungryGoWhere, Burpple" },
  { name: "Five Oars Coffee Roasters", rating: 4.5, lat: 1.2758, lng: 103.8432, address: "6 Teck Lim Road, Singapore 088383", station: "outram-park", source: "Seth Lui, Eatbook" },
  { name: "Nylon Coffee Roasters", rating: 4.7, lat: 1.2767, lng: 103.8422, address: "4 Everton Park #01-40, Singapore 080004", station: "outram-park", source: "Seth Lui, Lady Iron Chef" },
  { name: "PS.Cafe (Harding Road)", rating: 4.5, lat: 1.2847, lng: 103.8112, address: "28B Harding Road, Singapore 249549", station: "redhill", source: "HungryGoWhere, Burpple" },
  { name: "Punch", rating: 4.5, lat: 1.2786, lng: 103.8426, address: "32 North Canal Road, Singapore 059286", station: "raffles-place", source: "Lady Iron Chef, Burpple" },
  { name: "Elijah Pies", rating: 4.6, lat: 1.2764, lng: 103.8458, address: "1 Tanjong Pagar Plaza #02-44, Singapore 082001", station: "tanjong-pagar", source: "Lady Iron Chef, Eatbook" },
  { name: "Alice Boulangerie", rating: 4.5, lat: 1.2753, lng: 103.8415, address: "12 Gopeng Street #01-05, Singapore 078877", station: "tanjong-pagar", source: "Daniel Food Diary, HungryGoWhere, Eatbook" }
];

async function addCafes() {
  console.log('=== ADDING TOP RATED CAFES ===\n');

  // Step 1: Create missing sources
  console.log('1. Creating missing sources...');
  const missingSources = [
    { id: 'sethlui', name: 'Seth Lui', icon: '👨‍🍳', bg_color: '#FEE2E2', weight: 30 },
    { id: 'ladyironchef', name: 'Lady Iron Chef', icon: '👩‍🍳', bg_color: '#FCE7F3', weight: 30 },
    { id: 'burpple', name: 'Burpple', icon: '🍽️', bg_color: '#E0F2FE', weight: 25 }
  ];

  for (const source of missingSources) {
    const { error } = await supabase
      .from('food_sources')
      .upsert(source, { onConflict: 'id' });
    if (error) {
      console.log(`  Source ${source.id}:`, error.message);
    } else {
      console.log(`  Created/updated: ${source.name}`);
    }
  }

  // Step 2: Get station coordinates
  console.log('\n2. Fetching station coordinates...');
  const { data: stations } = await supabase.from('stations').select('id, name, lat, lng');
  const stationMap = {};
  stations.forEach(s => stationMap[s.id] = s);

  // Step 3: Get OneMap token
  console.log('\n3. Getting OneMap token...');
  const token = await getOneMapToken();
  console.log(token ? '  Token obtained!' : '  Using fallback calculation');

  // Step 4: Add cafes
  console.log('\n4. Adding cafes...\n');
  let added = 0;
  let skipped = 0;

  for (const cafe of cafes) {
    // Check if exists
    const { data: existing } = await supabase
      .from('food_listings')
      .select('id')
      .ilike('name', cafe.name)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`SKIP (exists): ${cafe.name}`);
      skipped++;
      continue;
    }

    // Get station coordinates
    const station = stationMap[cafe.station];
    if (!station) {
      console.log(`SKIP (no station): ${cafe.name} - ${cafe.station}`);
      skipped++;
      continue;
    }

    // Calculate walking distance using OneMap
    const walkingResult = await getWalkingDistance(token, station.lat, station.lng, cafe.lat, cafe.lng);

    // Parse sources
    const sourceNames = cafe.source.split(', ').map(s => s.trim());
    const sourceIds = sourceNames.map(name => sourceMapping[name]).filter(Boolean);

    // Insert listing
    const { data: inserted, error: insertError } = await supabase
      .from('food_listings')
      .insert({
        name: cafe.name,
        address: cafe.address,
        lat: cafe.lat,
        lng: cafe.lng,
        station_id: cafe.station,
        tags: ['Cafe', 'Coffee', 'Brunch'],
        description: `Highly rated cafe (${cafe.rating}★). Featured on ${cafe.source}`,
        is_active: true,
        distance_to_station: walkingResult.distance,
        walking_time: walkingResult.duration * 60 // Convert to seconds
      })
      .select('id')
      .single();

    if (insertError) {
      console.log(`ERROR: ${cafe.name} - ${insertError.message}`);
      continue;
    }

    // Add source badges
    for (const sourceId of sourceIds) {
      const { error: sourceError } = await supabase
        .from('listing_sources')
        .upsert({
          listing_id: inserted.id,
          source_id: sourceId,
          is_primary: sourceId === sourceIds[0]
        }, { onConflict: 'listing_id,source_id' });

      if (sourceError && !sourceError.message.includes('duplicate')) {
        console.log(`  Source error for ${cafe.name}:`, sourceError.message);
      }
    }

    const methodNote = walkingResult.success ? 'OneMap' : 'estimated';
    console.log(`ADDED: ${cafe.name}`);
    console.log(`  Station: ${station.name}`);
    console.log(`  Distance: ${walkingResult.distance}m (${methodNote})`);
    console.log(`  Walking: ${walkingResult.duration} min`);
    console.log(`  Sources: ${sourceIds.join(', ')}\n`);
    added++;

    // Small delay for API rate limiting
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\n=== DONE! Added: ${added}, Skipped: ${skipped} ===`);
}

addCafes();
