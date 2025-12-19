/**
 * Fix Missing Malls
 * Insert 2 malls that failed due to missing station IDs
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
const slugify = (str) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function convertPriceLevel(level) {
  switch (level) {
    case 'PRICE_LEVEL_FREE': return '$';
    case 'PRICE_LEVEL_INEXPENSIVE': return '$';
    case 'PRICE_LEVEL_MODERATE': return '$$';
    case 'PRICE_LEVEL_EXPENSIVE': return '$$$';
    case 'PRICE_LEVEL_VERY_EXPENSIVE': return '$$$$';
    default: return null;
  }
}

async function findOutletsInMall(mall) {
  const outlets = [];
  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': googleApiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.types,places.priceLevel'
    },
    body: JSON.stringify({ textQuery: `food restaurant cafe ${mall.name} Singapore`, maxResultCount: 20 })
  });

  const data = await response.json();
  if (data.places) {
    const foodTypes = ['restaurant', 'cafe', 'bakery', 'food', 'meal_takeaway', 'meal_delivery'];
    for (const place of data.places) {
      const isFood = place.types?.some(t => foodTypes.includes(t));
      if (!isFood) continue;
      const addressLower = (place.formattedAddress || '').toLowerCase();
      const mallNameLower = mall.name.toLowerCase();
      const inMall = addressLower.includes(mallNameLower) || addressLower.includes(mallNameLower.replace(/\s+/g, ''));
      if (!inMall) continue;
      outlets.push({
        id: slugify(place.displayName.text) + '-' + mall.id,
        name: place.displayName.text,
        mall_id: mall.id,
        category: place.types?.filter(t => foodTypes.includes(t)).join(', ') || null,
        price_range: convertPriceLevel(place.priceLevel),
      });
    }
  }
  return outlets;
}

async function fixMissingMalls() {
  const mallsToFix = [
    { id: 'valley-point', name: 'Valley Point', station_id: 'clarke-quay', address: '491 River Valley Road, Singapore 248371' },
    { id: 'west-coast-plaza', name: 'West Coast Plaza', station_id: 'clementi', address: '154 West Coast Road, Singapore 127371' }
  ];

  for (const mall of mallsToFix) {
    console.log('Inserting mall:', mall.name);
    const { error: mallErr } = await supabase.from('malls').upsert(mall, { onConflict: 'id' });
    if (mallErr) {
      console.error('  Error inserting mall:', mallErr.message);
      continue;
    }
    console.log('  Mall inserted successfully');

    // Find and insert outlets
    const outlets = await findOutletsInMall(mall);
    console.log('  Found', outlets.length, 'outlets');

    if (outlets.length > 0) {
      const { error: outletErr } = await supabase.from('mall_outlets').upsert(outlets, { onConflict: 'id' });
      if (outletErr) console.error('  Error inserting outlets:', outletErr.message);
      else console.log('  Outlets inserted successfully');
    }
  }

  // Final counts
  const { count: mallCount } = await supabase.from('malls').select('*', { count: 'exact', head: true });
  const { count: outletCount } = await supabase.from('mall_outlets').select('*', { count: 'exact', head: true });

  console.log('\n========================================');
  console.log('FINAL DATABASE COUNTS');
  console.log('========================================');
  console.log('Total malls:', mallCount);
  console.log('Total outlets:', outletCount);
}

fixMissingMalls().catch(console.error);
