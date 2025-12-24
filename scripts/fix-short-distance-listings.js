const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function getCorrectCoordinates(name, stationName) {
  const searchQuery = `${name} ${stationName} Singapore restaurant`;

  const searchResponse = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.location'
    },
    body: JSON.stringify({
      textQuery: searchQuery,
      maxResultCount: 1
    })
  });

  const searchData = await searchResponse.json();

  if (!searchData.places || !searchData.places[0] || !searchData.places[0].location) {
    return null;
  }

  return {
    lat: searchData.places[0].location.latitude,
    lng: searchData.places[0].location.longitude,
    foundName: searchData.places[0].displayName?.text || 'Unknown'
  };
}

async function main() {
  console.log('=== FIXING SHORT DISTANCE LISTINGS (1-50m) ===\n');

  // Get all listings with 1-50m distance
  const { data: shortListings, error } = await supabase
    .from('food_listings')
    .select('id, name, station_id, lat, lng, distance_to_station, stations(name, lat, lng)')
    .eq('is_active', true)
    .gt('distance_to_station', 0)
    .lte('distance_to_station', 50)
    .order('distance_to_station');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${shortListings.length} listings with 1-50m distance\n`);

  let fixed = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < shortListings.length; i++) {
    const listing = shortListings[i];
    const stationName = listing.stations?.name || listing.station_id;
    const progress = `[${i + 1}/${shortListings.length}]`;

    console.log(`${progress} ${listing.name} @ ${stationName} (${listing.distance_to_station}m)`);

    try {
      const result = await getCorrectCoordinates(listing.name, stationName);

      if (!result) {
        console.log(`  ✗ No location found on Google`);
        failed++;
        continue;
      }

      // Check if new coords are significantly different (more than ~50m away from old coords)
      const latDiff = Math.abs(result.lat - listing.lat);
      const lngDiff = Math.abs(result.lng - listing.lng);
      const isDifferent = latDiff > 0.0005 || lngDiff > 0.0005; // ~50m threshold

      if (!isDifferent) {
        console.log(`  ⊘ New coords similar to old - skipping`);
        console.log(`    Old: ${listing.lat}, ${listing.lng}`);
        console.log(`    New: ${result.lat}, ${result.lng}`);
        skipped++;
        continue;
      }

      console.log(`  Found: ${result.foundName}`);
      console.log(`  Old: ${listing.lat}, ${listing.lng}`);
      console.log(`  New: ${result.lat}, ${result.lng}`);

      // Update coordinates in database
      const { error: updateError } = await supabase
        .from('food_listings')
        .update({ lat: result.lat, lng: result.lng })
        .eq('id', listing.id);

      if (updateError) {
        console.log(`  ✗ DB update failed: ${updateError.message}`);
        failed++;
      } else {
        console.log(`  ✓ Coordinates updated`);
        fixed++;
      }

      await delay(200);

    } catch (err) {
      console.log(`  ✗ Error: ${err.message}`);
      failed++;
    }
    console.log('');
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Fixed: ${fixed}`);
  console.log(`Skipped (coords similar): ${skipped}`);
  console.log(`Failed: ${failed}`);
}

main().catch(console.error);
