const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4'
);

// Haversine formula for distance in meters
function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

async function updateSupperDistances() {
  // Get all stations
  const { data: stations } = await supabase.from('stations').select('id, name, lat, lng');

  // Get supper listings (have "Supper" in tags)
  const { data: listings } = await supabase
    .from('food_listings')
    .select('id, name, lat, lng, station_id, tags, distance_to_station')
    .contains('tags', ['Supper'])
    .eq('is_active', true);

  console.log(`Found ${listings.length} supper listings\n`);

  let updated = 0;
  for (const listing of listings) {
    if (!listing.lat || !listing.lng || !listing.station_id) {
      console.log(`SKIP (no coords/station): ${listing.name}`);
      continue;
    }

    // Find the station
    const station = stations.find(s => s.id === listing.station_id);
    if (!station || !station.lat || !station.lng) {
      console.log(`SKIP (station not found): ${listing.name} - ${listing.station_id}`);
      continue;
    }

    // Calculate distance
    const distance = Math.round(getDistance(listing.lat, listing.lng, station.lat, station.lng));
    const walkingTime = Math.round(distance / 80 * 60); // 80m/min walking speed, convert to seconds

    // Only update if distance is missing or different
    if (listing.distance_to_station !== distance) {
      const { error } = await supabase
        .from('food_listings')
        .update({
          distance_to_station: distance,
          walking_time: walkingTime
        })
        .eq('id', listing.id);

      if (error) {
        console.log(`ERROR: ${listing.name} - ${error.message}`);
      } else {
        console.log(`UPDATED: ${listing.name}`);
        console.log(`  Station: ${station.name}`);
        console.log(`  Distance: ${distance}m`);
        console.log(`  Walking: ${Math.round(walkingTime/60)} min\n`);
        updated++;
      }
    } else {
      console.log(`OK: ${listing.name} - already has distance ${distance}m`);
    }
  }

  console.log(`\nDone! Updated ${updated} listings.`);
}

updateSupperDistances();
