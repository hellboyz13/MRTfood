const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

let ACCESS_TOKEN = null;

async function getToken() {
  const response = await fetch('https://www.onemap.gov.sg/api/auth/post/getToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.ONEMAP_EMAIL,
      password: process.env.ONEMAP_PASSWORD
    })
  });
  const data = await response.json();
  if (data.access_token) {
    ACCESS_TOKEN = data.access_token;
    return true;
  }
  return false;
}

async function getWalkingRoute(startLat, startLng, endLat, endLng) {
  const url = 'https://www.onemap.gov.sg/api/public/routingsvc/route?' + new URLSearchParams({
    start: `${startLat},${startLng}`,
    end: `${endLat},${endLng}`,
    routeType: 'walk'
  });

  const response = await fetch(url, {
    headers: { 'Authorization': ACCESS_TOKEN }
  });

  const data = await response.json();

  if (data.status === 0 && data.route_summary) {
    return {
      distance: data.route_summary.total_distance,
      time: Math.round(data.route_summary.total_time / 60)
    };
  }
  return null;
}

async function main() {
  console.log('=== RECALCULATING FIXED LISTINGS ===\n');

  await getToken();

  // Get station coords
  const { data: stations } = await supabase
    .from('stations')
    .select('id, lat, lng');

  const stationMap = {};
  stations.forEach(s => stationMap[s.id] = { lat: s.lat, lng: s.lng });

  // Get the fixed listings
  const names = ['Coastal Settlement', 'Ela', 'Kungfu JB Pau'];

  for (const name of names) {
    const { data: listings } = await supabase
      .from('food_listings')
      .select('id, name, station_id, lat, lng')
      .eq('is_active', true)
      .ilike('name', `%${name}%`);

    for (const listing of listings || []) {
      const station = stationMap[listing.station_id];
      if (!station || !listing.lat || !listing.lng) continue;

      const route = await getWalkingRoute(station.lat, station.lng, listing.lat, listing.lng);

      if (route) {
        await supabase
          .from('food_listings')
          .update({ distance_to_station: route.distance, walking_time: route.time })
          .eq('id', listing.id);

        console.log(`${listing.name} @ ${listing.station_id}: ${route.distance}m, ${route.time}min`);
      }
    }
  }

  console.log('\n=== DONE ===');
}

main();
