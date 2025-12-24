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
  console.log('=== FIXING ZERO DISTANCE LISTINGS ===\n');

  // Get all listings with 0m distance
  const { data: zeroListings, error } = await supabase
    .from('food_listings')
    .select('id, name, station_id, lat, lng, stations(name, lat, lng)')
    .eq('is_active', true)
    .eq('distance_to_station', 0);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${zeroListings.length} listings with 0m distance\n`);

  let fixed = 0;
  let failed = 0;

  for (let i = 0; i < zeroListings.length; i++) {
    const listing = zeroListings[i];
    const stationName = listing.stations?.name || listing.station_id;
    const progress = `[${i + 1}/${zeroListings.length}]`;

    console.log(`${progress} ${listing.name} @ ${stationName}`);

    try {
      const result = await getCorrectCoordinates(listing.name, stationName);

      if (!result) {
        console.log(`  ✗ No location found on Google`);
        failed++;
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
  console.log(`Failed: ${failed}`);
}

main().catch(console.error);
