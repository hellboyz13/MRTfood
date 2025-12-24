const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

async function fetchAndUpload() {
  const outletId = 'swensens-causeway-point';
  const outletName = "Swensen's";
  const mallName = 'Causeway Point';
  const searchQuery = outletName + ' ' + mallName + ' Singapore';

  console.log('1. Searching Google Places for:', searchQuery);

  // Step 1: Text Search to find the place
  const searchUrl = 'https://places.googleapis.com/v1/places:searchText';
  const searchResponse = await fetch(searchUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.photos'
    },
    body: JSON.stringify({
      textQuery: searchQuery,
      maxResultCount: 1
    })
  });

  const searchData = await searchResponse.json();

  if (!searchData.places || !searchData.places[0] || !searchData.places[0].photos) {
    console.log('No photos found');
    return;
  }

  const photoName = searchData.places[0].photos[0].name;
  console.log('2. Found photo:', photoName.substring(0, 50) + '...');

  // Step 2: Get the photo URL and fetch the image
  const photoUrl = 'https://places.googleapis.com/v1/' + photoName + '/media?maxHeightPx=400&maxWidthPx=400&key=' + API_KEY;

  // Fetch the actual image (follow redirect)
  const photoResponse = await fetch(photoUrl);
  const imageBuffer = await photoResponse.arrayBuffer();
  console.log('3. Downloaded image, size:', imageBuffer.byteLength, 'bytes');

  // Step 3: Upload to Supabase Storage
  const fileName = outletId + '.jpg';
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('thumbnails')
    .upload(fileName, imageBuffer, {
      contentType: 'image/jpeg',
      upsert: true
    });

  if (uploadError) {
    console.log('Upload error:', uploadError);
    return;
  }

  console.log('4. Uploaded to Supabase:', uploadData);

  // Step 4: Get the public URL
  const { data: urlData } = supabase.storage.from('thumbnails').getPublicUrl(fileName);
  console.log('5. Public URL:', urlData.publicUrl);

  // Step 5: Update the outlet in the database
  const { data: updateData, error: updateError } = await supabase
    .from('mall_outlets')
    .update({ thumbnail_url: urlData.publicUrl })
    .eq('id', outletId)
    .select('id, name, thumbnail_url');

  if (updateError) {
    console.log('Update error:', updateError);
    return;
  }

  console.log('6. Updated outlet:', updateData);
}

fetchAndUpload();
