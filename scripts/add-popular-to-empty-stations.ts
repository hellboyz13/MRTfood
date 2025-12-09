import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local file
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4'
);

const GOOGLE_API_KEY = 'AIzaSyB2nTAy0K17gdWwlwJ2CYs4kbO0SUxYJvs';

// Check if OpenAI API key is available
const openaiApiKey = process.env.OPENAI_API_KEY;
let openai: OpenAI | null = null;
let USE_AI_FILTERING = false;

if (openaiApiKey) {
  openai = new OpenAI({ apiKey: openaiApiKey });
  USE_AI_FILTERING = true;
}

// Configuration
const MIN_RATING = 4.5;
const MAX_RESTAURANTS_PER_STATION = 5;
const TARGET_FOOD_IMAGES = 20;
const SEARCH_RADIUS_METERS = 500; // 500m radius from station

interface GooglePlace {
  place_id: string;
  name: string;
  rating?: number;
  user_ratings_total?: number;
  vicinity?: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types?: string[];
  photos?: { photo_reference: string; width: number; height: number }[];
}

interface PlaceDetailsResult {
  result?: {
    place_id: string;
    name: string;
    formatted_address?: string;
    rating?: number;
    user_ratings_total?: number;
    geometry?: {
      location: {
        lat: number;
        lng: number;
      };
    };
    photos?: { photo_reference: string; width: number; height: number }[];
    types?: string[];
    opening_hours?: {
      weekday_text?: string[];
    };
  };
  status: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Search for restaurants near a location using Google Places Nearby Search
async function searchNearbyRestaurants(lat: number, lng: number, stationName: string): Promise<GooglePlace[]> {
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${SEARCH_RADIUS_METERS}&type=restaurant&key=${GOOGLE_API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.log(`  ⚠️  Search status: ${data.status}`);
      return [];
    }

    if (!data.results || data.results.length === 0) {
      return [];
    }

    // Filter for high-rated restaurants
    const highRated = data.results.filter((place: GooglePlace) =>
      place.rating && place.rating >= MIN_RATING &&
      place.user_ratings_total && place.user_ratings_total >= 50 // At least 50 reviews
    );

    // Sort by rating (highest first), then by number of reviews
    highRated.sort((a: GooglePlace, b: GooglePlace) => {
      if (b.rating !== a.rating) return (b.rating || 0) - (a.rating || 0);
      return (b.user_ratings_total || 0) - (a.user_ratings_total || 0);
    });

    return highRated.slice(0, MAX_RESTAURANTS_PER_STATION);
  } catch (error) {
    console.error(`  ❌ Error searching near ${stationName}:`, error);
    return [];
  }
}

// Get detailed place information including more photos
async function getPlaceDetails(placeId: string): Promise<PlaceDetailsResult['result'] | null> {
  const fields = 'place_id,name,formatted_address,rating,user_ratings_total,geometry,photos,types,opening_hours';
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_API_KEY}`;

  try {
    const response = await fetch(url);
    const data: PlaceDetailsResult = await response.json();

    if (data.status !== 'OK' || !data.result) {
      return null;
    }

    return data.result;
  } catch (error) {
    console.error(`  ❌ Error getting place details:`, error);
    return null;
  }
}

// Use ChatGPT to determine if an image is food
async function isFoodImage(imageUrl: string): Promise<boolean> {
  if (!openai) return true; // If no AI, accept all images

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Is this image showing food, dishes, or meals that you would eat at a restaurant? Answer with ONLY 'yes' or 'no'. Images of restaurant interiors, exteriors, logos, signs, people, menus without food, or drinks without food should be 'no'. Only actual prepared food/dishes should be 'yes'."
            },
            {
              type: "image_url",
              image_url: { url: imageUrl }
            }
          ]
        }
      ],
      max_tokens: 10
    });

    const answer = response.choices[0]?.message?.content?.toLowerCase().trim() || 'no';
    return answer.includes('yes');
  } catch (error) {
    console.error(`    ⚠️  AI vetting error:`, error);
    return true; // If error, accept the image
  }
}

// Generate photo URL from reference
function getPhotoUrl(photoReference: string, maxWidth: number = 800): string {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${GOOGLE_API_KEY}`;
}

