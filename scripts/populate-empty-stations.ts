import { createClient } from '@supabase/supabase-js';

// Use service_role key to bypass RLS
const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4'
);

const GOOGLE_PLACES_API_KEY = 'AIzaSyB2nTAy0K17gdWwlwJ2CYs4kbO0SUxYJvs';

// Station coordinates - you'll need to add actual lat/lng for each station
const STATION_COORDINATES: Record<string, { lat: number; lng: number; searchRadius: number }> = {
  // LRT stations (closer together, use 500m radius)
  'senja': { lat: 1.38356, lng: 103.76939, searchRadius: 500 },
  'jelapang': { lat: 1.38630, lng: 103.76402, searchRadius: 500 },
  'pending': { lat: 1.38941, lng: 103.76325, searchRadius: 500 },
  'petir': { lat: 1.37811, lng: 103.76671, searchRadius: 500 },
  'bangkit': { lat: 1.38019, lng: 103.77241, searchRadius: 500 },
  'fajar': { lat: 1.38471, lng: 103.77053, searchRadius: 500 },
  'segar': { lat: 1.38724, lng: 103.76958, searchRadius: 500 },

  // MRT stations that might be empty (use 1000m radius)
  'kranji': { lat: 1.42503, lng: 103.76197, searchRadius: 1000 },
  'marsiling': { lat: 1.43242, lng: 103.77400, searchRadius: 1000 },
  'admiralty': { lat: 1.44065, lng: 103.80091, searchRadius: 1000 },
  'sembawang': { lat: 1.44912, lng: 103.82010, searchRadius: 1000 },
  'canberra': { lat: 1.44310, lng: 103.82978, searchRadius: 1000 },
  'yishun': { lat: 1.42943, lng: 103.83509, searchRadius: 1000 },
  'khatib': { lat: 1.41726, lng: 103.83294, searchRadius: 1000 },
  'yio-chu-kang': { lat: 1.38191, lng: 103.84493, searchRadius: 1000 },
  'kovan': { lat: 1.36003, lng: 103.88486, searchRadius: 1000 },
  'pasir-ris': { lat: 1.37297, lng: 103.94930, searchRadius: 1000 },
  'expo': { lat: 1.33526, lng: 103.96139, searchRadius: 1000 },
  'changi-airport': { lat: 1.35735, lng: 103.98871, searchRadius: 1000 },
  'boon-lay': { lat: 1.33882, lng: 103.70598, searchRadius: 1000 },
  'pioneer': { lat: 1.33759, lng: 103.69738, searchRadius: 1000 },
  'joo-koon': { lat: 1.32776, lng: 103.67845, searchRadius: 1000 },
};

async function getGooglePlacesNearby(lat: number, lng: number, radius: number) {
  const apiKey = GOOGLE_PLACES_API_KEY;

  const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
  url.searchParams.append('location', `${lat},${lng}`);
  url.searchParams.append('radius', radius.toString());
  url.searchParams.append('type', 'restaurant');
  url.searchParams.append('key', apiKey);

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    console.error(`Google Places API error: ${data.status}`);
    return [];
  }

  // Filter for restaurants with rating > 4.5
  return data.results
    .filter((place: any) => place.rating && place.rating > 4.5)
    .map((place: any) => ({
      name: place.name,
      rating: place.rating,
      userRatingsTotal: place.user_ratings_total || 0,
      vicinity: place.vicinity,
      placeId: place.place_id,
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      types: place.types || [],
    }));
}

async function getPlaceDetails(placeId: string) {
  const apiKey = GOOGLE_PLACES_API_KEY;

  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  url.searchParams.append('place_id', placeId);
  url.searchParams.append('fields', 'website,formatted_phone_number,opening_hours');
  url.searchParams.append('key', apiKey);

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.status === 'OK') {
    return {
      website: data.result.website || null,
      phone: data.result.formatted_phone_number || null,
      openingHours: data.result.opening_hours?.weekday_text || null,
    };
  }

  return { website: null, phone: null, openingHours: null };
}

async function main() {
  console.log('🔍 Finding stations with no food listings...\n');

  // First, ensure the google_places source exists
  const { data: existingSource } = await supabase
    .from('food_sources')
    .select('id')
    .eq('id', 'google_places')
    .single();

  if (!existingSource) {
    console.log('Adding google_places source to food_sources table...');
    const { error } = await supabase
      .from('food_sources')
      .insert({
        id: 'google_places',
        name: 'Google Places',
        icon: '🗺️',
        url: 'https://www.google.com/maps',
        bg_color: '#E8F5E9',
      });

    if (error) {
      console.error('Error adding source:', error.message);
      return;
    }
    console.log('✓ Added google_places source\n');
  }

  // Get all unique station IDs that have listings
  const { data: listingsData, error: listingsError } = await supabase
    .from('food_listings')
    .select('station_id');

  if (listingsError) {
    console.error('Error fetching food listings:', listingsError);
    return;
  }

  const stationsWithListingsSet = new Set(listingsData.map((listing: any) => listing.station_id));

  // Find stations with coordinates but no listings
  const emptyStations = Object.keys(STATION_COORDINATES).filter(
    stationId => !stationsWithListingsSet.has(stationId)
  );

  console.log(`Found ${emptyStations.length} stations with no listings:`);
  console.log(emptyStations.join(', '));
  console.log('');

  let totalAdded = 0;

  for (const stationId of emptyStations) {
    const coords = STATION_COORDINATES[stationId];
    console.log(`\n📍 Processing ${stationId}...`);
    console.log(`   Location: ${coords.lat}, ${coords.lng}`);
    console.log(`   Search radius: ${coords.searchRadius}m`);

    try {
      // Search for nearby restaurants
      const places = await getGooglePlacesNearby(coords.lat, coords.lng, coords.searchRadius);

      console.log(`   Found ${places.length} restaurants with rating > 4.5`);

      for (const place of places) {
        console.log(`\n   ✨ ${place.name}`);
        console.log(`      Rating: ${place.rating} (${place.userRatingsTotal} reviews)`);
        console.log(`      Address: ${place.vicinity}`);

        // Get additional details
        const details = await getPlaceDetails(place.placeId);

        // Extract tags from types
        const tags = place.types.filter((t: string) =>
          !['restaurant', 'food', 'point_of_interest', 'establishment'].includes(t)
        );

        // Create the listing
        const { data: listing, error: insertError} = await supabase
          .from('food_listings')
          .insert({
            station_id: stationId,
            name: place.name,
            description: `Rated ${place.rating}/5 by ${place.userRatingsTotal} reviewers`,
            address: place.vicinity,
            tags: tags.length > 0 ? tags : ['Restaurant'],
            source_id: 'google_places',
            source_url: `https://www.google.com/maps/place/?q=place_id:${place.placeId}`,
            lat: place.lat,
            lng: place.lng,
            is_active: true,
          })
          .select()
          .single();

        if (insertError) {
          console.error(`      ❌ Error inserting listing:`, insertError);
        } else {
          console.log(`      ✅ Added to database (ID: ${listing.id})`);
          totalAdded++;
        }

        // Rate limiting - Google Places API has limits
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Wait between stations to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`   ❌ Error processing ${stationId}:`, error);
    }
  }

  console.log(`\n\n✅ Complete! Added ${totalAdded} food listings across ${emptyStations.length} stations.`);
}

main()
  .catch(console.error);
