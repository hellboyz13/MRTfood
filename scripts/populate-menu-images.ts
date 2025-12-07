import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local file
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const googlePlacesApiKey = process.env.GOOGLE_PLACES_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

interface PlacePhoto {
  photo_reference: string;
  width: number;
  height: number;
}

interface PlaceDetailsResponse {
  result?: {
    photos?: PlacePhoto[];
    name?: string;
  };
  status: string;
  error_message?: string;
}

interface FoodListing {
  id: string;
  name: string;
  address: string | null;
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchPlacePhotos(placeName: string, address: string | null): Promise<PlacePhoto[] | null> {
  try {
    // Step 1: Find place using Places API Text Search
    const searchQuery = address ? `${placeName} ${address}` : placeName;
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${googlePlacesApiKey}`;

    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();

    if (searchData.status !== 'OK' || !searchData.results || searchData.results.length === 0) {
      console.log(`  ❌ Place not found: ${searchData.status}`);
      return null;
    }

    const placeId = searchData.results[0].place_id;

    // Step 2: Get place details including photos
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos,name&key=${googlePlacesApiKey}`;

    const detailsResponse = await fetch(detailsUrl);
    const detailsData: PlaceDetailsResponse = await detailsResponse.json();

    if (detailsData.status !== 'OK' || !detailsData.result?.photos) {
      console.log(`  ❌ No photos found: ${detailsData.status}`);
      return null;
    }

    return detailsData.result.photos;
  } catch (error) {
    console.error(`  ❌ Error fetching photos:`, error);
    return null;
  }
}

async function storeMenuImages(listingId: string, photos: PlacePhoto[]) {
  // Take top 20 photos
  const topPhotos = photos.slice(0, 20);

  const menuImages = topPhotos.map((photo, index) => {
    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${photo.width}&photoreference=${photo.photo_reference}&key=${googlePlacesApiKey}`;

    return {
      listing_id: listingId,
      outlet_id: null,
      image_url: photoUrl,
      photo_reference: photo.photo_reference,
      width: photo.width,
      height: photo.height,
      is_header: index === 0, // First image is header
      display_order: index,
    };
  });

  const { data, error } = await supabase
    .from('menu_images')
    .insert(menuImages)
    .select();

  if (error) {
    console.error(`  ❌ Database error:`, error.message);
    return false;
  }

  return true;
}

async function populateMenuImages() {
  console.log('🍽️  Populating menu images for all food listings...\n');

  // Get all food listings that don't have menu images yet
  const { data: listings, error: listingsError } = await supabase
    .from('food_listings')
    .select('id, name, address')
    .order('name');

  if (listingsError) {
    console.error('❌ Error fetching listings:', listingsError);
    return;
  }

  if (!listings || listings.length === 0) {
    console.log('No food listings found.');
    return;
  }

  console.log(`Found ${listings.length} food listings.\n`);

  // Check which listings already have images
  const { data: existingImages } = await supabase
    .from('menu_images')
    .select('listing_id')
    .not('listing_id', 'is', null);

  const listingsWithImages = new Set(existingImages?.map(img => img.listing_id) || []);

  const listingsToProcess = listings.filter(listing => !listingsWithImages.has(listing.id));

  console.log(`${listingsWithImages.size} listings already have images.`);
  console.log(`${listingsToProcess.length} listings need images.\n`);

  if (listingsToProcess.length === 0) {
    console.log('✅ All listings already have menu images!');
    return;
  }

  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;

  for (let i = 0; i < listingsToProcess.length; i++) {
    const listing = listingsToProcess[i];

    console.log(`[${i + 1}/${listingsToProcess.length}] Processing: ${listing.name}`);

    // Fetch photos from Google Places
    const photos = await fetchPlacePhotos(listing.name, listing.address);

    if (!photos || photos.length === 0) {
      console.log(`  ⚠️  No photos available\n`);
      failCount++;

      // Add delay to respect rate limits
      await delay(200);
      continue;
    }

    console.log(`  ✅ Found ${photos.length} photos`);

    // Store in database
    const success = await storeMenuImages(listing.id, photos);

    if (success) {
      console.log(`  ✅ Stored ${Math.min(photos.length, 20)} images\n`);
      successCount++;
    } else {
      console.log(`  ❌ Failed to store images\n`);
      failCount++;
    }

    // Add delay between requests to respect Google API rate limits (50 requests per second)
    await delay(200); // 5 requests per second
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary:');
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ❌ Failed: ${failCount}`);
  console.log(`  ⏭️  Skipped (already have images): ${listingsWithImages.size}`);
  console.log('='.repeat(50));
}

populateMenuImages();
