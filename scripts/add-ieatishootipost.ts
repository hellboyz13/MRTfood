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

// ieatishootipost featured hawker stalls and restaurants
const newListings: NewListing[] = [
  // Top 10 Hawker Trail - Hokkien Mee
  {
    name: 'Geylang Lor 29 Hokkien Mee',
    address: '396 East Coast Road, Singapore 428994',
    description: 'Famous wet hokkien mee still using charcoal stove for authentic wok hei',
    tags: ['Hokkien Mee', 'Hawker'],
    sourceId: 'ieatishootipost',
    sourceUrl: 'https://ieatishootipost.sg/top-ten-things-to-eat-in-singapore-the-hawker-edition/'
  },
  {
    name: 'Nam Sing Hokkien Fried Mee',
    address: 'Old Airport Road Food Centre, 51 Old Airport Road, #01-32, Singapore 390051',
    description: 'Popular dry-style hokkien mee at Old Airport Road',
    tags: ['Hokkien Mee', 'Hawker'],
    sourceId: 'ieatishootipost',
    sourceUrl: 'https://ieatishootipost.sg/singapores-top-ten-most-popular-hawker-dishes-and-where-to-eat-them/'
  },
  // Bak Chor Mee
  {
    name: 'Hill Street Tai Hwa Pork Noodle',
    address: '466 Crawford Lane, #01-12, Singapore 190465',
    description: 'World-famous Michelin-starred bak chor mee with signature vinegar kick',
    tags: ['Bak Chor Mee', 'Hawker', 'Michelin'],
    sourceId: 'ieatishootipost',
    sourceUrl: 'https://ieatishootipost.sg/category/food-directory/bak-chor-mee/'
  },
  {
    name: '58 Minced Meat Noodles',
    address: '163 Upper Changi Road, Singapore',
    description: 'Popular soup version bak chor mee',
    tags: ['Bak Chor Mee', 'Hawker'],
    sourceId: 'ieatishootipost',
    sourceUrl: 'https://ieatishootipost.sg/category/food-directory/bak-chor-mee/'
  },
  // Char Kway Teow
  {
    name: 'Hillstreet Char Kway Teow',
    address: 'Bedok South Road, Singapore',
    description: 'Classic char kway teow with cockles and lup cheong',
    tags: ['Char Kway Teow', 'Hawker'],
    sourceId: 'ieatishootipost',
    sourceUrl: 'https://ieatishootipost.sg/top-ten-things-to-eat-in-singapore-the-hawker-edition/'
  },
  {
    name: 'Outram Park Fried Kway Teow Mee',
    address: 'Hong Lim Food Centre, 531A Upper Cross Street, #02-17, Singapore 051531',
    description: 'Michelin Bib Gourmand char kway teow in the central area',
    tags: ['Char Kway Teow', 'Hawker', 'Michelin'],
    sourceId: 'ieatishootipost',
    sourceUrl: 'https://ieatishootipost.sg/singapores-top-ten-most-popular-hawker-dishes-and-where-to-eat-them/'
  },
  // Prawn Mee
  {
    name: 'Blanco Court Prawn Noodles',
    address: '243 Beach Road, Singapore 189754',
    description: 'Famous prawn noodles with rich umami broth and jumbo prawns',
    tags: ['Prawn Noodles', 'Hawker'],
    sourceId: 'ieatishootipost',
    sourceUrl: 'https://ieatishootipost.sg/top-ten-things-to-eat-in-singapore-the-hawker-edition/'
  },
  // Carrot Cake
  {
    name: 'Chey Sua Carrot Cake',
    address: 'Toa Payoh Lorong 4 Food Centre, Block 127, #02-30, Singapore 310127',
    description: 'Legendary carrot cake still making their own in small aluminum bowls',
    tags: ['Carrot Cake', 'Hawker'],
    sourceId: 'ieatishootipost',
    sourceUrl: 'https://ieatishootipost.sg/singapores-famous-five-best-carrot-cake/'
  },
  {
    name: 'Bedok Interchange Carrot Cake',
    address: 'Bedok Interchange Food Centre, 207 New Upper Changi Rd, #01-37, Singapore 461207',
    description: 'Famous black carrot cake with superior frying skills',
    tags: ['Carrot Cake', 'Hawker'],
    sourceId: 'ieatishootipost',
    sourceUrl: 'https://ieatishootipost.sg/singapores-famous-five-best-carrot-cake/'
  },
  {
    name: 'Peter Carrot Cake',
    address: 'Blk 85 Redhill Lane, Singapore 150085',
    description: 'Unique hand-mashed carrot cake technique for more chye poh',
    tags: ['Carrot Cake', 'Hawker'],
    sourceId: 'ieatishootipost',
    sourceUrl: 'https://ieatishootipost.sg/singapores-famous-five-best-carrot-cake/'
  },
  {
    name: 'Bukit Merah View Carrot Cake',
    address: 'Blk 115 Bukit Merah View, #01-37, Singapore 151115',
    description: 'Only stall still grinding their own rice for carrot cake',
    tags: ['Carrot Cake', 'Hawker'],
    sourceId: 'ieatishootipost',
    sourceUrl: 'https://ieatishootipost.sg/singapores-famous-five-best-carrot-cake/'
  },
  // Laksa
  {
    name: 'Katong Laksa (Original)',
    address: 'East Coast Road, Singapore',
    description: 'Original Katong laksa eaten with just a spoon, rich coconut gravy',
    tags: ['Laksa', 'Hawker'],
    sourceId: 'ieatishootipost',
    sourceUrl: 'https://ieatishootipost.sg/katong-laksa-will-the-original-katong-laksa-please-stand-up/'
  },
  // Satay
  {
    name: 'Haron 30 Satay',
    address: 'East Coast Lagoon Food Village, 1220 East Coast Parkway, Singapore 468960',
    description: 'Most popular satay stall at East Coast with succulent skewers',
    tags: ['Satay', 'Malay', 'Hawker'],
    sourceId: 'ieatishootipost',
    sourceUrl: 'https://ieatishootipost.sg/top-ten-things-to-eat-in-singapore-the-hawker-edition/'
  },
  // Oyster Omelette
  {
    name: "Lim's Fried Oyster",
    address: 'Jalan Berseh Food Centre, 166 Jalan Besar, Singapore 208877',
    description: 'Old school oyster omelette (or luak)',
    tags: ['Oyster Omelette', 'Hawker'],
    sourceId: 'ieatishootipost',
    sourceUrl: 'https://ieatishootipost.sg/singapores-top-ten-most-popular-hawker-dishes-and-where-to-eat-them/'
  },
  // Zi Char Trail
  {
    name: 'Whampoa Keng Fish Head Steamboat',
    address: '116/118 Rangoon Road, Singapore 218393',
    description: 'Tasty fish head steamboat and san lor hor fun with wok hei',
    tags: ['Fish Head Steamboat', 'Zi Char', 'Chinese'],
    sourceId: 'ieatishootipost',
    sourceUrl: 'https://ieatishootipost.sg/singapores-top-ten-zi-char-dishes-the-ultimate-zi-char-trail/'
  },
  {
    name: 'Sik Bao Sin',
    address: '592 Geylang Road, Singapore 389522',
    description: 'Famous tofu prawns with irresistible sauce',
    tags: ['Zi Char', 'Chinese', 'Seafood'],
    sourceId: 'ieatishootipost',
    sourceUrl: 'https://ieatishootipost.sg/singapores-top-ten-zi-char-dishes-the-ultimate-zi-char-trail/'
  },
  {
    name: 'Zai Shun Curry Fish Head',
    address: 'Blk 253 Jurong East St 24, #01-205, Singapore 600253',
    description: 'Best steamed fish in Singapore with fresh fish at reasonable prices',
    tags: ['Fish Head Curry', 'Zi Char', 'Chinese'],
    sourceId: 'ieatishootipost',
    sourceUrl: 'https://ieatishootipost.sg/singapores-top-ten-zi-char-dishes-the-ultimate-zi-char-trail/'
  },
  {
    name: 'Ocean Curry Fish Head',
    address: 'Blk 92 Toa Payoh Lorong 4, #01-258, Singapore 310092',
    description: 'Well-balanced curry gravy with quality wild-caught fish',
    tags: ['Fish Head Curry', 'Zi Char', 'Chinese'],
    sourceId: 'ieatishootipost',
    sourceUrl: 'https://ieatishootipost.sg/singapores-top-ten-zi-char-dishes-the-ultimate-zi-char-trail/'
  },
  // Western
  {
    name: 'Holy Grill',
    address: 'Old Airport Road Food Centre, 51 Old Airport Road, Singapore 390051',
    description: 'Modern hawker western with generous portions, nominated for Best Hawker Western',
    tags: ['Western', 'Hawker'],
    sourceId: 'ieatishootipost',
    sourceUrl: 'https://ieatishootipost.sg/holy-grill-modern-hawker-western-food/'
  },
  // Fried Chicken Wings
  {
    name: 'Eng Kee Chicken Wings',
    address: 'Multiple outlets, Singapore',
    description: 'Most well-known hawker fried chicken wings with 9 branches',
    tags: ['Fried Chicken', 'Hawker'],
    sourceId: 'ieatishootipost',
    sourceUrl: 'https://ieatishootipost.sg/singapores-top-ten-most-popular-hawker-dishes-and-where-to-eat-them/'
  },
  // Bak Chang
  {
    name: 'Hoo Kee Bak Chang',
    address: 'Amoy Street Food Centre, 7 Maxwell Road, Singapore 069111',
    description: 'Since 1948, one of the most famous bak chang in Singapore',
    tags: ['Bak Chang', 'Hawker'],
    sourceId: 'ieatishootipost',
    sourceUrl: 'https://ieatishootipost.sg/hoo-kee-bak-chang-keeping-tradition-alive/'
  },
  // Fish Soup
  {
    name: 'Thai Seng Fish Soup',
    address: 'Bugis area, Singapore',
    description: 'Go-to Teochew fish soup',
    tags: ['Fish Soup', 'Teochew', 'Hawker'],
    sourceId: 'ieatishootipost',
    sourceUrl: 'https://ieatishootipost.sg/category/food-directory/fish-soup/'
  },
  {
    name: 'Black Rock Fish Head Steamboat',
    address: 'Singapore',
    description: 'Classic Teochew-style fish soup with broth simmered for hours',
    tags: ['Fish Head Steamboat', 'Teochew', 'Chinese'],
    sourceId: 'ieatishootipost',
    sourceUrl: 'https://ieatishootipost.sg/black-rock-fish-head-steamboat-new-kid-on-the-bl-rock/'
  },
  // Wanton Mee
  {
    name: "Eng's Wanton Mee",
    address: 'Tanjong Katong, Singapore',
    description: 'Famous wanton mee with powerful chilli sauce',
    tags: ['Wanton Mee', 'Hawker'],
    sourceId: 'ieatishootipost',
    sourceUrl: 'https://ieatishootipost.sg/'
  },
  {
    name: '18 Seafood',
    address: 'Singapore',
    description: 'Neighbourhood Cantonese zi char with very nice wantons',
    tags: ['Zi Char', 'Wanton Mee', 'Cantonese'],
    sourceId: 'ieatishootipost',
    sourceUrl: 'https://ieatishootipost.sg/18-seafood-neighbourhood-cantonese-zi-char/'
  },
  // Restaurants
  {
    name: 'Nikuya Tanaka',
    address: 'Singapore',
    description: "Japan's No. 1 steakhouse now in Singapore - The Wagyu Boss",
    tags: ['Japanese', 'Steak', 'Restaurant'],
    sourceId: 'ieatishootipost',
    sourceUrl: 'https://ieatishootipost.sg/'
  },
  {
    name: 'Wee Family Coffeeshop',
    address: 'Singapore',
    description: 'The Zi Char Genie - featured for 10+ years on ieatishootipost',
    tags: ['Zi Char', 'Chinese', 'Coffeeshop'],
    sourceId: 'ieatishootipost',
    sourceUrl: 'https://ieatishootipost.sg/'
  },
  {
    name: 'Nami Korean Grill House',
    address: 'Bukit Timah, Singapore',
    description: 'Cosy Korean BBQ experience tucked away in leafy Bukit Timah',
    tags: ['Korean BBQ', 'Korean', 'Restaurant'],
    sourceId: 'ieatishootipost',
    sourceUrl: 'https://ieatishootipost.sg/'
  },
  {
    name: 'Tonkichi',
    address: 'Singapore',
    description: 'First specialty Tonkatsu restaurant in Singapore since 1992',
    tags: ['Tonkatsu', 'Japanese', 'Restaurant'],
    sourceId: 'ieatishootipost',
    sourceUrl: 'https://ieatishootipost.sg/'
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
    .eq('id', 'ieatishootipost')
    .single();

  if (!existingSource) {
    console.log('Adding ieatishootipost source to food_sources table...');
    const { error } = await supabase
      .from('food_sources')
      .insert({
        id: 'ieatishootipost',
        name: 'ieatishootipost',
        icon: '📸',
        url: 'https://ieatishootipost.sg/',
        bg_color: '#ECFCCB',
      });

    if (error) {
      console.error('Error adding source:', error.message);
      return false;
    }
    console.log('Source added successfully!');
  } else {
    console.log('Source ieatishootipost already exists.');
  }
  return true;
}

async function main() {
  const sourceOk = await ensureSourceExists();
  if (!sourceOk) {
    console.error('Failed to add source, aborting.');
    return;
  }

  console.log(`\nAdding ${newListings.length} ieatishootipost listings...\n`);

  let added = 0;
  let skipped = 0;
  let failed = 0;

  for (const listing of newListings) {
    console.log(`\nProcessing: ${listing.name}`);

    const { data: existing } = await supabase
      .from('food_listings')
      .select('id, name')
      .ilike('name', `%${listing.name}%`)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`  - Already exists: ${existing[0].name}`);

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
