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

async function removeFarListings() {
  // Get all listings
  const { data: listings } = await supabase
    .from('food_listings')
    .select('id, name, station_id, lat, lng, distance_to_station');

  // Get all stations
  const { data: stations } = await supabase
    .from('stations')
    .select('id, name, lat, lng');

  const stationMap = new Map(stations.map(s => [s.id, s]));

  console.log('Checking ' + listings.length + ' listings for distance > 2000m...\n');

  let toRemove = [];

  for (const listing of listings) {
    if (!listing.lat || !listing.lng || !listing.station_id) continue;

    const station = stationMap.get(listing.station_id);
    if (!station || !station.lat || !station.lng) continue;

    // Calculate actual distance from station
    const actualDistance = haversineDistance(listing.lat, listing.lng, station.lat, station.lng);

    if (actualDistance > 2000) {
      toRemove.push({
        id: listing.id,
        name: listing.name,
        station: listing.station_id,
        distance: Math.round(actualDistance)
      });
    }
  }

  console.log('Found ' + toRemove.length + ' listings > 2000m from their station:\n');

  toRemove.sort((a, b) => b.distance - a.distance);

  for (const item of toRemove) {
    console.log(item.name + ' | ' + item.station + ' | ' + item.distance + 'm');
  }

  if (toRemove.length > 0) {
    console.log('\nRemoving ' + toRemove.length + ' listings...\n');

    // First delete related prices
    const ids = toRemove.map(t => t.id);

    const { error: priceError } = await supabase
      .from('listing_prices')
      .delete()
      .in('listing_id', ids);

    if (priceError) {
      console.log('Error deleting prices: ' + priceError.message);
    }

    // Then delete the listings
    const { error: deleteError } = await supabase
      .from('food_listings')
      .delete()
      .in('id', ids);

    if (deleteError) {
      console.log('Error deleting listings: ' + deleteError.message);
    } else {
      console.log('Successfully removed ' + toRemove.length + ' listings.');
    }
  }

  // Get new count
  const { count } = await supabase
    .from('food_listings')
    .select('*', { count: 'exact', head: true });

  console.log('\nTotal listings remaining: ' + count);
}

removeFarListings().catch(console.error);
