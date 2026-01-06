const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Missing restaurants to add
const missingRestaurants = [
  {
    name: 'Mott 32 Singapore',
    location: 'The Shoppes, #B1-42-44',
    cuisine_type: 'Chinese',
    description: 'Fine Dining Bar'
  },
  {
    name: 'THE CLUB',
    location: 'Hotel Tower 1, Lobby',
    cuisine_type: 'Local',
    description: 'Casual Dining Bar'
  },
  {
    name: 'Haidilao Hot Pot',
    location: 'The Shoppes, #B2-01A',
    cuisine_type: 'Chinese',
    description: 'Casual Dining'
  },
  {
    name: 'Rasapura Masters',
    location: 'The Shoppes, #B2-50',
    cuisine_type: 'Local',
    description: 'Food Court'
  },
  {
    name: 'Toast Box',
    location: 'The Shoppes, #B1-01E',
    cuisine_type: 'Local',
    description: 'Café Casual Dining'
  }
];

async function fetchOpeningHours(storeName) {
  const query = `${storeName} Marina Bay Sands Singapore`;

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
  console.log('=== ADDING MISSING MBS RESTAURANTS ===\n');

  for (const restaurant of missingRestaurants) {
    console.log(`Processing: ${restaurant.name}`);

    try {
      // Fetch opening hours from Google
      const place = await fetchOpeningHours(restaurant.name);
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
          mall_id: 'shoppes-at-marina-bay-sands',
          name: restaurant.name,
          opening_hours: openingHours,
          google_place_id: googlePlaceId
        });

      if (error) {
        console.log(`  -> DB Error: ${error.message}`);
      } else {
        console.log('  -> Added to database');
      }

      await delay(200);

    } catch (err) {
      console.log(`  -> Error: ${err.message}`);
    }
  }

  console.log('\n=== DONE ===');
}

main().catch(console.error);