// Calculate distance between two points
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Generate tags based on place types
function generateTags(types: string[] | undefined, name: string): string[] {
  const tags: string[] = [];

  // Common cuisine keywords in restaurant names
  const cuisineKeywords: Record<string, string> = {
    'chinese': 'Chinese',
    'japanese': 'Japanese',
    'korean': 'Korean',
    'thai': 'Thai',
    'indian': 'Indian',
    'malay': 'Malay',
    'indonesian': 'Indonesian',
    'vietnamese': 'Vietnamese',
    'italian': 'Italian',
    'western': 'Western',
    'american': 'American',
    'mexican': 'Mexican',
    'french': 'French',
    'mediterranean': 'Mediterranean',
    'dim sum': 'Dim Sum',
    'sushi': 'Sushi',
    'ramen': 'Ramen',
    'pho': 'Pho',
    'curry': 'Curry',
    'bbq': 'BBQ',
    'grill': 'Grill',
    'seafood': 'Seafood',
    'vegetarian': 'Vegetarian',
    'halal': 'Halal',
    'hawker': 'Hawker',
    'cafe': 'Cafe',
    'bakery': 'Bakery',
    'dessert': 'Dessert',
    'noodle': 'Noodles',
    'rice': 'Rice',
    'chicken': 'Chicken',
    'beef': 'Beef',
    'pork': 'Pork',
    'duck': 'Duck',
    'fish': 'Fish',
    'prawn': 'Seafood',
    'crab': 'Seafood',
  };

  const nameLower = name.toLowerCase();
  for (const [keyword, tag] of Object.entries(cuisineKeywords)) {
    if (nameLower.includes(keyword) && !tags.includes(tag)) {
      tags.push(tag);
    }
  }

  // Add based on Google place types
  if (types) {
    if (types.includes('cafe')) tags.push('Cafe');
    if (types.includes('bakery')) tags.push('Bakery');
    if (types.includes('bar')) tags.push('Bar');
  }

  // Default tag if no specific cuisine found
  if (tags.length === 0) {
    tags.push('Restaurant');
  }

  return tags.slice(0, 5); // Max 5 tags
}

// Ensure the 'popular' source exists
async function ensurePopularSourceExists(): Promise<boolean> {
  const { data: existingSource } = await supabase
    .from('food_sources')
    .select('id')
    .eq('id', 'popular')
    .single();

  if (!existingSource) {
    console.log('Adding "popular" source to food_sources table...');
    const { error } = await supabase
      .from('food_sources')
      .insert({
        id: 'popular',
        name: 'Popular',
        icon: '⭐',
        url: '',
        bg_color: '#FEF3C7', // amber-100
      });

    if (error) {
      console.error('Error adding source:', error.message);
      return false;
    }
    console.log('Source added successfully!');
  }
  return true;
}

// Get all stations with 0 food listings
async function getEmptyStations(): Promise<{ id: string; name: string; lat: number; lng: number }[]> {
  const { data: stations } = await supabase.from('stations').select('id, name, lat, lng');
  const { data: listings } = await supabase.from('food_listings').select('station_id');

  if (!stations || !listings) {
    console.log('Error fetching data');
    return [];
  }

  const stationCounts: Record<string, number> = {};
  stations.forEach(s => stationCounts[s.id] = 0);
  listings.forEach(l => {
    if (l.station_id && stationCounts[l.station_id] !== undefined) {
      stationCounts[l.station_id]++;
    }
  });

  const empty = stations
    .filter(s => stationCounts[s.id] === 0 && s.lat && s.lng)
    .sort((a, b) => a.name.localeCompare(b.name));

  return empty;
}

