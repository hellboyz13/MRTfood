import { createClient } from '@supabase/supabase-js';
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

// Optional OpenAI for AI filtering
const openaiApiKey = process.env.OPENAI_API_KEY;
let openai: OpenAI | null = null;
let USE_AI_FILTERING = false;

if (openaiApiKey) {
  openai = new OpenAI({ apiKey: openaiApiKey });
  USE_AI_FILTERING = true;
}

const TARGET_FOOD_IMAGES = 20;

interface PlacePhoto {
  photo_reference: string;
  width: number;
  height: number;
}

interface PlaceDetailsResult {
  result?: {
    photos?: PlacePhoto[];
    name?: string;
  };
  status: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Use ChatGPT to determine if an image is food
async function isFoodImage(imageUrl: string): Promise<boolean> {
  // If no AI available, accept all images
  if (!openai) return true;

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
    return false;
  }
}

// Generate photo URL from reference
function getPhotoUrl(photoReference: string, maxWidth: number = 800): string {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${GOOGLE_API_KEY}`;
}

// Search for place and get photos
async function searchPlacePhotos(name: string, address: string | null): Promise<PlacePhoto[] | null> {
  try {
    // Step 1: Find place using Places API Text Search
    const searchQuery = address ? `${name} ${address} Singapore` : `${name} Singapore`;
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${GOOGLE_API_KEY}`;

    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();

    if (searchData.status !== 'OK' || !searchData.results || searchData.results.length === 0) {
      return null;
    }

    const placeId = searchData.results[0].place_id;

    // Step 2: Get place details including photos
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos,name&key=${GOOGLE_API_KEY}`;

    const detailsResponse = await fetch(detailsUrl);
    const detailsData: PlaceDetailsResult = await detailsResponse.json();

    if (detailsData.status !== 'OK' || !detailsData.result?.photos) {
      return null;
    }

    return detailsData.result.photos;
  } catch (error) {
    console.error(`  ❌ Error fetching photos:`, error);
    return null;
  }
}

// Get existing image count for a listing
async function getExistingImageCount(listingId: string): Promise<number> {
  const { data, error } = await supabase
    .from('menu_images')
    .select('id')
    .eq('listing_id', listingId);

  if (error || !data) return 0;
  return data.length;
}

// Get max display order for a listing
async function getMaxDisplayOrder(listingId: string): Promise<number> {
  const { data } = await supabase
    .from('menu_images')
    .select('display_order')
    .eq('listing_id', listingId)
    .order('display_order', { ascending: false })
    .limit(1);

  if (data && data.length > 0) {
    return data[0].display_order + 1;
  }
  return 0;
}

// Store additional menu images for a listing
async function addMenuImages(
  listingId: string,
  photos: PlacePhoto[],
  startOrder: number,
  needed: number
): Promise<number> {
  const foodPhotos: PlacePhoto[] = [];

  if (USE_AI_FILTERING) {
    console.log(`    🤖 AI vetting ${Math.min(photos.length, needed * 2)} images for food...`);

    // Vet more photos than needed in case some fail
    const photosToVet = photos.slice(0, needed * 2);
    let vetted = 0;

    for (const photo of photosToVet) {
      if (foodPhotos.length >= needed) break;

      const photoUrl = getPhotoUrl(photo.photo_reference);
      vetted++;

      try {
        const isFood = await isFoodImage(photoUrl);

        if (isFood) {
          foodPhotos.push(photo);
          console.log(`       ✅ Image ${vetted}: FOOD (${foodPhotos.length}/${needed} needed)`);
        } else {
          console.log(`       ❌ Image ${vetted}: Not food`);
        }
      } catch (error) {
        console.log(`       ⚠️  Image ${vetted}: Error checking`);
      }

      await sleep(300); // Rate limit for OpenAI
    }
  } else {
    // No AI filtering - accept all photos up to needed amount
    console.log(`    📸 Storing up to ${needed} images (no AI filtering)...`);
    const photosToStore = photos.slice(0, needed);
    foodPhotos.push(...photosToStore);
  }

  if (foodPhotos.length === 0) {
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
    is_header: false, // Not header since listing already has images
    display_order: startOrder + index,
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
  console.log('  FILL MISSING MENU IMAGES');
  console.log('  Target: ' + TARGET_FOOD_IMAGES + ' food images per listing');
  console.log('  AI Image Filtering: ' + (USE_AI_FILTERING ? '✅ ENABLED' : '❌ DISABLED (no OPENAI_API_KEY)'));
  console.log('='.repeat(70));

  // Get all food listings
  console.log('\n📋 Fetching all food listings...');
  const { data: listings, error: listingsError } = await supabase
    .from('food_listings')
    .select('id, name, address')
    .order('name');

  if (listingsError || !listings) {
    console.error('Error fetching listings:', listingsError);
    return;
  }

  console.log(`Found ${listings.length} listings\n`);

  // Check image counts for each listing
  console.log('📊 Checking image counts...');
  const listingsNeedingImages: { id: string; name: string; address: string | null; currentCount: number; needed: number }[] = [];

  for (const listing of listings) {
    const count = await getExistingImageCount(listing.id);
    if (count < TARGET_FOOD_IMAGES) {
      listingsNeedingImages.push({
        id: listing.id,
        name: listing.name,
        address: listing.address,
        currentCount: count,
        needed: TARGET_FOOD_IMAGES - count,
      });
    }
  }

  console.log(`\n${listingsNeedingImages.length} listings need more images`);
  console.log(`${listings.length - listingsNeedingImages.length} listings already have ${TARGET_FOOD_IMAGES}+ images\n`);

  if (listingsNeedingImages.length === 0) {
    console.log('✅ All listings already have enough menu images!');
    return;
  }

  // Sort by how many images needed (least first for quick wins)
  listingsNeedingImages.sort((a, b) => a.needed - b.needed);

  let totalImagesAdded = 0;
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < listingsNeedingImages.length; i++) {
    const listing = listingsNeedingImages[i];

    console.log(`\n[${i + 1}/${listingsNeedingImages.length}] 🍽️  ${listing.name}`);
    console.log(`   Current: ${listing.currentCount} images, Need: ${listing.needed} more`);

    // Search for photos
    const photos = await searchPlacePhotos(listing.name, listing.address);
    await sleep(300);

    if (!photos || photos.length === 0) {
      console.log(`   ⚠️  No photos found on Google`);
      failCount++;
      continue;
    }

    console.log(`   Found ${photos.length} photos on Google`);

    // Skip photos that might already be stored (by checking if we have enough to add)
    if (photos.length <= listing.currentCount) {
      console.log(`   ⚠️  Not enough new photos available`);
      failCount++;
      continue;
    }

    // Get max display order
    const startOrder = await getMaxDisplayOrder(listing.id);

    // Add more images
    const imagesAdded = await addMenuImages(listing.id, photos, startOrder, listing.needed);

    if (imagesAdded > 0) {
      console.log(`   ✅ Added ${imagesAdded} new food images`);
      totalImagesAdded += imagesAdded;
      successCount++;
    } else {
      console.log(`   ⚠️  Could not add any food images`);
      failCount++;
    }

    await sleep(1000); // Rate limit between listings
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('  SUMMARY');
  console.log('='.repeat(70));
  console.log(`  Listings processed: ${listingsNeedingImages.length}`);
  console.log(`  Listings updated: ${successCount}`);
  console.log(`  Listings failed: ${failCount}`);
  console.log(`  Total images added: ${totalImagesAdded}`);
  console.log('='.repeat(70));
}

main().catch(console.error);
