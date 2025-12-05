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

// EatBook featured hawker stalls and restaurants
const newListings: NewListing[] = [
  // Maxwell Food Centre
  {
    name: 'Tian Tian Hainanese Chicken Rice',
    address: 'Maxwell Food Centre, 1 Kadayanallur Street, #01-10/11, Singapore 069184',
    description: 'World-famous chicken rice with silky smooth chicken and fragrant rice',
    tags: ['Chicken Rice', 'Hainanese', 'Hawker'],
    sourceId: 'eatbook',
    sourceUrl: 'https://eatbook.sg/best-hawker-centres-singapore/'
  },
  {
    name: 'Ah Tai Hainanese Chicken Rice',
    address: 'Maxwell Food Centre, 1 Kadayanallur Street, #01-07, Singapore 069184',
    description: 'Run by ex-head cook of Tian Tian with 20+ years experience',
    tags: ['Chicken Rice', 'Hainanese', 'Hawker'],
    sourceId: 'eatbook',
    sourceUrl: 'https://eatbook.sg/best-hawker-centres-singapore/'
  },
  {
    name: 'Jin Hua Fish Head Bee Hoon',
    address: 'Maxwell Food Centre, 1 Kadayanallur Street, #01-80, Singapore 069184',
    description: 'Top-tier fish soup with fresh fish and bee hoon',
    tags: ['Fish Soup', 'Bee Hoon', 'Hawker'],
    sourceId: 'eatbook',
    sourceUrl: 'https://eatbook.sg/best-hawker-centres-singapore/'
  },
  // Chinatown Complex
  {
    name: 'Lian He Ben Ji Claypot Rice',
    address: 'Chinatown Complex Food Centre, 335 Smith Street, #02-198/199, Singapore 050335',
    description: 'Famous claypot rice with charred rice crust and Chinese sausage',
    tags: ['Claypot Rice', 'Chinese', 'Hawker'],
    sourceId: 'eatbook',
    sourceUrl: 'https://eatbook.sg/best-hawker-centres-singapore/'
  },
  {
    name: 'Fatty Ox HK Kitchen',
    address: 'Chinatown Complex Food Centre, 335 Smith Street, #02-135, Singapore 050335',
    description: 'Hong Kong style beef brisket noodles',
    tags: ['Beef Noodles', 'Hong Kong', 'Hawker'],
    sourceId: 'eatbook',
    sourceUrl: 'https://eatbook.sg/best-hawker-centres-singapore/'
  },
  {
    name: 'Jin Ji Teochew Braised Duck & Kway Chap',
    address: 'Chinatown Complex Food Centre, 335 Smith Street, #02-132, Singapore 050335',
    description: 'Traditional Teochew braised duck and kway chap',
    tags: ['Braised Duck', 'Kway Chap', 'Teochew', 'Hawker'],
    sourceId: 'eatbook',
    sourceUrl: 'https://eatbook.sg/best-hawker-centres-singapore/'
  },
  {
    name: 'Liao Fan Hong Kong Soya Sauce Chicken Rice',
    address: 'Chinatown Complex Food Centre, 335 Smith Street, #02-126, Singapore 050335',
    description: 'Michelin-starred soya sauce chicken rice and noodles',
    tags: ['Soya Sauce Chicken', 'Hong Kong', 'Hawker', 'Michelin'],
    sourceId: 'eatbook',
    sourceUrl: 'https://eatbook.sg/'
  },
  {
    name: 'Weng Kiang Kee Porridge',
    address: 'Chinatown Complex Food Centre, 335 Smith Street, #02-082, Singapore 050335',
    description: 'Premium Hainanese porridge with pig intestines, minced pork, abalone',
    tags: ['Porridge', 'Hainanese', 'Hawker'],
    sourceId: 'eatbook',
    sourceUrl: 'https://eatbook.sg/'
  },
  // Old Airport Road
  {
    name: 'Nam Sing Hokkien Fried Mee',
    address: 'Old Airport Road Food Centre, 51 Old Airport Road, #01-32, Singapore 390051',
    description: 'Michelin Bib Gourmand hokkien mee with wok hei',
    tags: ['Hokkien Mee', 'Hawker', 'Michelin'],
    sourceId: 'eatbook',
    sourceUrl: 'https://eatbook.sg/best-hawker-centres-singapore/'
  },
  {
    name: 'To-Ricos Kway Chap',
    address: 'Old Airport Road Food Centre, 51 Old Airport Road, #01-94, Singapore 390051',
    description: 'Michelin Bib Gourmand kway chap with tender braised items',
    tags: ['Kway Chap', 'Hawker', 'Michelin'],
    sourceId: 'eatbook',
    sourceUrl: 'https://eatbook.sg/best-hawker-centres-singapore/'
  },
  // Adam Road
  {
    name: "No. 1 Adam's Nasi Lemak",
    address: 'Adam Road Food Centre, 2 Adam Road, #01-02, Singapore 289876',
    description: 'Famous halal nasi lemak with fragrant coconut rice',
    tags: ['Nasi Lemak', 'Halal', 'Malay', 'Hawker'],
    sourceId: 'eatbook',
    sourceUrl: 'https://eatbook.sg/best-hawker-centres-singapore/'
  },
  {
    name: 'Selera Rasa Nasi Lemak',
    address: 'Adam Road Food Centre, 2 Adam Road, #01-35, Singapore 289876',
    description: 'Popular halal nasi lemak with rich sambal',
    tags: ['Nasi Lemak', 'Halal', 'Malay', 'Hawker'],
    sourceId: 'eatbook',
    sourceUrl: 'https://eatbook.sg/best-hawker-centres-singapore/'
  },
  {
    name: 'Adam Rd Noo Cheng Big Prawn Noodle',
    address: 'Adam Road Food Centre, 2 Adam Road, #01-39, Singapore 289876',
    description: 'Michelin Bib Gourmand prawn noodles with huge prawns',
    tags: ['Prawn Noodles', 'Hawker', 'Michelin'],
    sourceId: 'eatbook',
    sourceUrl: 'https://eatbook.sg/best-hawker-centres-singapore/'
  },
  {
    name: 'Bahrakath Mutton Soup',
    address: 'Adam Road Food Centre, 2 Adam Road, Singapore 289876',
    description: 'Michelin Bib Gourmand soup kambing',
    tags: ['Soup Kambing', 'Halal', 'Indian', 'Hawker', 'Michelin'],
    sourceId: 'eatbook',
    sourceUrl: 'https://eatbook.sg/'
  },
  // Amoy Street
  {
    name: 'A Noodle Story',
    address: 'Amoy Street Food Centre, 7 Maxwell Road, #01-39, Singapore 069111',
    description: 'Michelin-starred Singapore-style ramen fusion',
    tags: ['Ramen', 'Fusion', 'Hawker', 'Michelin'],
    sourceId: 'eatbook',
    sourceUrl: 'https://eatbook.sg/best-hawker-centres-singapore/'
  },
  {
    name: 'Han Kee Fish Soup',
    address: 'Amoy Street Food Centre, 7 Maxwell Road, #02-86, Singapore 069111',
    description: 'Fresh sliced fish soup with milky broth',
    tags: ['Fish Soup', 'Hawker'],
    sourceId: 'eatbook',
    sourceUrl: 'https://eatbook.sg/best-hawker-centres-singapore/'
  },
  // Margaret Drive
  {
    name: 'Queenstown Lontong',
    address: 'Margaret Drive Hawker Centre, 38A Margaret Drive, #02-16, Singapore 141038',
    description: 'Halal-certified lontong since the 1960s',
    tags: ['Lontong', 'Halal', 'Malay', 'Hawker'],
    sourceId: 'eatbook',
    sourceUrl: 'https://eatbook.sg/margaret-drive-hawker-centre/'
  },
  // Western Food
  {
    name: '5 Star Corner',
    address: 'Blk 209 Hougang Street 21, #01-41, Singapore 530209',
    description: 'Huge portions of Western food under $7 - famous chicken cutlet',
    tags: ['Western', 'Hawker', 'Budget'],
    sourceId: 'eatbook',
    sourceUrl: 'https://eatbook.sg/western-stalls/'
  },
  {
    name: 'Wow Wow West Genuine',
    address: 'ABC Brickworks Food Centre, 6 Jalan Bukit Merah, #01-30, Singapore 150006',
    description: 'Since 1999, affordable Western with pork chop and fish & chips',
    tags: ['Western', 'Hawker', 'Budget'],
    sourceId: 'eatbook',
    sourceUrl: 'https://eatbook.sg/western-stalls/'
  },
  // Tiong Bahru
  {
    name: 'Hong Heng Fried Sotong Prawn Mee',
    address: 'Tiong Bahru Market, 30 Seng Poh Road, #02-01, Singapore 168898',
    description: 'Famous hokkien mee with squid and prawn',
    tags: ['Hokkien Mee', 'Hawker'],
    sourceId: 'eatbook',
    sourceUrl: 'https://eatbook.sg/'
  },
  {
    name: 'Jian Bo Shui Kueh',
    address: 'Tiong Bahru Market, 30 Seng Poh Road, #02-05, Singapore 168898',
    description: 'Traditional chwee kueh with savoury preserved radish',
    tags: ['Chwee Kueh', 'Hawker'],
    sourceId: 'eatbook',
    sourceUrl: 'https://eatbook.sg/'
  },
  // Hill Street Tai Hwa
  {
    name: 'Hill Street Tai Hwa Pork Noodle',
    address: '466 Crawford Lane, #01-12, Singapore 190465',
    description: 'Michelin-starred bak chor mee with signature vinegar kick',
    tags: ['Bak Chor Mee', 'Hawker', 'Michelin'],
    sourceId: 'eatbook',
    sourceUrl: 'https://eatbook.sg/'
  },
  // Ghim Moh
  {
    name: '63 Laksa',
    address: 'Ghim Moh Market & Food Centre, 20 Ghim Moh Road, Singapore 270020',
    description: 'Sungei Road-style laksa with rich coconut gravy',
    tags: ['Laksa', 'Hawker'],
    sourceId: 'eatbook',
    sourceUrl: 'https://eatbook.sg/'
  },
  {
    name: 'Hong Soon Carrot Cake',
    address: 'Ghim Moh Market & Food Centre, 20 Ghim Moh Road, Singapore 270020',
    description: 'Wok hei carrot cake (chai tow kway)',
    tags: ['Carrot Cake', 'Hawker'],
    sourceId: 'eatbook',
    sourceUrl: 'https://eatbook.sg/'
  },
  {
    name: 'JW Korean Food Stories',
    address: 'Ghim Moh Market & Food Centre, 19 Ghim Moh Road, #01-229, Singapore 270019',
    description: 'Muslim-owned Korean hawker with army stew steamboat',
    tags: ['Korean', 'Halal', 'Hawker'],
    sourceId: 'eatbook',
    sourceUrl: 'https://eatbook.sg/'
  },
  // Restaurants from CSV
  {
    name: 'Kok Sen',
    address: '4 Keong Saik Rd, Singapore 089110',
    description: 'Famous zi char with Big Prawns Hor Fun and Prawn Paste Chicken',
    tags: ['Zi Char', 'Chinese', 'Restaurant'],
    sourceId: 'eatbook',
    sourceUrl: 'https://eatbook.sg/'
  },
  {
    name: 'Hjh Maimunah',
    address: 'Jalan Pisang, Singapore',
    description: 'Halal nasi padang with BBQ Seabass and Sambal Goreng Jawa',
    tags: ['Nasi Padang', 'Halal', 'Malay', 'Restaurant'],
    sourceId: 'eatbook',
    sourceUrl: 'https://eatbook.sg/'
  },
  {
    name: 'Cumi Bali',
    address: '50 Tras St, Singapore 078989',
    description: 'Halal Indonesian restaurant with signature Cumi Bali',
    tags: ['Indonesian', 'Halal', 'Restaurant'],
    sourceId: 'eatbook',
    sourceUrl: 'https://eatbook.sg/'
  },
  {
    name: 'The Coconut Club',
    address: '269 Beach Road, Singapore',
    description: 'Famous nasi lemak restaurant with signature chicken leg',
    tags: ['Nasi Lemak', 'Restaurant'],
    sourceId: 'eatbook',
    sourceUrl: 'https://eatbook.sg/'
  },
  {
    name: 'Keng Eng Kee Seafood',
    address: '1/A Tampines Street 92, SAFRA Tampines, Singapore 528882',
    description: 'Famous zi char with Moonlight Hor Fun and Coffee Pork Ribs',
    tags: ['Zi Char', 'Seafood', 'Chinese', 'Restaurant'],
    sourceId: 'eatbook',
    sourceUrl: 'https://eatbook.sg/'
  },
  {
    name: "Picanhas'",
    address: '90 Club St, Singapore 069458',
    description: 'Halal steakhouse with Queen of Steak',
    tags: ['Steakhouse', 'Halal', 'Western', 'Restaurant'],
    sourceId: 'eatbook',
    sourceUrl: 'https://eatbook.sg/'
  },
  {
    name: 'Burgernomics',
    address: 'Pasir Ris Central Hawker Centre, 110 Pasir Ris Central, #02-03, Singapore 519641',
    description: 'Muslim-owned burger hawker with Deluxe Burger $6.50',
    tags: ['Burgers', 'Halal', 'Hawker', 'Budget'],
    sourceId: 'eatbook',
    sourceUrl: 'https://eatbook.sg/'
  },
  {
    name: 'Ah Heng Curry Chicken Bee Hoon Mee',
    address: 'QS269 Food House, 269B Queen Street, #01-236, Singapore 180269',
    description: 'Curry chicken bee hoon from $6',
    tags: ['Curry Noodles', 'Hawker'],
    sourceId: 'eatbook',
    sourceUrl: 'https://eatbook.sg/'
  },
  {
    name: 'Eat3Cuts',
    address: 'Burlington Square, 175 Bencoolen Street, #01-49, Singapore 189649',
    description: 'Cantonese roast meats with whole roast duck and pipa duck',
    tags: ['Roast Meats', 'Cantonese', 'Hawker'],
    sourceId: 'eatbook',
    sourceUrl: 'https://eatbook.sg/'
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
    .eq('id', 'eatbook')
    .single();

  if (!existingSource) {
    console.log('Adding eatbook source to food_sources table...');
    const { error } = await supabase
      .from('food_sources')
      .insert({
        id: 'eatbook',
        name: 'EatBook',
        icon: '📖',
        url: 'https://eatbook.sg/',
        bg_color: '#FEF3C7',
      });

    if (error) {
      console.error('Error adding source:', error.message);
      return false;
    }
    console.log('Source added successfully!');
  } else {
    console.log('Source eatbook already exists.');
  }
  return true;
}

async function main() {
  const sourceOk = await ensureSourceExists();
  if (!sourceOk) {
    console.error('Failed to add source, aborting.');
    return;
  }

  console.log(`\nAdding ${newListings.length} EatBook listings...\n`);

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
