import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Use service_role key to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4'
);

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

interface PlaceSearchResult {
  places?: Array<{
    id: string;
    displayName?: { text: string };
    photos?: Array<{
      name: string;
      widthPx: number;
      heightPx: number;
    }>;
  }>;
}

async function searchPlace(name: string, address: string): Promise<string | null> {
  if (!GOOGLE_API_KEY) {
    console.error('No Google API key found!');
    return null;
  }

  try {
    // Use Places API (New) Text Search
    const searchQuery = `${name} ${address} Singapore`;
    const url = `https://places.googleapis.com/v1/places:searchText`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.photos',
      },
      body: JSON.stringify({
        textQuery: searchQuery,
        maxResultCount: 1,
      }),
    });

    if (!response.ok) {
      console.error(`API error: ${response.status}`);
      return null;
    }

    const data: PlaceSearchResult = await response.json();

    if (data.places && data.places.length > 0 && data.places[0].photos && data.places[0].photos.length > 0) {
      const photoName = data.places[0].photos[0].name;
      // Get photo URL
      const photoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=400&maxWidthPx=400&key=${GOOGLE_API_KEY}`;
      return photoUrl;
    }

    return null;
  } catch (error) {
    console.error(`Error searching for ${name}:`, error);
    return null;
  }
}

async function fetchListingImages() {
  console.log('🖼️  Fetching images for food listings...\n');
  console.log('='.repeat(60));

  if (!GOOGLE_API_KEY) {
    console.error('❌ GOOGLE_PLACES_API_KEY not found in environment!');
    console.log('Please add GOOGLE_PLACES_API_KEY to your .env.local file');
    return;
  }

  // Get all listings without images
  const { data: listings, error } = await supabase
    .from('food_listings')
    .select('id, name, address, image_url')
    .is('image_url', null)
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Error fetching listings:', error);
    return;
  }

  console.log(`\nFound ${listings?.length || 0} listings without images\n`);

  if (!listings || listings.length === 0) {
    console.log('✅ All listings already have images!');
    return;
  }

  let successCount = 0;
  let failCount = 0;

  for (const listing of listings) {
    console.log(`\n📍 ${listing.name}`);
    console.log(`   Address: ${listing.address || 'No address'}`);

    // Rate limiting - Google allows 100 requests per second but let's be safe
    await new Promise(resolve => setTimeout(resolve, 200));

    const imageUrl = await searchPlace(listing.name, listing.address || '');

    if (imageUrl) {
      // Update the listing with the image URL
      const { error: updateError } = await supabase
        .from('food_listings')
        .update({ image_url: imageUrl })
        .eq('id', listing.id);

      if (updateError) {
        console.log(`   ❌ Failed to update: ${updateError.message}`);
        failCount++;
      } else {
        console.log(`   ✅ Image added`);
        successCount++;
      }
    } else {
      console.log(`   ⚠️  No image found`);
      failCount++;
    }

    // Show progress every 10 listings
    if ((successCount + failCount) % 10 === 0) {
      console.log(`\n   Progress: ${successCount + failCount}/${listings.length} processed\n`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 SUMMARY:\n');
  console.log(`   Total processed: ${listings.length}`);
  console.log(`   ✅ Images added: ${successCount}`);
  console.log(`   ⚠️  No image found: ${failCount}`);

  // Final count
  const { count: withImages } = await supabase
    .from('food_listings')
    .select('*', { count: 'exact', head: true })
    .not('image_url', 'is', null);

  const { count: total } = await supabase
    .from('food_listings')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  console.log(`\n   Final: ${withImages}/${total} listings now have images`);
}

fetchListingImages();
