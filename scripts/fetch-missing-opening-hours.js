const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Mall name mappings for better search
const mallNames = {
  'jurong-point': 'Jurong Point',
  'northshore-plaza-i-ii': 'Northshore Plaza',
  'scotts-square': 'Scotts Square',
  'fajar-shopping-centre': 'Fajar Shopping Centre',
  'rivervale-plaza': 'Rivervale Plaza',
  'vista-point': 'Vista Point',
  'sim-lim-square': 'Sim Lim Square',
  'limbang-shopping-centre': 'Limbang Shopping Centre',
  'plaza-singapura': 'Plaza Singapura',
  'rivervale-mall': 'Rivervale Mall',
  'people-s-park-complex': "People's Park Complex",
  'sunshine-place': 'Sunshine Place',
  'junction-8': 'Junction 8',
  'far-east-plaza': 'Far East Plaza',
  'esplanade-mall-food-court': 'Esplanade Mall',
  'expo-food-court': 'Singapore Expo',
  'katong-v': 'Katong V',
  'heartbeat-bedok': 'Heartbeat@Bedok',
  'the-woodleigh-mall': 'The Woodleigh Mall',
  'the-clementi-mall': 'The Clementi Mall',
  'funan': 'Funan Mall',
  'hong-lim-market-and-food-centre': 'Hong Lim Food Centre',
  'ngee-ann-city': 'Ngee Ann City',
  'vivocity': 'VivoCity',
  'toa-payoh-hdb-hub': 'Toa Payoh HDB Hub',
  'anchorpoint': 'Anchorpoint',
  'great-world': 'Great World',
  'suntec-city': 'Suntec City',
  'parkway-parade': 'Parkway Parade',
  'west-coast-plaza': 'West Coast Plaza',
  'people-s-park-centre': "People's Park Centre",
  'admiralty-place': 'Admiralty Place',
  'oasis-terraces': 'Oasis Terraces',
  'east-village': 'East Village',
  'lucky-plaza': 'Lucky Plaza',
  'greenridge-shopping-centre': 'Greenridge Shopping Centre',
  'jewel-changi-airport': 'Jewel Changi Airport',
  'capitol-singapore': 'Capitol Singapore',
  'tampines-mall': 'Tampines Mall',
  'the-cathay': 'The Cathay',
  'bedok-mall': 'Bedok Mall',
  'ion-orchard': 'ION Orchard',
  'wisma-atria': 'Wisma Atria',
};

async function searchPlaceWithHours(name, mallId) {
  const mallName = mallNames[mallId] || mallId.replace(/-/g, ' ');
  const query = `${name} ${mallName} Singapore`;

  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.regularOpeningHours'
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 1 })
  });

  const data = await response.json();
  return data.places?.[0];
}

// Convert Google opening hours to our format
function convertOpeningHours(googleHours) {
  if (!googleHours?.weekdayDescriptions) return null;

  const dayMap = {
    'Monday': 'monday',
    'Tuesday': 'tuesday',
    'Wednesday': 'wednesday',
    'Thursday': 'thursday',
    'Friday': 'friday',
    'Saturday': 'saturday',
    'Sunday': 'sunday'
  };

  const result = {};

  for (const desc of googleHours.weekdayDescriptions) {
    // Format: "Monday: 10:00 AM – 9:00 PM" or "Monday: Closed"
    const match = desc.match(/^(\w+):\s*(.+)$/);
    if (match) {
      const day = dayMap[match[1]];
      const hours = match[2].trim();

      if (day) {
        if (hours.toLowerCase() === 'closed') {
          result[day] = 'Closed';
        } else if (hours.toLowerCase().includes('open 24 hours')) {
          result[day] = '24 hours';
        } else {
          result[day] = hours;
        }
      }
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

async function main() {
  const MAX_REQUESTS = 100;

  console.log('=== FETCHING MISSING OPENING HOURS VIA GOOGLE PLACES API ===\n');

  // Get all outlets missing opening hours
  let allData = [];
  let offset = 0;
  const batchSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('mall_outlets')
      .select('id, name, mall_id, opening_hours')
      .range(offset, offset + batchSize - 1);

    if (error) {
      console.error('Error:', error);
      return;
    }

    allData = allData.concat(data);
    if (data.length < batchSize) break;
    offset += batchSize;
  }

  const withoutHours = allData.filter(o => !o.opening_hours || Object.keys(o.opening_hours).length === 0);
  console.log(`Total outlets missing opening hours: ${withoutHours.length}`);
  console.log(`Will process up to ${MAX_REQUESTS} outlets\n`);

  const toProcess = withoutHours.slice(0, MAX_REQUESTS);
  let found = 0;
  let notFound = 0;
  let updated = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const outlet = toProcess[i];
    console.log(`[${i + 1}/${toProcess.length}] ${outlet.name} (${outlet.mall_id})`);

    try {
      const place = await searchPlaceWithHours(outlet.name, outlet.mall_id);

      if (!place) {
        console.log(`  ✗ Not found on Google`);
        notFound++;
        await delay(200);
        continue;
      }

      if (!place.regularOpeningHours) {
        console.log(`  ✗ Found but no opening hours`);
        notFound++;
        await delay(200);
        continue;
      }

      const hours = convertOpeningHours(place.regularOpeningHours);
      if (!hours) {
        console.log(`  ✗ Could not parse opening hours`);
        notFound++;
        await delay(200);
        continue;
      }

      console.log(`  ✓ Found: ${place.displayName?.text}`);
      console.log(`    Hours: ${JSON.stringify(hours).substring(0, 80)}...`);
      found++;

      // Update database
      const { error: updateError } = await supabase
        .from('mall_outlets')
        .update({ opening_hours: hours })
        .eq('id', outlet.id);

      if (updateError) {
        console.log(`  ⚠️ Update error: ${updateError.message}`);
      } else {
        updated++;
      }

    } catch (err) {
      console.log(`  ✗ Error: ${err.message}`);
      notFound++;
    }

    await delay(200); // Rate limiting
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Processed: ${toProcess.length}`);
  console.log(`Found with hours: ${found}`);
  console.log(`Not found/no hours: ${notFound}`);
  console.log(`Updated in DB: ${updated}`);
  console.log(`Remaining without hours: ${withoutHours.length - updated}`);
}

main().catch(console.error);
