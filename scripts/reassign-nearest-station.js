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

async function reassignToNearestStation() {
  // Get all listings
  const { data: listings } = await supabase
    .from('food_listings')
    .select('id, name, station_id, lat, lng')
    .not('lat', 'is', null)
    .not('lng', 'is', null);

  // Get all stations
  const { data: stations } = await supabase
    .from('stations')
    .select('id, name, lat, lng')
    .not('lat', 'is', null)
    .not('lng', 'is', null);

  console.log('Checking ' + listings.length + ' listings for nearest station...\n');

  let reassigned = 0;
  let alreadyCorrect = 0;

  for (const listing of listings) {
    // Find nearest station
    let nearestStation = null;
    let minDistance = Infinity;

    for (const station of stations) {
      const distance = haversineDistance(listing.lat, listing.lng, station.lat, station.lng);
      if (distance < minDistance) {
        minDistance = distance;
        nearestStation = station;
      }
    }

    if (!nearestStation) continue;

    // Check if current station is the nearest
    if (listing.station_id === nearestStation.id) {
      alreadyCorrect++;
      continue;
    }

    // Calculate current station distance
    const currentStation = stations.find(s => s.id === listing.station_id);
    const currentDistance = currentStation
      ? haversineDistance(listing.lat, listing.lng, currentStation.lat, currentStation.lng)
      : Infinity;

    // Only reassign if nearest is significantly closer (>200m)
    if (currentDistance - minDistance > 200) {
      console.log(listing.name);
      console.log('  Current: ' + listing.station_id + ' (' + Math.round(currentDistance) + 'm)');
      console.log('  Nearest: ' + nearestStation.id + ' (' + Math.round(minDistance) + 'm)');
      console.log('  -> Reassigning');

      const { error } = await supabase
        .from('food_listings')
        .update({ station_id: nearestStation.id })
        .eq('id', listing.id);

      if (error) {
        console.log('  Error: ' + error.message);
      } else {
        reassigned++;
      }
      console.log('');
    } else {
      alreadyCorrect++;
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log('Already at nearest station: ' + alreadyCorrect);
  console.log('Reassigned to nearer station: ' + reassigned);
}

reassignToNearestStation().catch(console.error);
