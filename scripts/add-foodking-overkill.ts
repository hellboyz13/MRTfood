import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import https from 'https';

const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4'
);

const GOOGLE_API_KEY = 'AIzaSyB2nTAy0K17gdWwlwJ2CYs4kbO0SUxYJvs';

interface NewListing {
  name: string;
  address: string;
  description: string;
  tags: string[];
  sourceId: string;
  sourceUrl?: string;
}

// Food King and Overkill featured restaurants
const newListings: NewListing[] = [
  // Food King featured stalls (from various episodes)
  {
    name: 'Yew Chuan Claypot Rice',
    address: 'Golden Mile Food Centre, 505 Beach Road, Singapore',
    description: 'Traditional claypot rice with charred rice crust',
    tags: ['Claypot Rice', 'Chinese', 'Hawker'],
    sourceId: 'food-king',
    sourceUrl: 'https://www.youtube.com/@FoodKingSG'
  },
  {
    name: 'Ah Xiao Teochew Duck Rice',
    address: 'Golden Mile Food Centre, 505 Beach Road, Singapore',
    description: 'Famous Teochew-style braised duck rice',
    tags: ['Duck Rice', 'Teochew', 'Hawker'],
    sourceId: 'food-king',
    sourceUrl: 'https://www.youtube.com/@FoodKingSG'
  },
  {
    name: '91 Fried Kway Teow Mee',
    address: 'Golden Mile Food Centre, 505 Beach Road, Singapore',
    description: 'Wok hei char kway teow',
    tags: ['Char Kway Teow', 'Hawker'],
    sourceId: 'food-king',
    sourceUrl: 'https://www.youtube.com/@FoodKingSG'
  },
  {
    name: 'Apollo Fresh Cockle Fried Kway Teow',
    address: 'Marine Parade Central Market & Food Centre, 84 Marine Parade Central, Singapore',
    description: 'Char kway teow with fresh cockles',
    tags: ['Char Kway Teow', 'Hawker'],
    sourceId: 'food-king',
    sourceUrl: 'https://www.youtube.com/@FoodKingSG'
  },
  {
    name: 'Neptune Hong Kong Tim Sum',
    address: 'Marine Parade Central Market & Food Centre, 84 Marine Parade Central, Singapore',
    description: 'Hong Kong style dim sum at hawker prices',
    tags: ['Dim Sum', 'Hong Kong', 'Hawker'],
    sourceId: 'food-king',
    sourceUrl: 'https://www.youtube.com/@FoodKingSG'
  },
  {
    name: "D'Authentic Nasi Lemak",
    address: 'Marine Parade Central Market & Food Centre, 84 Marine Parade Central, Singapore',
    description: 'Authentic Malay nasi lemak',
    tags: ['Nasi Lemak', 'Malay', 'Hawker'],
    sourceId: 'food-king',
    sourceUrl: 'https://www.youtube.com/@FoodKingSG'
  },
  {
    name: 'Fu Zhou Poh Hwa Oyster Cake',
    address: 'Berseh Food Centre, 166 Jln Besar, Singapore',
    description: 'Crispy Fuzhou-style oyster omelette cake',
    tags: ['Oyster Cake', 'Fuzhou', 'Hawker'],
    sourceId: 'food-king',
    sourceUrl: 'https://www.youtube.com/@FoodKingSG'
  },
  {
    name: 'Belly Lucky Noodle',
    address: 'Hong Lim Market & Food Centre, 531A Upper Cross St, Singapore',
    description: 'Popular noodle stall',
    tags: ['Noodles', 'Hawker'],
    sourceId: 'food-king',
    sourceUrl: 'https://www.youtube.com/@FoodKingSG'
  },
  {
    name: 'King of Pao Fan',
    address: 'Eunos Crescent Market, 4A Eunos Crescent, Singapore',
    description: 'Seafood pao fan (rice in broth)',
    tags: ['Pao Fan', 'Seafood', 'Hawker'],
    sourceId: 'food-king',
    sourceUrl: 'https://www.youtube.com/@FoodKingSG'
  },
  {
    name: 'Inspirasi',
    address: 'Bedok Interchange Hawker Centre, 208B New Upper Changi Rd, Singapore',
    description: 'Halal Western-Malay fusion',
    tags: ['Halal', 'Western', 'Hawker'],
    sourceId: 'food-king',
    sourceUrl: 'https://www.youtube.com/@FoodKingSG'
  },
  {
    name: 'Ri Ri Hong Mala Xiang Guo',
    address: 'People\'s Park Complex, 32 New Market Rd, Singapore',
    description: 'Famous mala xiang guo with great variety',
    tags: ['Mala', 'Sichuan', 'Chinese'],
    sourceId: 'food-king',
    sourceUrl: 'https://www.youtube.com/@FoodKingSG'
  },
  // Overkill Get Fed featured stalls
  {
    name: 'Union Farm Chee Pow Kai',
    address: '267A Toh Guan Rd, #01-01, Singapore 601267',
    description: 'Legendary paper-wrapped chicken, rare in Singapore',
    tags: ['Paper Chicken', 'Chinese', 'Hidden Gem'],
    sourceId: 'overkill-food',
    sourceUrl: 'https://www.overkill.sg/get-fed-episode-5'
  },
  {
    name: '88 Hong Kong Roast Meat Specialist',
    address: '308 Lavender St, Singapore 338814',
    description: 'Hong Kong style roast meats - char siu, roast pork, duck',
    tags: ['Roast Meat', 'Hong Kong', 'Char Siu'],
    sourceId: 'overkill-food',
    sourceUrl: 'https://www.overkill.sg/get-fed-episode-5'
  },
  {
    name: 'A Hot Hideout',
    address: '60 Nanyang Cres, Blk 20A #03-02, Singapore 636957',
    description: 'Mala with deep-fried ingredients and scrambled egg',
    tags: ['Mala', 'NTU', 'Hidden Gem'],
    sourceId: 'overkill-food',
    sourceUrl: 'https://www.overkill.sg/get-fed-episode-4'
  },
  {
    name: 'Si Chuan Mei Shi',
    address: '20 Nanyang Ave, Canteen 11, Singapore 639809',
    description: 'Authentic Sichuan cuisine in NTU',
    tags: ['Sichuan', 'Chinese', 'NTU'],
    sourceId: 'overkill-food',
    sourceUrl: 'https://www.overkill.sg/get-fed-episode-4'
  },
];

