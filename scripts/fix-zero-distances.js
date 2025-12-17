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

async function fixZeroDistances() {
  console.log('=== FIXING ZERO/LOW DISTANCE DATA ===\n');

  // Get station coordinates
  const { data: stations } = await supabase.from('stations').select('id, name, lat, lng');
  const stationMap = {};
  stations.forEach(s => stationMap[s.id] = s);

  // Get listings with zero or very low distance (less than 50m is suspicious)
  const { data: listings } = await supabase
    .from('food_listings')
    .select('id, name, lat, lng, station_id, distance_to_station, walking_time')
    .eq('is_active', true)
    .or('distance_to_station.eq.0,walking_time.eq.0,distance_to_station.lt.50');

  console.log(`Found ${listings.length} listings with zero/low distance\n`);

  for (const listing of listings) {
    const station = stationMap[listing.station_id];
    if (!station) {
      console.log(`SKIP: ${listing.name} - no station found`);
      continue;
    }

    // Calculate distance using Haversine
    const straightLine = getDistance(station.lat, station.lng, listing.lat, listing.lng);
    const walkingDistance = Math.round(straightLine * 1.3); // 1.3x for walking paths
    const walkingTime = Math.round(walkingDistance / 80) * 60; // 80m/min, in seconds

    // Only update if different
    if (walkingDistance !== listing.distance_to_station || walkingTime !== listing.walking_time) {
      const { error } = await supabase
        .from('food_listings')
        .update({
          distance_to_station: walkingDistance,
          walking_time: walkingTime
        })
        .eq('id', listing.id);

      if (error) {
        console.log(`ERROR: ${listing.name} - ${error.message}`);
      } else {
        console.log(`FIXED: ${listing.name}`);
        console.log(`  Was: ${listing.distance_to_station}m, ${listing.walking_time}s`);
        console.log(`  Now: ${walkingDistance}m, ${walkingTime}s (${Math.round(walkingTime/60)} min)\n`);
      }
    } else {
      console.log(`OK: ${listing.name} - values correct`);
    }
  }

  console.log('\n=== DONE ===');
}

fixZeroDistances();
