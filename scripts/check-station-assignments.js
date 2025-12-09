const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4'
);

// Haversine formula for distance in meters
function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

async function check() {
  // Get all stations
  const { data: stations } = await supabase.from('stations').select('id, name, lat, lng');

  // Get listings with distance > 800m
  const { data: listings } = await supabase
    .from('food_listings')
    .select('id, name, station_id, lat, lng, distance_to_station')
    .gt('distance_to_station', 800)
    .eq('is_active', true)
    .order('distance_to_station', { ascending: false });

  console.log('Checking', listings.length, 'listings with distance > 800m\n');
  console.log('='.repeat(80));

  const misassigned = [];

  for (const listing of listings) {
    if (!listing.lat || !listing.lng) continue;

    // Find actual nearest station
    let nearest = null;
    let nearestDist = Infinity;

    for (const station of stations) {
      if (!station.lat || !station.lng) continue;
      const dist = getDistance(listing.lat, listing.lng, station.lat, station.lng);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = station;
      }
    }

    const currentStation = stations.find(s => s.id === listing.station_id);
    const currentDist = currentStation ?
      getDistance(listing.lat, listing.lng, currentStation.lat, currentStation.lng) : null;

    // Check if misassigned (nearest station is different and significantly closer)
    if (nearest && nearest.id !== listing.station_id && nearestDist < currentDist - 100) {
      misassigned.push({
        id: listing.id,
        name: listing.name,
        currentStation: listing.station_id,
        currentDist: Math.round(currentDist),
        nearestStation: nearest.id,
        nearestStationName: nearest.name,
        nearestDist: Math.round(nearestDist)
      });

      console.log(listing.name);
      console.log('  Current: ' + listing.station_id + ' (' + Math.round(currentDist) + 'm)');
      console.log('  Should be: ' + nearest.id + ' (' + Math.round(nearestDist) + 'm)');
      console.log('  Savings: ' + Math.round(currentDist - nearestDist) + 'm');
      console.log('');
    }
  }

  console.log('='.repeat(80));
  console.log('\nSummary:');
  console.log('Total checked:', listings.length);
  console.log('Misassigned:', misassigned.length);
  console.log('Correctly assigned (just far):', listings.length - misassigned.length);

  // Fix misassigned ones
  if (misassigned.length > 0) {
    console.log('\n\nFixing misassigned listings...\n');

    for (const m of misassigned) {
      const walkingTime = Math.round(m.nearestDist / 80 * 60); // seconds

      const { error } = await supabase
        .from('food_listings')
        .update({
          station_id: m.nearestStation,
          distance_to_station: m.nearestDist,
          walking_time: walkingTime
        })
        .eq('id', m.id);

      if (error) {
        console.log('Error fixing', m.name, ':', error.message);
      } else {
        console.log('Fixed:', m.name, '→', m.nearestStationName, '(' + m.nearestDist + 'm)');
      }
    }
  }
}

check();
