import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local file
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const googlePlacesApiKey = process.env.GOOGLE_PLACES_API_KEY!;

async function testGooglePlacesAPI() {
  console.log('🧪 Testing Google Places API integration...\n');

  // Test with a known restaurant
  const testPlaceName = 'Din Tai Fung ION Orchard Singapore';

  console.log(`🔍 Searching for: "${testPlaceName}"\n`);

  try {
    // Step 1: Text Search
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(testPlaceName)}&key=${googlePlacesApiKey}`;

    console.log('Step 1: Running Text Search...');
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();

    if (searchData.status !== 'OK') {
      console.error('❌ Search failed:', searchData.status);
      console.error('Error:', searchData.error_message);
      return;
    }

    console.log('✅ Found place!');
    console.log(`   Place ID: ${searchData.results[0].place_id}`);
    console.log(`   Name: ${searchData.results[0].name}\n`);

    const placeId = searchData.results[0].place_id;

    // Step 2: Get Place Details
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos,name&key=${googlePlacesApiKey}`;

    console.log('Step 2: Fetching Place Details...');
    const detailsResponse = await fetch(detailsUrl);
    const detailsData = await detailsResponse.json();

    if (detailsData.status !== 'OK') {
      console.error('❌ Details fetch failed:', detailsData.status);
      console.error('Error:', detailsData.error_message);
      return;
    }

    const photos = detailsData.result?.photos || [];
    console.log(`✅ Found ${photos.length} photos!\n`);

    if (photos.length > 0) {
      console.log('📸 Sample photo URLs (first 3):');
      photos.slice(0, 3).forEach((photo: any, i: number) => {
        const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${photo.width}&photoreference=${photo.photo_reference}&key=${googlePlacesApiKey}`;
        console.log(`   ${i + 1}. Width: ${photo.width}px, Height: ${photo.height}px`);
        console.log(`      URL: ${photoUrl.substring(0, 80)}...\n`);
      });
    }

    console.log('✅ Google Places API test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testGooglePlacesAPI();
