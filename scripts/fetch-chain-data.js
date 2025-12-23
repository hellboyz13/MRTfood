const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

const CHAINS = [
  'Ah Chew Desserts',
  'Birds of Paradise',
  'Chagee',
  'Ippudo',
  'Tim Ho Wan',
  'Paris Baguette',
  'Shake Shack',
  'Yakiniku Like',
  'Playmade',
  'JUMBO Seafood',
  'Crystal Jade La Mian Xiao Long Bao',
  'Poulet',
  'Bacha Coffee',
  'Song Fa Bak Kut Teh',
  'Springleaf Prata Place'
];

async function fetchChainData(name) {
  const query = `${name} Singapore restaurant`;

  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': 'places.displayName,places.photos,places.id,places.currentOpeningHours,places.priceLevel'
      },
      body: JSON.stringify({
        textQuery: query,
        maxResultCount: 1
      })
    });

    const data = await res.json();

    if (!data.places || data.places.length === 0) {
      console.log(`  No results for ${name}`);
      return null;
    }

    const place = data.places[0];

    // Extract opening hours
    let openingHours = null;
    if (place.currentOpeningHours && place.currentOpeningHours.weekdayDescriptions) {
      openingHours = place.currentOpeningHours.weekdayDescriptions.join('\n');
    }

    // Extract price level (PRICE_LEVEL_INEXPENSIVE, PRICE_LEVEL_MODERATE, etc.)
    let priceRange = null;
    if (place.priceLevel) {
      const priceLevelMap = {
        'PRICE_LEVEL_FREE': '$0',
        'PRICE_LEVEL_INEXPENSIVE': '$5-15',
        'PRICE_LEVEL_MODERATE': '$15-30',
        'PRICE_LEVEL_EXPENSIVE': '$30-50',
        'PRICE_LEVEL_VERY_EXPENSIVE': '$50+'
      };
      priceRange = priceLevelMap[place.priceLevel] || null;
    }

    // Download and upload thumbnail
    let thumbnailUrl = null;
    if (place.photos && place.photos.length > 0) {
      const photoName = place.photos[0].name;
      const photoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=400&key=${GOOGLE_API_KEY}`;

      const imageRes = await fetch(photoUrl);
      if (imageRes.ok) {
        const imageBuffer = await imageRes.arrayBuffer();
        const contentType = imageRes.headers.get('content-type') || 'image/jpeg';
        const ext = contentType.includes('png') ? 'png' : 'jpg';

        const fileName = `chains/${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('thumbnails')
          .upload(fileName, imageBuffer, {
            contentType: contentType,
            upsert: true
          });

        if (uploadError) {
          console.log(`  Upload error: ${uploadError.message}`);
        } else {
          const { data: urlData } = supabase.storage
            .from('thumbnails')
            .getPublicUrl(fileName);
          thumbnailUrl = urlData.publicUrl;
        }
      }
    }

    return {
      name,
      thumbnailUrl,
      openingHours,
      priceRange,
      placeId: place.id
    };

  } catch (e) {
    console.log(`  API Error: ${e.message}`);
    return null;
  }
}

async function updateChainOutlets(chainName, data) {
  const updates = {};
  if (data.thumbnailUrl) updates.thumbnail_url = data.thumbnailUrl;
  if (data.openingHours) updates.opening_hours = data.openingHours;
  if (data.priceRange) updates.price_range = data.priceRange;

  if (Object.keys(updates).length === 0) {
    console.log(`  No data to update for ${chainName}`);
    return 0;
  }

  const { data: result, error } = await supabase
    .from('mall_outlets')
    .update(updates)
    .eq('name', chainName)
    .select('id');

  if (error) {
    console.log(`  DB Error: ${error.message}`);
    return 0;
  }

  return result ? result.length : 0;
}

async function main() {
  console.log('=== FETCHING CHAIN DATA FROM GOOGLE PLACES API ===\n');

  const results = [];

  for (const chain of CHAINS) {
    console.log(`Processing: ${chain}`);

    const data = await fetchChainData(chain);

    if (data) {
      console.log(`  Thumbnail: ${data.thumbnailUrl ? '✓' : '✗'}`);
      console.log(`  Opening Hours: ${data.openingHours ? '✓' : '✗'}`);
      console.log(`  Price Range: ${data.priceRange || 'N/A'}`);

      const updated = await updateChainOutlets(chain, data);
      console.log(`  Updated ${updated} outlets`);

      results.push({ ...data, outletsUpdated: updated });
    } else {
      console.log(`  Failed to fetch data`);
      results.push({ name: chain, failed: true });
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 200));
  }

  console.log('\n=== SUMMARY ===\n');

  let totalUpdated = 0;
  results.forEach(r => {
    if (r.failed) {
      console.log(`✗ ${r.name}: FAILED`);
    } else {
      console.log(`✓ ${r.name}: ${r.outletsUpdated} outlets updated`);
      totalUpdated += r.outletsUpdated;
    }
  });

  console.log(`\nTotal outlets updated: ${totalUpdated}`);
}

main().catch(console.error);
