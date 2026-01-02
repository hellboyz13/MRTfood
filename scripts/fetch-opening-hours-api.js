/**
 * Fetch opening hours using Google Places API (New)
 * Usage: node scripts/fetch-opening-hours-api.js [limit] [offset]
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch place details using Places API (New)
async function fetchPlaceDetails(placeId) {
  const url = `https://places.googleapis.com/v1/places/${placeId}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': 'regularOpeningHours,currentOpeningHours'
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Place Details failed: ${response.status} - ${error}`);
  }

  return response.json();
}

// Search for a place by name and get its place_id
async function findPlace(name, mallName) {
  const query = mallName ? `${name} ${mallName} Singapore` : `${name} Singapore`;
  const url = 'https://places.googleapis.com/v1/places:searchText';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.regularOpeningHours'
    },
    body: JSON.stringify({
      textQuery: query,
      maxResultCount: 1
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Find Place failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.places?.[0] || null;
}

// Convert API response to our format
function formatOpeningHours(apiResponse) {
  const hours = apiResponse.regularOpeningHours || apiResponse.currentOpeningHours;
  if (!hours) return null;

  return {
    weekdayDescriptions: hours.weekdayDescriptions || [],
    periods: hours.periods || []
  };
}

async function main() {
  const args = process.argv.slice(2);
  const limit = parseInt(args[0]) || 50;
  const offset = parseInt(args[1]) || 0;

  console.log(`\n=== GOOGLE PLACES API FETCH (limit: ${limit}, offset: ${offset}) ===\n`);

  // Fetch outlets missing opening hours
  const { data: allOutlets, error } = await supabase
    .from('mall_outlets')
    .select('id, name, google_place_id, opening_hours, malls(name)')
    .is('opening_hours', null)
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching outlets:', error);
    return;
  }

  console.log(`Found ${allOutlets.length} outlets to process\n`);

  const results = { updated: 0, failed: 0, notFound: 0, apiCalls: 0 };

  for (const outlet of allOutlets) {
    const mallName = outlet.malls?.name;

    try {
      let openingHours = null;
      let placeId = outlet.google_place_id;

      // If no place_id, search for it first
      if (!placeId) {
        console.log(`[FIND] ${outlet.name} @ ${mallName || 'unknown'}`);
        const place = await findPlace(outlet.name, mallName);
        results.apiCalls++;

        if (place) {
          placeId = place.id;
          openingHours = formatOpeningHours(place);

          // Update google_place_id in database
          await supabase
            .from('mall_outlets')
            .update({ google_place_id: placeId })
            .eq('id', outlet.id);
        }

        await delay(100);
      }

      // If we have place_id but no hours yet, fetch details
      if (placeId && !openingHours) {
        const details = await fetchPlaceDetails(placeId);
        results.apiCalls++;
        openingHours = formatOpeningHours(details);
        await delay(100);
      }

      if (openingHours && openingHours.weekdayDescriptions?.length > 0) {
        const { error: updateError } = await supabase
          .from('mall_outlets')
          .update({ opening_hours: openingHours })
          .eq('id', outlet.id);

        if (updateError) {
          console.log(`✗ ${outlet.name} - DB error`);
          results.failed++;
        } else {
          console.log(`✓ ${outlet.name}`);
          results.updated++;
        }
      } else {
        console.log(`⊘ ${outlet.name} - no hours available`);
        results.notFound++;
      }

    } catch (err) {
      console.log(`✗ ${outlet.name} - ${err.message}`);
      results.failed++;
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Updated: ${results.updated}`);
  console.log(`No hours: ${results.notFound}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`API calls: ${results.apiCalls}`);
  console.log(`Est. cost: ~$${(results.apiCalls * 0.017).toFixed(2)}`);
}

main().catch(console.error);
