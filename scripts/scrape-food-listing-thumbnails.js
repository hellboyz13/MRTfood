const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const listings = [
  { id: '071692d6-6519-49b2-8a6a-fa1f7e073d6b', name: 'Corner Corner', station: 'tanjong-pagar' },
  { id: '399e4a92-86f6-47cd-af6b-c1773744be3e', name: 'Kremi', station: 'somerset' },
  { id: '4a0b390c-45e8-46f1-a994-daa415a4a13b', name: 'Cheval Chi Bao', station: 'bukit-gombak' },
  { id: '157f75bb-56c2-422f-9d83-21419177d2f7', name: 'Gorilla Curry', station: 'bukit-gombak' },
  { id: '563e3a97-9c5c-4f29-9017-50cfa5443b70', name: 'Miraku', station: 'telok-ayer' },
  { id: '591c4fc1-c8d3-43fb-9e67-b017d82ccabc', name: 'An Choi', station: 'choa-chu-kang' },
  { id: '1a5907f6-caee-4c35-8654-8dc7f2e1bcf5', name: 'Heng', station: 'bukit-batok' },
  { id: 'dd857b95-25f7-4a57-8c27-d606784a58bf', name: 'Kay Lee Roast Meat', station: 'maxwell' },
  { id: '9f0fb4c1-36b6-431d-8b25-2e733d6a6a6b', name: 'Tamarind Hill', station: 'labrador-park' },
  { id: 'e3e50ea3-f3a0-4cca-9b49-d035bd3ff4b8', name: 'Tokyo Joe', station: 'kent-ridge' },
  { id: '02a79685-ee13-4434-b776-5642cf94e46b', name: 'Santoshimaa Indian Restaurant', station: 'tuas-crescent' }
];

async function searchBingImages(query) {
  const searchUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&first=1`;

  const response = await fetch(searchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });

  const html = await response.text();

  // Extract image URLs from the page
  const murlMatch = html.match(/murl&quot;:&quot;(https?:\/\/[^&]+\.(?:jpg|jpeg|png|webp))/i);
  if (murlMatch) {
    return decodeURIComponent(murlMatch[1].replace(/&amp;/g, '&'));
  }

  return null;
}

async function downloadAndUpload(listingId, imageUrl) {
  try {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      return null;
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';

    const fileName = `${listingId}.${ext}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('restaurant-photos')
      .upload(fileName, imageBuffer, {
        contentType: contentType,
        upsert: true
      });

    if (uploadError) {
      console.error(`  Upload error:`, uploadError.message);
      return null;
    }

    const { data: urlData } = supabase.storage.from('restaurant-photos').getPublicUrl(fileName);
    return urlData.publicUrl;
  } catch (e) {
    console.error(`  Download error:`, e.message);
    return null;
  }
}

async function main() {
  console.log('=== SCRAPING FOOD LISTING THUMBNAILS ===\n');

  for (const listing of listings) {
    console.log(`Processing: ${listing.name} @ ${listing.station}`);

    // Try different search queries
    const queries = [
      `${listing.name} Singapore restaurant food`,
      `${listing.name} Singapore`,
      `${listing.name} restaurant`
    ];

    let imageUrl = null;

    for (const query of queries) {
      console.log(`  Trying: "${query}"`);
      imageUrl = await searchBingImages(query);
      if (imageUrl) {
        console.log(`  Found: ${imageUrl.substring(0, 60)}...`);
        break;
      }
    }

    if (!imageUrl) {
      console.log(`  ✗ No image found\n`);
      continue;
    }

    // Download and upload
    const uploadedUrl = await downloadAndUpload(listing.id, imageUrl);

    if (!uploadedUrl) {
      console.log(`  ✗ Failed to download/upload\n`);
      continue;
    }

    // Update database
    const { error } = await supabase
      .from('food_listings')
      .update({ image_url: uploadedUrl })
      .eq('id', listing.id);

    if (error) {
      console.log(`  ✗ DB update failed: ${error.message}\n`);
    } else {
      console.log(`  ✓ Updated: ${uploadedUrl}\n`);
    }
  }

  console.log('=== DONE ===');
}

main().catch(console.error);
