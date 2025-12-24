const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchPlaceDetails(name, address) {
  const query = `${name} ${address || ''} Singapore`;

  const searchResponse = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.regularOpeningHours'
    },
    body: JSON.stringify({
      textQuery: query,
      maxResultCount: 1
    })
  });

  const data = await searchResponse.json();

  if (!data.places || !data.places[0]) {
    return null;
  }

  return data.places[0];
}

// The 25 listings that need opening hours
const ids = [
  '9d39ddf5-20ec-4b8a-ad77-13296dfc0c5c',
  '0c44cf9e-273c-451a-8d61-ed1ccb39a975',
  '1e1fdc1c-10d3-4cf0-af81-7134f0aecef7',
  '70b84213-07ac-41de-b07c-ad48b8517a8e',
  'f9903574-a671-4e8a-860b-f8ee2416263c',
  'b927d55f-af4c-442f-93e9-399fda2920d4',
  '79b8fb21-c32a-4bdb-9f72-977d81126b9d',
  'd6af0e79-c740-442b-8838-20cfdf051287',
  '1adc83ef-eb5f-4999-8a0a-835ec2f9028b',
  'a79aa406-edca-44c1-9328-f391706120d4',
  'c9d07a53-21b2-4fb7-98e4-d88955d8d6fa',
  '093aebca-2a6d-4076-9ae0-23de4586ee59',
  'ee3e082b-7f8b-463f-8338-ac310b1998c4',
  '67851625-3085-4aa2-8250-0c9b05bd0005',
  'f62bcc3b-5f16-4a0b-bd8e-bfd0953917ad',
  '5280fc8b-139d-4de7-8337-72bd5345e56d',
  '16bd6af8-f393-454c-aadd-fe90e9c4e587',
  '489a6183-1846-48eb-beab-fb5ad6e6bece',
  'a39c1c58-bf34-4186-8ed4-3d0d46a280ab',
  '03d9236a-1ea3-48fe-ba58-ca34c40dfde2',
  '98b41aea-41a7-4e1e-a820-1134bfbf009e',
  'cccf48c3-74cb-4b10-b6b0-791e27f9a973',
  '06f438c1-c832-4090-afb5-1e5dba59cabf',
  '5f992391-11e4-4335-a725-c4677eb1de84',
  'df6b08b8-1753-4636-9019-1756afdd832d'
];

async function main() {
  console.log('=== FETCHING OPENING HOURS FOR 25 LISTINGS ===\n');

  // Get listings missing opening hours
  const { data: listings, error } = await supabase
    .from('food_listings')
    .select('id, name, address, opening_hours')
    .in('id', ids)
    .is('opening_hours', null);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${listings.length} listings missing opening hours\n`);

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    console.log(`[${i + 1}/${listings.length}] ${listing.name}`);

    try {
      const place = await fetchPlaceDetails(listing.name, listing.address);

      if (!place) {
        console.log('  ✗ Not found on Google');
        failed++;
        continue;
      }

      if (!place.regularOpeningHours) {
        console.log('  ⊘ No opening hours available');
        failed++;
        continue;
      }

      const { error: updateError } = await supabase
        .from('food_listings')
        .update({ opening_hours: place.regularOpeningHours })
        .eq('id', listing.id);

      if (updateError) {
        console.log(`  ✗ DB error: ${updateError.message}`);
        failed++;
      } else {
        console.log('  ✓ Updated');
        updated++;
      }

      await delay(200);

    } catch (err) {
      console.log(`  ✗ Error: ${err.message}`);
      failed++;
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Updated: ${updated}`);
  console.log(`Failed: ${failed}`);
}

main().catch(console.error);