// Check if restaurant already exists in database
async function restaurantExists(name: string, lat: number, lng: number): Promise<boolean> {
  // Check by name similarity
  const { data: byName } = await supabase
    .from('food_listings')
    .select('id, lat, lng')
    .ilike('name', `%${name.split(' ').slice(0, 2).join(' ')}%`)
    .limit(5);

  if (byName && byName.length > 0) {
    // Check if any are within 50 meters
    for (const listing of byName) {
      if (listing.lat && listing.lng) {
        const distance = calculateDistance(lat, lng, listing.lat, listing.lng);
        if (distance < 0.05) { // 50 meters
          return true;
        }
      }
    }
  }

  return false;
}

// Store menu images for a listing
async function storeMenuImages(
  listingId: string,
  photos: { photo_reference: string; width: number; height: number }[]
): Promise<number> {
  const foodPhotos: { photo_reference: string; width: number; height: number }[] = [];

  if (USE_AI_FILTERING) {
    console.log(`    🤖 AI vetting ${photos.length} images for food...`);

    let vetted = 0;
    for (const photo of photos) {
      if (foodPhotos.length >= TARGET_FOOD_IMAGES) break;

      const photoUrl = getPhotoUrl(photo.photo_reference);
      vetted++;

      try {
        const isFood = await isFoodImage(photoUrl);

        if (isFood) {
          foodPhotos.push(photo);
          console.log(`       ✅ Image ${vetted}: FOOD (${foodPhotos.length}/${TARGET_FOOD_IMAGES})`);
        } else {
          console.log(`       ❌ Image ${vetted}: Not food`);
        }
      } catch (error) {
        console.log(`       ⚠️  Image ${vetted}: Error checking`);
      }

      await sleep(300); // Rate limit for OpenAI
    }
  } else {
    // No AI filtering - just take up to TARGET_FOOD_IMAGES photos
    console.log(`    📸 Storing up to ${TARGET_FOOD_IMAGES} images (no AI filtering)...`);
    for (const photo of photos.slice(0, TARGET_FOOD_IMAGES)) {
      foodPhotos.push(photo);
    }
  }

  if (foodPhotos.length === 0) {
    console.log(`    ⚠️  No images to store`);
    return 0;
  }

  // Store in database
  const menuImages = foodPhotos.map((photo, index) => ({
    listing_id: listingId,
    outlet_id: null,
    image_url: getPhotoUrl(photo.photo_reference),
    photo_reference: photo.photo_reference,
    width: photo.width,
    height: photo.height,
    is_header: index === 0,
    display_order: index,
  }));

  const { error } = await supabase
    .from('menu_images')
    .insert(menuImages);

  if (error) {
    console.error(`    ❌ Database error storing images:`, error.message);
    return 0;
  }

  return foodPhotos.length;
}

