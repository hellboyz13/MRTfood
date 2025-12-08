import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Use service_role key to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4'
);

const GOOGLE_PLACES_API_KEY = 'AIzaSyB2nTAy0K17gdWwlwJ2CYs4kbO0SUxYJvs';

async function getGooglePlacesNearby(lat: number, lng: number, radius: number) {
  const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
  url.searchParams.append('location', `${lat},${lng}`);
  url.searchParams.append('radius', radius.toString());
  url.searchParams.append('type', 'restaurant');
  url.searchParams.append('key', GOOGLE_PLACES_API_KEY);

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    console.error(`      Google Places API error: ${data.status}`);
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

async function main() {
  console.log('🔍 Finding stations with coordinates but no food...\n');

  // Step 1: Ensure the google_places source exists
  const { data: existingSource } = await supabase
    .from('food_sources')
    .select('id')
    .eq('id', 'google_places')
    .single();

  if (!existingSource) {
    console.log('Adding google_places source...');
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

  // Step 2: Get all stations with coordinates
  const { data: allStations, error: stationsError } = await supabase
    .from('stations')
    .select('id, name, lat, lng')
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .order('name');

  if (stationsError) {
    console.error('Error fetching stations:', stationsError);
    return;
  }

  console.log(`Found ${allStations?.length || 0} stations with coordinates\n`);

  // Step 3: For each station, check if it has food
  const stationsToPopulate: Array<{ id: string; name: string; lat: number; lng: number }> = [];

  for (const station of allStations || []) {
    // Check food listings
    const { data: listings } = await supabase
      .from('food_listings')
      .select('id')
      .eq('station_id', station.id)
      .eq('is_active', true);

    // Check chain outlets
    const { data: chains } = await supabase
      .from('chain_outlets')
      .select('id')
      .eq('nearest_station_id', station.id)
      .eq('is_active', true);

    const totalFood = (listings?.length || 0) + (chains?.length || 0);

    if (totalFood === 0) {
      stationsToPopulate.push(station);
    }
  }

  console.log(`🎯 Found ${stationsToPopulate.length} stations that need food:\n`);
  stationsToPopulate.slice(0, 10).forEach((s, i) => {
    console.log(`   ${(i + 1).toString().padStart(2)}. ${s.name}`);
  });
  if (stationsToPopulate.length > 10) {
    console.log(`   ... and ${stationsToPopulate.length - 10} more`);
  }
  console.log('');

  let totalAdded = 0;
  let processedCount = 0;

  // Step 4: Populate food for each empty station
  for (const station of stationsToPopulate) {
    processedCount++;
    console.log(`\n[${processedCount}/${stationsToPopulate.length}] 📍 ${station.name}`);
    console.log(`    Station ID: ${station.id}`);
    console.log(`    Location: ${station.lat}, ${station.lng}`);

    try {
      // Use 500m radius for LRT stations, 1000m for MRT
      const radius = 800; // A middle ground
      const places = await getGooglePlacesNearby(station.lat, station.lng, radius);

      if (places.length === 0) {
        console.log(`    ⚠️  No highly-rated restaurants found (rating > 4.5)`);
        continue;
      }

      console.log(`    Found ${places.length} restaurants with rating > 4.5`);

      // Limit to top 3 places per station to avoid overwhelming
      const topPlaces = places.slice(0, 3);

      for (const place of topPlaces) {
        console.log(`\n    ✨ ${place.name}`);
        console.log(`       Rating: ${place.rating} (${place.userRatingsTotal} reviews)`);

        // Extract tags from types
        const tags = place.types.filter((t: string) =>
          !['restaurant', 'food', 'point_of_interest', 'establishment'].includes(t)
        );

        // Create the listing
        const { data: listing, error: insertError } = await supabase
          .from('food_listings')
          .insert({
            station_id: station.id,
            name: place.name,
            description: `Rated ${place.rating}/5 by ${place.userRatingsTotal.toLocaleString()} reviewers on Google`,
            address: place.vicinity,
            tags: tags.length > 0 ? tags : ['Restaurant'],
            lat: place.lat,
            lng: place.lng,
            is_active: true,
          })
          .select()
          .single();

        if (insertError) {
          console.error(`       ❌ Error:`, insertError.message);
        } else {
          // Add the source mapping
          const { error: sourceError } = await supabase
            .from('listing_sources')
            .insert({
              listing_id: listing.id,
              source_id: 'google_places',
              source_url: `https://www.google.com/maps/place/?q=place_id:${place.placeId}`,
            });

          if (sourceError) {
            console.error(`       ❌ Error adding source:`, sourceError.message);
          } else {
            console.log(`       ✅ Added successfully (ID: ${listing.id})`);
            totalAdded++;
          }
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Wait between stations
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error: any) {
      console.error(`    ❌ Error processing ${station.name}:`, error.message);
    }
  }

  console.log(`\n\n✅ Complete!`);
  console.log(`   Processed: ${processedCount} stations`);
  console.log(`   Added: ${totalAdded} food listings`);
}

main().catch(console.error);
