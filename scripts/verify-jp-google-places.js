const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function searchPlace(name) {
  const query = `${name} Jurong Point Singapore`;

  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.businessStatus'
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 1 })
  });

  const data = await response.json();
  return data.places?.[0];
}

async function main() {
  console.log('=== VERIFYING JURONG POINT OUTLETS VIA GOOGLE PLACES ===\n');

  // Get all Jurong Point outlets
  const { data: outlets } = await supabase
    .from('mall_outlets')
    .select('id, name')
    .eq('mall_id', 'jurong-point');

  console.log(`Total outlets to verify: ${outlets.length}\n`);

  const verified = [];
  const closed = [];
  const notFound = [];
  const wrongLocation = [];

  for (let i = 0; i < outlets.length; i++) {
    const outlet = outlets[i];
    console.log(`[${i + 1}/${outlets.length}] ${outlet.name}`);

    try {
      const place = await searchPlace(outlet.name);

      if (!place) {
        console.log(`  ✗ Not found on Google`);
        notFound.push(outlet);
        continue;
      }

      const address = place.formattedAddress?.toLowerCase() || '';
      const isJurongPoint = address.includes('jurong point') ||
                           address.includes('jurong west') ||
                           address.includes('63 jurong') ||
                           address.includes('1 jurong west');

      if (place.businessStatus === 'CLOSED_PERMANENTLY') {
        console.log(`  ⚠️ PERMANENTLY CLOSED`);
        closed.push({ ...outlet, address: place.formattedAddress });
      } else if (isJurongPoint) {
        console.log(`  ✓ Verified: ${place.formattedAddress}`);
        verified.push({ ...outlet, address: place.formattedAddress });
      } else {
        console.log(`  ? Wrong location: ${place.formattedAddress}`);
        wrongLocation.push({ ...outlet, foundAddress: place.formattedAddress });
      }

    } catch (err) {
      console.log(`  ✗ Error: ${err.message}`);
      notFound.push({ ...outlet, error: err.message });
    }

    await delay(200); // Rate limiting
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Verified at Jurong Point: ${verified.length}`);
  console.log(`Permanently Closed: ${closed.length}`);
  console.log(`Wrong Location: ${wrongLocation.length}`);
  console.log(`Not Found: ${notFound.length}`);

  if (closed.length > 0) {
    console.log('\n=== PERMANENTLY CLOSED ===');
    closed.forEach(o => console.log(`- ${o.name}`));
  }

  if (wrongLocation.length > 0) {
    console.log('\n=== WRONG LOCATION (not at Jurong Point) ===');
    wrongLocation.forEach(o => console.log(`- ${o.name}: ${o.foundAddress}`));
  }

  if (notFound.length > 0) {
    console.log('\n=== NOT FOUND ===');
    notFound.forEach(o => console.log(`- ${o.name}`));
  }

  // Save results
  const fs = require('fs');
  fs.writeFileSync('jurong-point-verification.json', JSON.stringify({
    verified: verified.length,
    closed,
    wrongLocation,
    notFound: notFound.map(o => o.name)
  }, null, 2));
}

main().catch(console.error);
