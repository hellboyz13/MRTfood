import { createClient } from '@supabase/supabase-js';
import https from 'https';

const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4'
);

const GOOGLE_API_KEY = 'AIzaSyB2nTAy0K17gdWwlwJ2CYs4kbO0SUxYJvs';

interface Place {
  id: string;
  displayName: { text: string };
  photos?: { name: string }[];
}

interface PlacesNewResponse {
  places?: Place[];
}

// Use Places API (New) - Text Search
function searchPlace(name: string, address: string): Promise<PlacesNewResponse> {
  return new Promise((resolve, reject) => {
    const query = `${name} ${address || ''} Singapore restaurant`;
    const postData = JSON.stringify({
      textQuery: query,
      maxResultCount: 1,
    });

    const options = {
      hostname: 'places.googleapis.com',
      path: '/v1/places:searchText',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.photos',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Get photo URL from Places API (New)
function getPhotoUrl(photoName: string, maxWidth: number = 400): string {
  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}&key=${GOOGLE_API_KEY}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  // Get listings without valid images
  const { data: listings, error } = await supabase
    .from('food_listings')
    .select('id, name, address, image_url')
    .eq('is_active', true);

  if (error || !listings) {
    console.error('Error fetching listings:', error);
    return;
  }

  const needImages = listings.filter(l => !l.image_url || !l.image_url.startsWith('http'));
  console.log(`Found ${needImages.length} listings without images`);

  let updated = 0;
  let failed = 0;

  for (const listing of needImages) {
    try {
      console.log(`\nSearching: ${listing.name}`);

      const result = await searchPlace(listing.name, listing.address || '');

      if (result.places && result.places.length > 0) {
        const place = result.places[0];
        console.log(`  Found: ${place.displayName?.text || 'Unknown'}`);

        if (place.photos && place.photos.length > 0) {
          const photoUrl = getPhotoUrl(place.photos[0].name);

          const { error: updateError } = await supabase
            .from('food_listings')
            .update({ image_url: photoUrl })
            .eq('id', listing.id);

          if (updateError) {
            console.log(`  ✗ Update failed: ${updateError.message}`);
            failed++;
          } else {
            console.log(`  ✓ Updated with photo`);
            updated++;
          }
        } else {
          console.log(`  - No photos available`);
          failed++;
        }
      } else {
        console.log(`  - Place not found`);
        if ((result as any).error) {
          console.log(`    Error: ${JSON.stringify((result as any).error)}`);
        }
        failed++;
      }

      // Rate limit: 10 requests per second max
      await sleep(150);

    } catch (err) {
      console.log(`  ✗ Error: ${err}`);
      failed++;
    }
  }

  console.log(`\n========================================`);
  console.log(`Done! Updated: ${updated}, Failed: ${failed}`);
}

main().catch(console.error);
