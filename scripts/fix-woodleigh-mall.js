const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Correct Woodleigh Mall F&B outlets from official list
const correctOutlets = [
  { name: 'A&W', unit: '#01-40' },
  { name: 'BreadTalk & Toast Box', unit: '#01-35/36' },
  { name: 'Brewerkz', unit: '#02-20/20A' },
  { name: 'Bugis Xin Yuan Ji', unit: '#B1-K39' },
  { name: 'Bulgogi Syo', unit: '#01-33/34' },
  { name: 'Burger King', unit: '#B1-01' },
  { name: 'Cedele Bakery Kitchen', unit: '#01-38' },
  { name: 'COLLIN\'S GASTRO DINING', unit: '#01-24' },
  { name: 'EAT.', unit: '#B1-K40' },
  { name: 'Fish&Co', unit: '#01-37' },
  { name: 'Food Republic', unit: '#B1-09/10' },
  { name: 'Fun Toast', unit: '#02-19' },
  { name: 'Genki Sushi', unit: '#01-31' },
  { name: 'Gong Yuan Ma La Tang & LiHO', unit: '#B1-K51/52' },
  { name: 'Hi NOODLE', unit: '#01-27/28' },
  { name: 'K.COOK Korean BBQ Buffet', unit: '#02-49/50' },
  { name: 'Little Italy', unit: '#02-48' },
  { name: 'McDonald\'s', unit: '#B1-11/12' },
  { name: 'My Briyani House', unit: '#01-57' },
  { name: 'OLLA Specialty Coffee', unit: '#01-55' },
  { name: 'Paradise Classic & LeNu', unit: '#01-41' },
  { name: 'Pepper Lunch', unit: '#01-54' },
  { name: 'Popeyes Famous Louisiana Chicken', unit: '#B1-13' },
  { name: 'Poulet', unit: '#B1-26/27' },
  { name: 'Qin Ji Rougamo', unit: '#B1-K35/K36' },
  { name: 'Shi Jian Hot Pot', unit: '#02-51' },
  { name: 'So Pho', unit: '#01-29/30' },
  { name: 'Starbucks', unit: '#01-01' },
  { name: 'Subway', unit: '#B1-05' },
  { name: 'Surrey Hills Grocer', unit: '#01-52/53' },
  { name: 'Ten Points Porridge', unit: '#B1-K37' },
  { name: 'The Soup Spoon Union', unit: '#01-39' },
  { name: 'Time for Thai', unit: '#B1-K38' },
  { name: 'Tiong Bahru Bakery', unit: '#02-47' },
  { name: 'Watami Japanese Dining', unit: '#02-21' },
  { name: 'Ya Kun Kaya Toast', unit: '#B1-07' },
  { name: 'Yew Kee Specialities', unit: '#B1-04' }
];

async function fetchOpeningHours(storeName) {
  const query = `${storeName} The Woodleigh Mall Singapore`;

  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.regularOpeningHours,places.formattedAddress'
    },
    body: JSON.stringify({
      textQuery: query,
      maxResultCount: 1
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.places?.[0] || null;
}

function formatOpeningHours(place) {
  if (!place?.regularOpeningHours) return null;

  const hours = place.regularOpeningHours;
  return {
    weekdayDescriptions: hours.weekdayDescriptions || [],
    periods: hours.periods || []
  };
}

async function main() {
  console.log('=== FIXING WOODLEIGH MALL DATA ===\n');

  // Step 1: Delete existing incorrect entries
  console.log('Step 1: Deleting incorrect hawker entries from the-woodleigh-mall...');
  const { error: deleteError, count } = await supabase
    .from('mall_outlets')
    .delete()
    .eq('mall_id', 'the-woodleigh-mall');

  if (deleteError) {
    console.log(`Delete error: ${deleteError.message}`);
    return;
  }
  console.log(`Deleted existing entries.\n`);

  // Step 2: Add correct outlets
  console.log('Step 2: Adding 37 correct F&B outlets with opening hours...\n');

  let added = 0;
  let failed = 0;

  for (const outlet of correctOutlets) {
    console.log(`Processing: ${outlet.name}`);

    try {
      // Fetch opening hours from Google
      const place = await fetchOpeningHours(outlet.name);
      const openingHours = place ? formatOpeningHours(place) : null;
      const googlePlaceId = place?.id || null;

      if (openingHours) {
        console.log(`  -> Found hours: ${openingHours.weekdayDescriptions[0]?.substring(0, 40)}...`);
      } else {
        console.log('  -> No hours found');
      }

      // Insert into database
      const { error } = await supabase
        .from('mall_outlets')
        .insert({
          mall_id: 'the-woodleigh-mall',
          name: outlet.name,
          opening_hours: openingHours,
          google_place_id: googlePlaceId
        });

      if (error) {
        console.log(`  -> DB Error: ${error.message}`);
        failed++;
      } else {
        console.log('  -> Added to database');
        added++;
      }

      await delay(200);

    } catch (err) {
      console.log(`  -> Error: ${err.message}`);
      failed++;
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Added: ${added}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total outlets: ${correctOutlets.length}`);
}

main().catch(console.error);
