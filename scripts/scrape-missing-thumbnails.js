const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const failedOutlets = [
  { id: 'tuk-tuk-thai-kitchen-ngee-ann-city', name: 'Tuk Tuk Thai Kitchen', mall: 'Ngee Ann City' },
  { id: 'balai-kainan-lucky-plaza', name: 'Balai Kainan', mall: 'Lucky Plaza' },
  { id: 'whole-and-hearty-icon-village', name: 'Whole and hearty', mall: 'Icon Village' },
  { id: 'ban-mian-fish-soup-oasis-terrace-oasis-terraces', name: 'Ban mian & Fish Soup', mall: 'Oasis Terraces' },
  { id: 'hacienda-cafe-and-bar-lucky-plaza', name: 'Hacienda Cafe and Bar', mall: 'Lucky Plaza' }
];

async function searchBingImages(query) {
  // Use Bing image search
  const searchUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&first=1`;

  const response = await fetch(searchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });

  const html = await response.text();

  // Extract image URLs from the page - look for murl parameter in image links
  const murlMatch = html.match(/murl&quot;:&quot;(https?:\/\/[^&]+\.(?:jpg|jpeg|png|webp))/i);
  if (murlMatch) {
    return decodeURIComponent(murlMatch[1].replace(/&amp;/g, '&'));
  }

  // Try another pattern - look for src2 or data-src attributes
  const imgMatch = html.match(/src2?="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i);
  if (imgMatch) {
    return decodeURIComponent(imgMatch[1]);
  }

  return null;
}

async function searchDuckDuckGo(query) {
  // DuckDuckGo image search
  const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`;

  const response = await fetch(searchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });

  const html = await response.text();

  // DDG uses vqd token for image API
  const vqdMatch = html.match(/vqd=([^&"']+)/);
  if (!vqdMatch) return null;

  const vqd = vqdMatch[1];
  const imageApiUrl = `https://duckduckgo.com/i.js?l=sg&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,,,&p=1`;

  try {
    const imgResponse = await fetch(imageApiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://duckduckgo.com/'
      }
    });

    const imgData = await imgResponse.json();
    if (imgData.results && imgData.results.length > 0) {
      return imgData.results[0].image;
    }
  } catch (e) {
    // API call failed
  }

  return null;
}

async function downloadAndUpload(outletId, imageUrl) {
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

    // Determine content type
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';

    const fileName = `${outletId}.${ext}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('thumbnails')
      .upload(fileName, imageBuffer, {
        contentType: contentType,
        upsert: true
      });

    if (uploadError) {
      console.error(`  Upload error:`, uploadError.message);
      return null;
    }

    const { data: urlData } = supabase.storage.from('thumbnails').getPublicUrl(fileName);
    return urlData.publicUrl;
  } catch (e) {
    console.error(`  Download error:`, e.message);
    return null;
  }
}

async function main() {
  console.log('=== SCRAPING MISSING THUMBNAILS ===\n');

  for (const outlet of failedOutlets) {
    console.log(`Processing: ${outlet.name} @ ${outlet.mall}`);

    // Try different search queries
    const queries = [
      `${outlet.name} ${outlet.mall} Singapore restaurant`,
      `${outlet.name} Singapore food`,
      `${outlet.name} restaurant`
    ];

    let imageUrl = null;

    for (const query of queries) {
      console.log(`  Trying: "${query}"`);

      // Try Bing first
      imageUrl = await searchBingImages(query);
      if (imageUrl) {
        console.log(`  Found via Bing: ${imageUrl.substring(0, 60)}...`);
        break;
      }

      // Try DuckDuckGo
      imageUrl = await searchDuckDuckGo(query);
      if (imageUrl) {
        console.log(`  Found via DDG: ${imageUrl.substring(0, 60)}...`);
        break;
      }
    }

    if (!imageUrl) {
      console.log(`  ✗ No image found for ${outlet.name}\n`);
      continue;
    }

    // Download and upload
    const thumbnailUrl = await downloadAndUpload(outlet.id, imageUrl);

    if (!thumbnailUrl) {
      console.log(`  ✗ Failed to download/upload image\n`);
      continue;
    }

    // Update database
    const { error } = await supabase
      .from('mall_outlets')
      .update({ thumbnail_url: thumbnailUrl })
      .eq('id', outlet.id);

    if (error) {
      console.log(`  ✗ DB update failed: ${error.message}\n`);
    } else {
      console.log(`  ✓ Updated: ${thumbnailUrl}\n`);
    }
  }

  console.log('=== DONE ===');
}

main().catch(console.error);
