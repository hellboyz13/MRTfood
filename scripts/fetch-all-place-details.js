// Script to fetch Google Places details for all food_listings and store in Supabase
// Run with: node scripts/fetch-all-place-details.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const googlePlacesApiKey = process.env.GOOGLE_PLACES_API_KEY;

if (!supabaseUrl || !supabaseKey || !googlePlacesApiKey) {
  console.error('Missing environment variables!');
  console.error('SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_KEY:', !!supabaseKey);
  console.error('GOOGLE_PLACES_API_KEY:', !!googlePlacesApiKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Delay helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch place details from Google Places API (new v1)
async function fetchPlaceDetails(name, address) {
  const searchQuery = address ? `${name} ${address} Singapore` : `${name} Singapore`;

  try {
    const searchResponse = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googlePlacesApiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.regularOpeningHours,places.rating,places.userRatingCount'
      },
      body: JSON.stringify({
        textQuery: searchQuery,
        maxResultCount: 1
      })
    });

    const searchData = await searchResponse.json();

    if (!searchData.places || searchData.places.length === 0) {
      console.log(`  No place found for: ${name}`);
      return null;
    }

    const place = searchData.places[0];

    // Convert opening hours to legacy format
    const openingHours = place.regularOpeningHours ? {
      open_now: place.regularOpeningHours.openNow,
      periods: place.regularOpeningHours.periods?.map(p => ({
        open: {
          day: p.open.day,
          time: `${p.open.hour.toString().padStart(2, '0')}${p.open.minute.toString().padStart(2, '0')}`
        },
        close: p.close ? {
          day: p.close.day,
          time: `${p.close.hour.toString().padStart(2, '0')}${p.close.minute.toString().padStart(2, '0')}`
        } : undefined
      })),
      weekday_text: place.regularOpeningHours.weekdayDescriptions
    } : null;

    return {
      google_place_id: place.id,
      review_count: place.userRatingCount || null,
      phone: place.nationalPhoneNumber || place.internationalPhoneNumber || null,
      website: place.websiteUri || null,
      opening_hours: openingHours,
      rating: place.rating || null
    };
  } catch (error) {
    console.error(`  Error fetching: ${name}`, error.message);
    return null;
  }
}

async function main() {
  console.log('Fetching all food_listings without place details...\n');

  // Get all listings that don't have google_place_id yet
  const { data: listings, error } = await supabase
    .from('food_listings')
    .select('id, name, address, google_place_id, review_count')
    .eq('is_active', true)
    .is('google_place_id', null)
    .order('name');

  if (error) {
    console.error('Error fetching listings:', error);
    process.exit(1);
  }

  console.log(`Found ${listings.length} listings without place details\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    console.log(`[${i + 1}/${listings.length}] ${listing.name}`);

    const placeDetails = await fetchPlaceDetails(listing.name, listing.address);

    if (placeDetails) {
      // Update the database
      const { error: updateError } = await supabase
        .from('food_listings')
        .update(placeDetails)
        .eq('id', listing.id);

      if (updateError) {
        console.log(`  ERROR updating: ${updateError.message}`);
        failCount++;
      } else {
        console.log(`  ✓ Saved: rating=${placeDetails.rating}, reviews=${placeDetails.review_count}, phone=${placeDetails.phone ? 'yes' : 'no'}`);
        successCount++;
      }
    } else {
      failCount++;
    }

    // Rate limit: 100ms delay between requests
    await delay(100);
  }

  console.log(`\n========================================`);
  console.log(`Done! Success: ${successCount}, Failed: ${failCount}`);
  console.log(`========================================\n`);
}

main();
