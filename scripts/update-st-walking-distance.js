const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Haversine formula for straight-line distance
function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Estimate walking distance (straight-line * 1.3 factor)
function getWalkingEstimate(fromLat, fromLng, toLat, toLng) {
  const straightLine = getDistanceMeters(fromLat, fromLng, toLat, toLng);
  const walkingDist = Math.round(straightLine * 1.3);
  const walkingTime = Math.round(walkingDist / 80); // 80m per minute
  return { distance: walkingDist, time: walkingTime };
}

async function run() {
  console.log('='.repeat(50));
  console.log('UPDATING WALKING DISTANCES FOR ST FOOD 2025');
  console.log('='.repeat(50));

  // Get stations
  const { data: stations } = await supabase.from('stations').select('id, lat, lng');
  const stationMap = {};
  stations.forEach(s => { stationMap[s.id] = s; });
  console.log(`Loaded ${stations.length} stations\n`);

  // Get ST Food listings
  const { data: listings } = await supabase
    .from('food_listings')
    .select('id, name, lat, lng, station_id')
    .eq('source_id', 'straits-times');

  console.log(`Processing ${listings.length} listings...\n`);

  for (const listing of listings) {
    const station = stationMap[listing.station_id];
    if (!station || !station.lat || !station.lng) {
      console.log(`SKIP (no station coords): ${listing.name} -> ${listing.station_id}`);
      continue;
    }

    const route = getWalkingEstimate(listing.lat, listing.lng, station.lat, station.lng);

    const { error } = await supabase
      .from('food_listings')
      .update({
        distance_to_station: route.distance,
        walking_time: route.time
      })
      .eq('id', listing.id);

    if (error) {
      console.log(`ERROR: ${listing.name} - ${error.message}`);
    } else {
      console.log(`${listing.name}: ${route.distance}m, ${route.time} min walk`);
    }
  }

  console.log('\nDone!');
}

run().catch(console.error);
