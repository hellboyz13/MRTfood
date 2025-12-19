import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local file
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const googlePlacesApiKey = process.env.GOOGLE_PLACES_API_KEY!;
const openaiApiKey = process.env.OPENAI_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);
const openai = new OpenAI({ apiKey: openaiApiKey });

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

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function isFoodImage(imageUrl: string): Promise<boolean> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Is this image showing food, dishes, or meals? Answer with only 'yes' or 'no'. Images of restaurant interiors, logos, signs, or people should be 'no'. Only actual food/dishes should be 'yes'."
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
    return false; // If error, reject the image to be safe
  }
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

async function storeMenuImagesForAllOutlets(brandName: string, outletIds: string[], photos: PlacePhoto[]) {
  const menuImages = outletIds.flatMap(outletId =>
    photos.map((photo, index) => {
      const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${photo.width}&photoreference=${photo.photo_reference}&key=${googlePlacesApiKey}`;

      return {
        listing_id: null,
        outlet_id: outletId,
        image_url: photoUrl,
        photo_reference: photo.photo_reference,
        width: photo.width,
        height: photo.height,
        is_header: index === 0, // First image is header
        display_order: index,
      };
    })
  );

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

async function populateChainOutletImages() {
  console.log('🍽️  Populating chain outlet images with AI vetting...\n');
  console.log('📌 Note: Processing by brand - images will be shared across all outlets of the same brand\n');

  // Get all chain outlets grouped by brand
  const { data: outlets, error: outletsError } = await supabase
    .from('chain_outlets')
    .select(`
      id,
      name,
      address,
      brand_id,
      chain_brands!inner(name)
    `)
    .order('brand_id');

  if (outletsError) {
    console.error('❌ Error fetching chain outlets:', outletsError);
    return;
  }

  if (!outlets || outlets.length === 0) {
    console.log('No chain outlets found.');
    return;
  }

  // Group outlets by brand_id
  const brandGroups = outlets.reduce((acc, outlet) => {
    const brandId = outlet.brand_id;
    if (!acc[brandId]) {
      acc[brandId] = [];
    }
    acc[brandId].push(outlet);
    return acc;
  }, {} as Record<string, typeof outlets>);

  const brandNames = Object.keys(brandGroups);
  console.log(`Found ${outlets.length} outlets across ${brandNames.length} brands.\n`);

  // Check which brands already have images (check first outlet of each brand)
  const { data: existingImages } = await supabase
    .from('menu_images')
    .select('outlet_id')
    .not('outlet_id', 'is', null);

  const outletsWithImages = new Set(existingImages?.map(img => img.outlet_id) || []);

  // Filter brands that need images (brands where at least one outlet doesn't have images)
  const brandsNeedingImages = brandNames.filter(brand => {
    const firstOutletId = brandGroups[brand][0].id;
    return !outletsWithImages.has(firstOutletId);
  });

  console.log(`${brandNames.length - brandsNeedingImages.length} brands already have images.`);
  console.log(`${brandsNeedingImages.length} brands need images.\n`);

  if (brandsNeedingImages.length === 0) {
    console.log('✅ All chain brands already have menu images!');
    return;
  }

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < brandsNeedingImages.length; i++) {
    const brandId = brandsNeedingImages[i];
    const brandOutlets = brandGroups[brandId];
    const outletCount = brandOutlets.length;
    const brandName = (brandOutlets[0] as any).chain_brands.name;

    console.log(`[${i + 1}/${brandsNeedingImages.length}] Processing brand: ${brandName} (${outletCount} outlets)`);

    // Use first outlet to fetch photos
    const firstOutlet = brandOutlets[0];

    // Fetch photos from Google Places
    const photos = await fetchPlacePhotos(firstOutlet.name, firstOutlet.address);

    if (!photos || photos.length === 0) {
      console.log(`  ⚠️  No photos available\n`);
      failCount++;
      await delay(200);
      continue;
    }

    console.log(`  ✅ Found ${photos.length} photos`);
    console.log(`  🤖 AI vetting images...`);

    // Check if this is a bubble tea brand (skip AI vetting)
    const isBubbleTea = /tea|boba|gong cha|koi|liho|chicha|each a cup/i.test(brandName);

    // Vet each photo with AI, aim for 10 food images
    const foodPhotos: PlacePhoto[] = [];
    let vetted = 0;

    if (isBubbleTea) {
      // For bubble tea, just take top 10 images without AI vetting
      console.log(`  🧋 Bubble tea brand detected - taking top 10 images without vetting`);
      foodPhotos.push(...photos.slice(0, 10));
      console.log(`  📸 Collected ${foodPhotos.length} images`);
    } else {
      // For regular food, use AI vetting
      for (const photo of photos) {
        if (foodPhotos.length >= 10) break; // Stop at 10 food images

        const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${photo.width}&photoreference=${photo.photo_reference}&key=${googlePlacesApiKey}`;

        const isFood = await isFoodImage(photoUrl);
        vetted++;

        if (isFood) {
          foodPhotos.push(photo);
          console.log(`     ✅ Image ${vetted}/${photos.length}: FOOD (${foodPhotos.length} collected)`);
        } else {
          console.log(`     ❌ Image ${vetted}/${photos.length}: Not food`);
        }

        // Faster delay between AI calls (500ms = 2 per second)
        await delay(500);
      }
    }

    if (foodPhotos.length === 0) {
      console.log(`  ⚠️  No food images found after vetting\n`);
      failCount++;
      await delay(500);
      continue;
    }

    console.log(`  📸 Storing ${foodPhotos.length} verified food images for ${outletCount} outlets`);

    // Store images for ALL outlets of this brand
    const outletIds = brandOutlets.map(outlet => outlet.id);
    const success = await storeMenuImagesForAllOutlets(brandName, outletIds, foodPhotos);

    if (success) {
      console.log(`  ✅ Success! Applied to ${outletCount} outlets\n`);
      successCount++;
    } else {
      console.log(`  ❌ Failed to store images\n`);
      failCount++;
    }

    // Longer delay between brands to avoid rate limits
    await delay(2000);
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary:');
  console.log(`  ✅ Brands with images: ${successCount}`);
  console.log(`  ❌ Brands failed: ${failCount}`);
  console.log(`  ⏭️  Brands skipped (already have images): ${brandNames.length - brandsNeedingImages.length}`);
  console.log('='.repeat(50));
}

populateChainOutletImages();
