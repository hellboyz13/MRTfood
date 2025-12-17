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

async function fixIssues() {
  console.log('=== FIXING LISTING ISSUES ===\n');

  // Get station coordinates
  const { data: stations } = await supabase.from('stations').select('id, name, lat, lng');
  const stationMap = {};
  stations.forEach(s => stationMap[s.id] = s);

  // 1. FIX MISSING DISTANCES
  console.log('1. FIXING MISSING DISTANCE DATA\n');

  // Get listings with missing data
  const { data: missingData } = await supabase
    .from('food_listings')
    .select('id, name, lat, lng, station_id, distance_to_station, walking_time')
    .eq('is_active', true)
    .or('distance_to_station.is.null,walking_time.is.null');

  for (const listing of missingData) {
    const station = stationMap[listing.station_id];
    if (!station) {
      console.log(`  SKIP: ${listing.name} - no station found`);
      continue;
    }

    // Calculate distance using Haversine
    const straightLine = getDistance(station.lat, station.lng, listing.lat, listing.lng);
    const walkingDistance = Math.round(straightLine * 1.3); // 1.3x for walking paths
    const walkingTime = Math.round(walkingDistance / 80) * 60; // 80m/min, in seconds

    const { error } = await supabase
      .from('food_listings')
      .update({
        distance_to_station: walkingDistance,
        walking_time: walkingTime
      })
      .eq('id', listing.id);

    if (error) {
      console.log(`  ERROR: ${listing.name} - ${error.message}`);
    } else {
      console.log(`  FIXED: ${listing.name}`);
      console.log(`    Distance: ${walkingDistance}m, Walking: ${Math.round(walkingTime/60)} min`);
    }
  }

  // 2. REMOVE DUPLICATE (Miss Saigon at Bencoolen - keeping Somerset)
  console.log('\n2. REMOVING DUPLICATE\n');

  // First check both Miss Saigon listings
  const { data: duplicates } = await supabase
    .from('food_listings')
    .select('id, name, station_id, rating, created_at')
    .ilike('name', 'Miss Saigon');

  console.log('  Found Miss Saigon entries:');
  duplicates.forEach(d => {
    console.log(`    - ${d.name} at ${d.station_id}, rating: ${d.rating}, created: ${d.created_at}`);
  });

  // Deactivate the Bencoolen one (keep Somerset as it's a more central location)
  const bencoolen = duplicates.find(d => d.station_id === 'bencoolen');
  if (bencoolen) {
    // First remove listing_sources for this listing
    await supabase
      .from('listing_sources')
      .delete()
      .eq('listing_id', bencoolen.id);

    // Then deactivate the listing
    const { error } = await supabase
      .from('food_listings')
      .update({ is_active: false })
      .eq('id', bencoolen.id);

    if (error) {
      console.log(`  ERROR removing duplicate: ${error.message}`);
    } else {
      console.log(`  REMOVED: Miss Saigon at Bencoolen (keeping Somerset)`);
    }
  }

  console.log('\n=== FIXES COMPLETE ===');
}

fixIssues();