async function main() {
  console.log('='.repeat(70));
  console.log('  ADD POPULAR RESTAURANTS TO EMPTY STATIONS');
  console.log('  Min Rating: ' + MIN_RATING + '+ stars');
  console.log('  Target: Up to ' + MAX_RESTAURANTS_PER_STATION + ' restaurants per station');
  console.log('  Target Images: ' + TARGET_FOOD_IMAGES + ' images per restaurant');
  console.log('  AI Image Filtering: ' + (USE_AI_FILTERING ? '✅ ENABLED' : '❌ DISABLED (no OPENAI_API_KEY)'));
  console.log('='.repeat(70));

  // Ensure popular source exists
  const sourceOk = await ensurePopularSourceExists();
  if (!sourceOk) {
    console.error('Failed to create popular source, aborting.');
    return;
  }

  // Get empty stations
  console.log('\n📍 Finding stations with 0 listings...');
  const emptyStations = await getEmptyStations();
  console.log(`Found ${emptyStations.length} empty stations\n`);

  if (emptyStations.length === 0) {
    console.log('No empty stations found!');
    return;
  }

  let totalAdded = 0;
  let totalSkipped = 0;
  let totalFailed = 0;
  let totalImages = 0;
  let stationsProcessed = 0;

  for (const station of emptyStations) {
    stationsProcessed++;
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`[${stationsProcessed}/${emptyStations.length}] 🚉 ${station.name}`);
    console.log(`   Coordinates: ${station.lat}, ${station.lng}`);

    // Search for nearby restaurants
    const restaurants = await searchNearbyRestaurants(station.lat, station.lng, station.name);

    if (restaurants.length === 0) {
      console.log(`   ⚠️  No high-rated restaurants found nearby`);
      continue;
    }

    console.log(`   Found ${restaurants.length} restaurants with ${MIN_RATING}+ rating`);

    for (let i = 0; i < restaurants.length; i++) {
      const place = restaurants[i];
      console.log(`\n   [${i + 1}/${restaurants.length}] 🍽️  ${place.name}`);
      console.log(`      Rating: ${place.rating}⭐ (${place.user_ratings_total} reviews)`);

      // Check if already exists
      const exists = await restaurantExists(
        place.name,
        place.geometry.location.lat,
        place.geometry.location.lng
      );

      if (exists) {
        console.log(`      ⏭️  Already exists in database`);
        totalSkipped++;
        continue;
      }

      // Get detailed place info
      const details = await getPlaceDetails(place.place_id);
      await sleep(200);

      if (!details) {
        console.log(`      ❌ Could not get place details`);
        totalFailed++;
        continue;
      }

      // Calculate distance and walking time
      const distanceKm = calculateDistance(
        station.lat, station.lng,
        details.geometry!.location.lat, details.geometry!.location.lng
      );
      const distanceMeters = Math.round(distanceKm * 1000);
      const walkingTime = Math.round((distanceKm / 5) * 60); // 5km/h walking speed

      // Generate tags
      const tags = generateTags(details.types, details.name);

      // Create listing
      const newId = randomUUID();
      const { error: insertError } = await supabase
        .from('food_listings')
        .insert({
          id: newId,
          name: details.name,
          description: `Popular restaurant rated ${details.rating}⭐ with ${details.user_ratings_total} reviews`,
          address: details.formatted_address || place.vicinity,
          station_id: station.id,
          image_url: details.photos && details.photos.length > 0
            ? getPhotoUrl(details.photos[0].photo_reference)
            : null,
          tags,
          source_id: 'popular',
          lat: details.geometry!.location.lat,
          lng: details.geometry!.location.lng,
          distance_to_station: distanceMeters,
          walking_time: walkingTime,
          is_active: true,
        });

      if (insertError) {
        console.log(`      ❌ Insert error: ${insertError.message}`);
        totalFailed++;
        continue;
      }

      // Add to listing_sources
      await supabase
        .from('listing_sources')
        .insert({
          listing_id: newId,
          source_id: 'popular',
          source_url: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
          is_primary: true,
        });

      console.log(`      ✅ Added to database`);
      console.log(`      📍 ${distanceMeters}m from station (${walkingTime} min walk)`);
      totalAdded++;

      // Store menu images
      if (details.photos && details.photos.length > 0) {
        const imagesStored = await storeMenuImages(newId, details.photos);
        totalImages += imagesStored;
        console.log(`      📸 Stored ${imagesStored} food images`);
      } else {
        console.log(`      ⚠️  No photos available`);
      }

      await sleep(500); // Rate limit between restaurants
    }

    await sleep(1000); // Rate limit between stations
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('  SUMMARY');
  console.log('='.repeat(70));
  console.log(`  Stations processed: ${stationsProcessed}`);
  console.log(`  Restaurants added: ${totalAdded}`);
  console.log(`  Restaurants skipped (existing): ${totalSkipped}`);
  console.log(`  Restaurants failed: ${totalFailed}`);
  console.log(`  Food images stored: ${totalImages}`);
  console.log('='.repeat(70));
}

main().catch(console.error);
