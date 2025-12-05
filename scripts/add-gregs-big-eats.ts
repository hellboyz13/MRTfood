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

// Greg's Big Eats featured stalls
const newListings: NewListing[] = [
  {
    name: 'Pin Xiang Wanton Mee',
    address: 'Blk 93 Toa Payoh Lorong 4, #01-46, Singapore 310093',
    description: 'Traditional wanton mee with springy noodles and tasty char siu',
    tags: ['Wanton Mee', 'Noodles', 'Hawker'],
    sourceId: 'gregs-big-eats',
    sourceUrl: 'https://gregsbigeats.com/'
  },
  {
    name: 'Claypot & Cooked Food Kitchen',
    address: 'Chinatown Complex Food Centre, 335 Smith Street, #02-83, Singapore 050335',
    description: 'Claypot rice and zi char dishes',
    tags: ['Claypot Rice', 'Zi Char', 'Hawker'],
    sourceId: 'gregs-big-eats',
    sourceUrl: 'https://gregsbigeats.com/'
  },
  {
    name: 'Fragrant Sauce Chicken & Noodles',
    address: 'Chinatown Complex Food Centre, 335 Smith Street, #02-85, Singapore 050335',
    description: 'Soy sauce chicken with aromatic flavors',
    tags: ['Soy Sauce Chicken', 'Noodles', 'Hawker'],
    sourceId: 'gregs-big-eats',
    sourceUrl: 'https://gregsbigeats.com/'
  },
  {
    name: 'Heng Heng Cooked Food',
    address: 'ABC Brickworks Market & Food Centre, 6 Jalan Bukit Merah, #01-18, Singapore 150006',
    description: 'Famous for their economical rice and home-cooked dishes',
    tags: ['Economic Rice', 'Chinese', 'Hawker'],
    sourceId: 'gregs-big-eats',
    sourceUrl: 'https://gregsbigeats.com/'
  },
  {
    name: 'Hong Lim Fishball Noodles',
    address: 'Hong Lim Market & Food Centre, 531A Upper Cross Street, #02-14, Singapore 051531',
    description: 'Handmade fishball noodles with bouncy texture',
    tags: ['Fishball Noodles', 'Teochew', 'Hawker'],
    sourceId: 'gregs-big-eats',
    sourceUrl: 'https://gregsbigeats.com/'
  },
  {
    name: 'Lao Fu Zi Fried Kway Teow',
    address: 'Old Airport Road Food Centre, 51 Old Airport Road, #01-12, Singapore 390051',
    description: 'Wok hei char kway teow with duck egg',
    tags: ['Char Kway Teow', 'Hawker'],
    sourceId: 'gregs-big-eats',
    sourceUrl: 'https://gregsbigeats.com/'
  },
  {
    name: 'Ah Hoe Mee Pok',
    address: 'Tanjong Pagar Plaza Market & Food Centre, 6 Tanjong Pagar Plaza, #02-27, Singapore 081006',
    description: 'Dry mee pok with homemade chili',
    tags: ['Mee Pok', 'Noodles', 'Hawker'],
    sourceId: 'gregs-big-eats',
    sourceUrl: 'https://gregsbigeats.com/'
  },
  {
    name: 'Nan Xiang Shanghai Xiao Long Bao',
    address: 'Old Airport Road Food Centre, 51 Old Airport Road, #01-106, Singapore 390051',
    description: 'Affordable xiao long bao at hawker prices',
    tags: ['Xiao Long Bao', 'Shanghai', 'Hawker'],
    sourceId: 'gregs-big-eats',
    sourceUrl: 'https://gregsbigeats.com/'
  },
  {
    name: 'Yuan Chun Famous Lor Mee',
    address: 'Amoy Street Food Centre, 7 Maxwell Road, #02-100, Singapore 069111',
    description: 'Thick lor mee gravy with crispy fritters',
    tags: ['Lor Mee', 'Hokkien', 'Hawker'],
    sourceId: 'gregs-big-eats',
    sourceUrl: 'https://gregsbigeats.com/'
  },
  {
    name: 'Hup Kee Fried Oyster Omelette',
    address: 'Chomp Chomp Food Centre, 20 Kensington Park Road, Singapore 557269',
    description: 'Crispy oyster omelette with fresh oysters',
    tags: ['Oyster Omelette', 'Hawker', 'Supper'],
    sourceId: 'gregs-big-eats',
    sourceUrl: 'https://gregsbigeats.com/'
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

async function findNearestStation(lat: number, lng: number): Promise<{ stationId: string | null; distance: number | null; walkingTime: number | null }> {
  const { data: stations } = await supabase.from('stations').select('id, name, lat, lng');
  if (!stations) return { stationId: null, distance: null, walkingTime: null };

  let nearestStation: string | null = null;
  let minDistance = Infinity;

  for (const station of stations) {
    if (!station.lat || !station.lng) continue;
    // Haversine distance in km
    const R = 6371;
    const dLat = (lat - station.lat) * Math.PI / 180;
    const dLng = (lng - station.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(station.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    if (distance < minDistance) {
      minDistance = distance;
      nearestStation = station.id;
    }
  }

  // Calculate walking time (assume 5 km/h walking speed)
  const walkingTimeMinutes = minDistance > 0 ? Math.round((minDistance / 5) * 60) : null;
  const distanceMeters = minDistance > 0 ? Math.round(minDistance * 1000) : null;

  return {
    stationId: nearestStation,
    distance: distanceMeters,
    walkingTime: walkingTimeMinutes
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function ensureSourceExists() {
  // Check if source exists
  const { data: existingSource } = await supabase
    .from('food_sources')
    .select('id')
    .eq('id', 'gregs-big-eats')
    .single();

  if (!existingSource) {
    console.log('Adding gregs-big-eats source to food_sources table...');
    const { error } = await supabase
      .from('food_sources')
      .insert({
        id: 'gregs-big-eats',
        name: "Greg's Big Eats",
        icon: '🎬',
        url: 'https://gregsbigeats.com/',
        bg_color: '#DCFCE7',
      });

    if (error) {
      console.error('Error adding source:', error.message);
      return false;
    }
    console.log('Source added successfully!');
  } else {
    console.log('Source gregs-big-eats already exists.');
  }
  return true;
}

async function main() {
  // First ensure the source exists in food_sources table
  const sourceOk = await ensureSourceExists();
  if (!sourceOk) {
    console.error('Failed to add source, aborting.');
    return;
  }

  console.log(`\nAdding ${newListings.length} Greg's Big Eats listings...\n`);

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
    let walkingDistance: number | null = null;
    let walkingTime: number | null = null;

    if (result.places && result.places.length > 0) {
      const place = result.places[0];
      console.log(`  Found: ${place.displayName?.text || 'Unknown'}`);

      if (place.photos && place.photos.length > 0) {
        imageUrl = getPhotoUrl(place.photos[0].name);
      }

      if (place.location) {
        lat = place.location.latitude;
        lng = place.location.longitude;
        const stationInfo = await findNearestStation(lat, lng);
        stationId = stationInfo.stationId;
        walkingDistance = stationInfo.distance;
        walkingTime = stationInfo.walkingTime;
        console.log(`  Station: ${stationId || 'none'}, Distance: ${walkingDistance}m, Walk: ${walkingTime} min`);
      }
    } else {
      console.log(`  - Place not found in Google`);
    }

    // Insert new listing (without walking_distance/walking_time as they don't exist in schema)
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
