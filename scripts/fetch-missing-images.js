const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4'
);

const GOOGLE_API_KEY = 'AIzaSyB2nTAy0K17gdWwlwJ2CYs4kbO0SUxYJvs';

function getPhotoUrl(photoReference, maxWidth = 800) {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${GOOGLE_API_KEY}`;
}

async function searchPlacePhotos(name, address) {
  try {
    const searchQuery = address ? `${name} ${address} Singapore` : `${name} Singapore`;
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${GOOGLE_API_KEY}`;

    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();

    if (searchData.status !== 'OK' || !searchData.results || searchData.results.length === 0) {
      return null;
    }

    const placeId = searchData.results[0].place_id;
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos,name&key=${GOOGLE_API_KEY}`;

    const detailsResponse = await fetch(detailsUrl);
    const detailsData = await detailsResponse.json();

    if (detailsData.status !== 'OK' || !detailsData.result?.photos) {
      return null;
    }

    return detailsData.result.photos;
  } catch (error) {
    console.error('Error fetching photos:', error);
    return null;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('  FETCH IMAGES FOR LISTINGS WITHOUT ANY IMAGES');
  console.log('='.repeat(60));

  // Get listings without any menu_images
  const { data: listings } = await supabase
    .from('food_listings')
    .select('id, name, address, station_id')
    .is('image_url', null);

  console.log('\nFound ' + listings.length + ' listings without thumbnails\n');

  let fixed = 0;
  let failed = 0;

  for (const listing of listings) {
    // Check if it has menu images
    const { data: existingImages } = await supabase
      .from('menu_images')
      .select('id')
      .eq('listing_id', listing.id)
      .limit(1);

    if (existingImages && existingImages.length > 0) {
      continue; // Already has images, skip
    }

    console.log('🔍 ' + listing.name + ' @ ' + listing.station_id);

    // Search Google for photos
    const photos = await searchPlacePhotos(listing.name, listing.address);

    if (!photos || photos.length === 0) {
      console.log('   ⚠️  No photos found on Google');
      failed++;
      continue;
    }

    console.log('   Found ' + photos.length + ' photos');

    // Store menu images
    const menuImages = photos.slice(0, 10).map((photo, index) => ({
      listing_id: listing.id,
      outlet_id: null,
      image_url: getPhotoUrl(photo.photo_reference),
      photo_reference: photo.photo_reference,
      width: photo.width,
      height: photo.height,
      is_header: index === 0,
      display_order: index,
    }));

    const { error: insertError } = await supabase
      .from('menu_images')
      .insert(menuImages);

    if (insertError) {
      console.log('   ❌ Error storing images: ' + insertError.message);
      failed++;
      continue;
    }

    // Update thumbnail
    const { error: updateError } = await supabase
      .from('food_listings')
      .update({ image_url: menuImages[0].image_url })
      .eq('id', listing.id);

    if (updateError) {
      console.log('   ❌ Error setting thumbnail: ' + updateError.message);
    } else {
      console.log('   ✅ Added ' + menuImages.length + ' images');
      fixed++;
    }

    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '='.repeat(60));
  console.log('  SUMMARY');
  console.log('='.repeat(60));
  console.log('  Fixed: ' + fixed);
  console.log('  Failed: ' + failed);
  console.log('='.repeat(60));
}

main();