interface Place {
  id: string;
  displayName: { text: string };
  photos?: { name: string }[];
  location?: { latitude: number; longitude: number };
}

interface PlacesNewResponse {
  places?: Place[];
}

function searchPlace(name: string, address: string): Promise<PlacesNewResponse> {
  return new Promise((resolve, reject) => {
    const query = `${name} ${address} Singapore`;
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
        'X-Goog-FieldMask': 'places.id,places.displayName,places.photos,places.location',
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

function getPhotoUrl(photoName: string, maxWidth: number = 400): string {
  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}&key=${GOOGLE_API_KEY}`;
}

async function findNearestStation(lat: number, lng: number): Promise<string | null> {
  const { data: stations } = await supabase.from('stations').select('id, lat, lng');
  if (!stations) return null;

  let nearestStation: string | null = null;
  let minDistance = Infinity;

  for (const station of stations) {
    if (!station.lat || !station.lng) continue;
    const distance = Math.sqrt(
      Math.pow(lat - station.lat, 2) + Math.pow(lng - station.lng, 2)
    );
    if (distance < minDistance) {
      minDistance = distance;
      nearestStation = station.id;
    }
  }

  return nearestStation;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log(`Adding ${newListings.length} Food King / Overkill listings...\n`);

  let added = 0;
  let skipped = 0;
  let failed = 0;

  for (const listing of newListings) {
    console.log(`\nProcessing: ${listing.name}`);

    // Check if listing already exists
    const { data: existing } = await supabase
      .from('food_listings')
      .select('id, name')
      .ilike('name', `%${listing.name}%`)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`  - Already exists: ${existing[0].name}`);

      // Add as secondary source to existing listing
      const { error: sourceError } = await supabase
        .from('listing_sources')
        .upsert({
          listing_id: existing[0].id,
          source_id: listing.sourceId,
          source_url: listing.sourceUrl || '',
          is_primary: false,
        }, { onConflict: 'listing_id,source_id' });

      if (sourceError) {
        console.log(`  ✗ Error adding source: ${sourceError.message}`);
      } else {
        console.log(`  ✓ Added ${listing.sourceId} as secondary source`);
      }
      skipped++;
      continue;
    }

    // Search for place info
    const result = await searchPlace(listing.name, listing.address);

    let imageUrl: string | null = null;
    let lat: number | null = null;
    let lng: number | null = null;
    let stationId: string | null = null;

    if (result.places && result.places.length > 0) {
      const place = result.places[0];
      console.log(`  Found: ${place.displayName?.text || 'Unknown'}`);

      if (place.photos && place.photos.length > 0) {
        imageUrl = getPhotoUrl(place.photos[0].name);
      }

      if (place.location) {
        lat = place.location.latitude;
        lng = place.location.longitude;
        stationId = await findNearestStation(lat, lng);
        console.log(`  Station: ${stationId || 'none'}`);
      }
    } else {
      console.log(`  - Place not found in Google`);
    }

    // Insert new listing
    const newId = randomUUID();
    const { error: insertError } = await supabase
      .from('food_listings')
      .insert({
        id: newId,
        name: listing.name,
        description: listing.description,
        address: listing.address,
        station_id: stationId,
        image_url: imageUrl,
        tags: listing.tags,
        source_id: listing.sourceId,
        source_url: listing.sourceUrl,
        lat,
        lng,
        is_active: true,
      });

    if (insertError) {
      console.log(`  ✗ Insert failed: ${insertError.message}`);
      failed++;
      continue;
    }

    // Add to listing_sources junction table
    const { error: sourceError } = await supabase
      .from('listing_sources')
      .insert({
        listing_id: newId,
        source_id: listing.sourceId,
        source_url: listing.sourceUrl || '',
        is_primary: true,
      });

    if (sourceError) {
      console.log(`  ✗ Source link failed: ${sourceError.message}`);
    } else {
      console.log(`  ✓ Added with ${listing.sourceId} source`);
      added++;
    }

    await sleep(200);
  }

  console.log(`\n========================================`);
  console.log(`Done! Added: ${added}, Skipped: ${skipped}, Failed: ${failed}`);
}

main().catch(console.error);
