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
  // Get Azme Nasi Lemak
  const { data: azme } = await supabase
    .from('food_listings')
    .select('*')
    .ilike('name', '%azme%');

  console.log('Azme listings found:', azme.length);
  azme.forEach(a => {
    console.log('');
    console.log('Name:', a.name);
    console.log('Address:', a.address);
    console.log('Lat/Lng:', a.lat, a.lng);
    console.log('Current Station:', a.station_id);
    console.log('Distance:', a.distance_to_station, 'm');
  });

  // Get all stations and find nearest for Azme
  const { data: stations } = await supabase.from('stations').select('id, name, lat, lng');

  console.log('\n\n=== Finding nearest stations for each Azme ===');

  for (const a of azme) {
    if (!a.lat || !a.lng) continue;

    console.log('\n' + a.name);
    console.log('Address: ' + a.address);

    // Find top 5 nearest stations
    const distances = stations
      .filter(s => s.lat && s.lng)
      .map(s => ({
        id: s.id,
        name: s.name,
        dist: Math.round(getDistance(a.lat, a.lng, s.lat, s.lng))
      }))
      .sort((x, y) => x.dist - y.dist)
      .slice(0, 5);

    distances.forEach((d, i) => {
      const marker = (d.id === a.station_id) ? ' <-- CURRENT' : '';
      console.log('  ' + (i+1) + '. ' + d.name + ' (' + d.id + ') - ' + d.dist + 'm' + marker);
    });
  }
}

check();
