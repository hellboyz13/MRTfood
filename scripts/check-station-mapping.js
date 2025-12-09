const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4'
);

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
  // Get all stations with coordinates
  const { data: stationsData, error: stErr } = await supabase.from('stations').select('id, name, lat, lng');

  if (stErr || !stationsData) {
    console.log('Error fetching stations:', stErr);
    return;
  }

  const stations = {};
  stationsData.forEach(s => {
    if (s.lat && s.lng) {
      stations[s.id] = { lat: s.lat, lng: s.lng, name: s.name };
    }
  });

  console.log('Loaded', Object.keys(stations).length, 'stations with coordinates\n');

  // Get all listings with coordinates
  const { data: listings, error: lErr } = await supabase
    .from('food_listings')
    .select('id, name, address, station_id, lat, lng')
    .not('lat', 'is', null);

  if (lErr || !listings) {
    console.log('Error fetching listings:', lErr);
    return;
  }

  console.log('Checking', listings.length, 'listings with coordinates\n');

  let mismatches = [];

  for (const listing of listings) {
    if (!listing.lat || !listing.lng) continue;

    // Find actual nearest station
    let nearest = null;
    let nearestDist = Infinity;

    for (const [id, coords] of Object.entries(stations)) {
      const dist = getDistance(listing.lat, listing.lng, coords.lat, coords.lng);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = id;
      }
    }

    const assignedStation = stations[listing.station_id];
    const assignedDist = assignedStation ?
      getDistance(listing.lat, listing.lng, assignedStation.lat, assignedStation.lng) : null;

    if (nearest !== listing.station_id) {
      mismatches.push({
        id: listing.id,
        name: listing.name,
        address: listing.address,
        assigned: listing.station_id,
        assignedDist: assignedDist ? Math.round(assignedDist) : 'N/A',
        nearest: nearest,
        nearestDist: Math.round(nearestDist)
      });
    }
  }

  // Sort by distance difference (worst first)
  mismatches.sort((a, b) => {
    const diffA = typeof a.assignedDist === 'number' ? a.assignedDist - a.nearestDist : 10000;
    const diffB = typeof b.assignedDist === 'number' ? b.assignedDist - b.nearestDist : 10000;
    return diffB - diffA;
  });

  console.log('=== MISMATCHED LISTINGS ===\n');

  for (let i = 0; i < Math.min(30, mismatches.length); i++) {
    const m = mismatches[i];
    console.log(`${i+1}. ${m.name}`);
    console.log(`   Address: ${m.address}`);
    console.log(`   Assigned: ${m.assigned} (${m.assignedDist}m)`);
    console.log(`   Should be: ${m.nearest} (${m.nearestDist}m)`);
    console.log('');
  }

  console.log('=== SUMMARY ===');
  console.log(`Total listings checked: ${listings.length}`);
  console.log(`Mismatched: ${mismatches.length}`);
  console.log(`Correct: ${listings.length - mismatches.length}`);
}

check().catch(console.error);
