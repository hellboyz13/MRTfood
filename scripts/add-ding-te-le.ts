import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import https from 'https';

const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4'
);

const GOOGLE_API_KEY = 'AIzaSyB2nTAy0K17gdWwlwJ2CYs4kbO0SUxYJvs';

interface DingTeLeListing {
  name: string;
  address: string;
  description: string;
  tags: string[];
  sourceId: string;
  sourceUrl?: string;
}

// DING TE LE locations (not chain - individual listings)
const dingTeLeListings: DingTeLeListing[] = [
  {
    name: 'Ding Te Le (Kovan)',
    address: '949 Upper Serangoon Road, Singapore 534713',
    description: 'Popular Shanghainese eatery famous for xiao long bao, sheng jian bao and handmade noodles',
    tags: ['Shanghainese', 'Xiao Long Bao', 'Sheng Jian Bao', 'Dumplings', 'Noodles', 'Chinese'],
    sourceId: 'editors-choice',
  },
  {
    name: 'Ding Te Le (Bukit Timah)',
    address: '6 Cheong Chin Nam Road, Singapore 599731',
    description: 'Popular Shanghainese eatery famous for xiao long bao, sheng jian bao and handmade noodles',
    tags: ['Shanghainese', 'Xiao Long Bao', 'Sheng Jian Bao', 'Dumplings', 'Noodles', 'Chinese'],
    sourceId: 'editors-choice',
  },
  {
    name: 'Ding Te Le (Marina Bay Sands)',
    address: '2 Bayfront Avenue, #B2-49A/50-53 Canal Level, The Shoppes at Marina Bay Sands, Singapore 018972',
    description: 'Popular Shanghainese eatery famous for xiao long bao, sheng jian bao and handmade noodles',
    tags: ['Shanghainese', 'Xiao Long Bao', 'Sheng Jian Bao', 'Dumplings', 'Noodles', 'Chinese'],
    sourceId: 'editors-choice',
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
    // Haversine formula
    const R = 6371; // Earth's radius in km
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

  // Calculate walking time: average walking speed ~5km/h
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
  const { data: existingSource } = await supabase
    .from('food_sources')
    .select('id')
    .eq('id', 'editors-choice')
    .single();

  if (!existingSource) {
    console.log('Adding editors-choice source to food_sources table...');
    const { error } = await supabase
      .from('food_sources')
      .insert({
        id: 'editors-choice',
        name: "Editor's Choice",
        icon: '✨',
        url: '',
        bg_color: '#FDF4FF', // fuchsia-50
      });

    if (error) {
      console.error('Error adding source:', error.message);
      return false;
    }
    console.log('Source added successfully!');
  } else {
    console.log('Source editors-choice already exists.');
  }
  return true;
}

async function main() {
  console.log('===========================================');
  console.log('  Adding DING TE LE to MRTfood database');
  console.log('===========================================\n');

  const sourceOk = await ensureSourceExists();
  if (!sourceOk) {
    console.error('Failed to add source, aborting.');
    return;
  }

  console.log(`\nProcessing ${dingTeLeListings.length} DING TE LE locations...\n`);

  let added = 0;
  let skipped = 0;
  let failed = 0;

  for (const listing of dingTeLeListings) {
    console.log(`\n----------------------------------------`);
    console.log(`Processing: ${listing.name}`);
    console.log(`Address: ${listing.address}`);

    // Check if already exists
    const { data: existing } = await supabase
      .from('food_listings')
      .select('id, name')
      .ilike('name', `%${listing.name}%`)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`  - Already exists: ${existing[0].name}`);

      // Still add source link if not exists
      const { error: sourceError } = await supabase
        .from('listing_sources')
        .upsert({
          listing_id: existing[0].id,
          source_id: listing.sourceId,
          source_url: listing.sourceUrl || '',
          is_primary: true,
        }, { onConflict: 'listing_id,source_id' });

      if (sourceError) {
        console.log(`  - Error adding source: ${sourceError.message}`);
      } else {
        console.log(`  + Updated source to ${listing.sourceId}`);
      }
      skipped++;
      continue;
    }

    // Search Google Places API for location and photo
    console.log(`  Searching Google Places API...`);
    const result = await searchPlace(listing.name.replace(' (Kovan)', '').replace(' (Bukit Timah)', '').replace(' (Marina Bay Sands)', ''), listing.address);

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
        console.log(`  Image: Found`);
      }

      if (place.location) {
        lat = place.location.latitude;
        lng = place.location.longitude;
        console.log(`  Coordinates: ${lat}, ${lng}`);

        // Find nearest MRT station
        const stationInfo = await findNearestStation(lat, lng);
        stationId = stationInfo.stationId;
        walkingDistance = stationInfo.distance;
        walkingTime = stationInfo.walkingTime;
        console.log(`  Nearest Station: ${stationId}`);
        console.log(`  Walking Distance: ${walkingDistance}m`);
        console.log(`  Walking Time: ${walkingTime} min`);
      }
    } else {
      console.log(`  - Place not found in Google Places API`);
    }

    // Insert the listing
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
        distance_to_station: walkingDistance,
        walking_time: walkingTime,
        is_active: true,
      });

    if (insertError) {
      console.log(`  ERROR: Insert failed: ${insertError.message}`);
      failed++;
      continue;
    }

    // Add to listing_sources
    const { error: sourceError } = await supabase
      .from('listing_sources')
      .insert({
        listing_id: newId,
        source_id: listing.sourceId,
        source_url: listing.sourceUrl || '',
        is_primary: true,
      });

    if (sourceError) {
      console.log(`  WARNING: Source link failed: ${sourceError.message}`);
    } else {
      console.log(`  SUCCESS: Added with ${listing.sourceId} source!`);
      added++;
    }

    await sleep(300); // Rate limit
  }

  console.log(`\n===========================================`);
  console.log(`RESULTS:`);
  console.log(`  Added: ${added}`);
  console.log(`  Skipped (existing): ${skipped}`);
  console.log(`  Failed: ${failed}`);
  console.log(`===========================================`);
}

main().catch(console.error);
