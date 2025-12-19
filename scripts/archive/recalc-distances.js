const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bkzfrgrxfnqounyeqvvn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1Nzk5MzAsImV4cCI6MjA4MDE1NTkzMH0.wOYifcpHN4rxtg_gcDYPzzpAeXoOykBfP_jWLMMfdP4';

const supabase = createClient(supabaseUrl, supabaseKey);

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

async function recalcDistances() {
  console.log('=== RECALCULATING DISTANCES FOR REASSIGNED LISTINGS ===\n');

  // Get all stations with coordinates
  const { data: stations } = await supabase
    .from('stations')
    .select('id, name, lat, lng');

  const stationMap = {};
  stations.forEach(s => stationMap[s.id] = s);

  // Get listings that were reassigned (or all active ones)
  const { data: listings } = await supabase
    .from('food_listings')
    .select('id, name, lat, lng, station_id, distance_to_station')
    .eq('is_active', true);

  let updated = 0;
  for (const listing of listings) {
    if (!listing.lat || !listing.lng) continue;

    const station = stationMap[listing.station_id];
    if (!station || !station.lat || !station.lng) continue;

    const straightLine = haversineDistance(
      listing.lat, listing.lng,
      station.lat, station.lng
    );

    // Apply walking factor (1.3x straight line)
    const walkingDistance = Math.round(straightLine * 1.3);
    const walkingTime = Math.round((walkingDistance / 80) * 60); // 80m per minute, in seconds

    // Only update if significantly different
    if (!listing.distance_to_station ||
        Math.abs(listing.distance_to_station - walkingDistance) > 100) {

      await supabase
        .from('food_listings')
        .update({
          distance_to_station: walkingDistance,
          walking_time: walkingTime
        })
        .eq('id', listing.id);

      console.log(`Updated: ${listing.name}`);
      console.log(`  Old: ${listing.distance_to_station}m -> New: ${walkingDistance}m`);
      updated++;
    }
  }

  console.log(`\n=== Updated ${updated} listings ===`);
}

recalcDistances().catch(console.error);
