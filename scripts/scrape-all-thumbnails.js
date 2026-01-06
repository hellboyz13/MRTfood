/**
 * Scrape thumbnails for all mall_outlets using Playwright (NO Google API)
 * Uses Google Images search to find restaurant/store images
 *
 * Usage:
 *   node scripts/scrape-all-thumbnails.js              # Process all without thumbnails
 *   node scripts/scrape-all-thumbnails.js 50           # Process 50 outlets
 *   node scripts/scrape-all-thumbnails.js 50 100       # Process 50 outlets starting from offset 100
 *   node scripts/scrape-all-thumbnails.js --all        # Re-scrape ALL outlets (even with existing thumbnails)
 */

const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Get outlets to process
async function getOutlets(limit, offset, includeAll) {
  let query = supabase
    .from('mall_outlets')
    .select('id, name, mall_id, thumbnail_url')
    .order('name');

  if (!includeAll) {
    // Only get outlets without thumbnails
    query = query.or('thumbnail_url.is.null,thumbnail_url.eq.');
  }

  if (offset > 0) {
    query = query.range(offset, offset + limit - 1);
  } else {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.log('Error fetching outlets:', error.message);
    return [];
  }

  return data || [];
}

// Get mall name for better search context
async function getMallName(mallId) {
  const { data } = await supabase
    .from('malls')
    .select('name')
    .eq('id', mallId)
    .single();

  return data?.name || mallId.replace(/-/g, ' ');
}

// Search Google Images using Playwright
async function searchGoogleImages(page, query) {
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch`;

  try {
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await delay(1500);

    // Handle consent popup if it appears
    try {
      const consentButton = await page.$('button:has-text("Accept all"), button:has-text("I agree"), button[aria-label*="Accept"]');
      if (consentButton) {
        await consentButton.click();
        await delay(1000);
      }
    } catch (e) {
      // No consent popup
    }

    // Extract image URLs from Google Images
    const imageUrls = await page.evaluate(() => {
      const urls = [];

      // Method 1: Look for data-src or src attributes on thumbnails
      const thumbnails = document.querySelectorAll('img[data-src], img.rg_i, img[class*="rg_i"]');
      thumbnails.forEach(img => {
        const src = img.getAttribute('data-src') || img.getAttribute('src') || '';
        if (src.startsWith('http') && !src.includes('gstatic.com/images') && !src.includes('google.com/images')) {
          urls.push(src);
        }
      });

      // Method 2: Look for encrypted_docid links which contain actual image URLs
      const links = document.querySelectorAll('a[href*="imgurl="]');
      links.forEach(link => {
        const href = link.getAttribute('href');
        const match = href.match(/imgurl=([^&]+)/);
        if (match) {
          try {
            const decoded = decodeURIComponent(match[1]);
            if (decoded.startsWith('http') && !urls.includes(decoded)) {
              urls.push(decoded);
            }
          } catch (e) {}
        }
      });

      // Method 3: Parse inline scripts for image data
      const scripts = document.querySelectorAll('script');
      scripts.forEach(script => {
        const text = script.textContent || '';
        const matches = text.matchAll(/"(https:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi);
        for (const match of matches) {
          const url = match[1].replace(/\\u003d/g, '=').replace(/\\u0026/g, '&');
          if (!url.includes('gstatic.com') && !url.includes('google.com') && !urls.includes(url)) {
            urls.push(url);
          }
        }
      });

      return urls.slice(0, 5); // Get top 5 candidates
    });

    return imageUrls;

  } catch (error) {
    console.log(`  Search error: ${error.message}`);
    return [];
  }
}

// Alternative: Search Bing Images
async function searchBingImages(page, query) {
  const searchUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}`;

  try {
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await delay(1500);

    const imageUrls = await page.evaluate(() => {
      const urls = [];

      // Bing uses data-src-hq or m attribute with JSON
      const images = document.querySelectorAll('a.iusc');
      images.forEach(a => {
        const m = a.getAttribute('m');
        if (m) {
          try {
            const data = JSON.parse(m);
            if (data.murl) {
              urls.push(data.murl);
            }
          } catch (e) {}
        }
      });

      // Fallback: direct img src
      if (urls.length === 0) {
        const imgs = document.querySelectorAll('img.mimg');
        imgs.forEach(img => {
          const src = img.getAttribute('src') || img.getAttribute('data-src');
          if (src && src.startsWith('http')) {
            urls.push(src);
          }
        });
      }

      return urls.slice(0, 5);
    });

    return imageUrls;

  } catch (error) {
    console.log(`  Bing search error: ${error.message}`);
    return [];
  }
}

// Download image and upload to Supabase storage
async function downloadAndUpload(outletId, imageUrl) {
  try {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/*',
        'Referer': 'https://www.google.com/'
      },
      timeout: 15000
    });

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('image')) {
      return null;
    }

    const imageBuffer = await response.arrayBuffer();

    // Check image size (skip if too small - likely placeholder)
    if (imageBuffer.byteLength < 5000) {
      return null;
    }

    // Determine extension
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const fileName = `outlets/${outletId}.${ext}`;

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from('thumbnails')
      .upload(fileName, imageBuffer, {
        contentType: contentType.includes('image') ? contentType : 'image/jpeg',
        upsert: true
      });

    if (uploadError) {
      console.log(`  Upload error: ${uploadError.message}`);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('thumbnails')
      .getPublicUrl(fileName);

    return urlData.publicUrl;

  } catch (error) {
    console.log(`  Download error: ${error.message}`);
    return null;
  }
}

// Process a single outlet
async function processOutlet(page, outlet, mallName) {
  console.log(`\n[${outlet.id}] ${outlet.name} @ ${mallName}`);

  // Build search queries - try specific to general
  const queries = [
    `${outlet.name} ${mallName} Singapore restaurant food`,
    `${outlet.name} Singapore restaurant`,
    `${outlet.name} food restaurant`
  ];

  let imageUrls = [];

  for (const query of queries) {
    console.log(`  Searching: "${query.substring(0, 50)}..."`);

    // Try Google Images first
    imageUrls = await searchGoogleImages(page, query);

    if (imageUrls.length === 0) {
      // Fallback to Bing
      imageUrls = await searchBingImages(page, query);
    }

    if (imageUrls.length > 0) {
      console.log(`  Found ${imageUrls.length} image candidates`);
      break;
    }

    await delay(500);
  }

  if (imageUrls.length === 0) {
    console.log(`  ✗ No images found`);
    return false;
  }

  // Try downloading each image until one succeeds
  for (const imageUrl of imageUrls) {
    console.log(`  Trying: ${imageUrl.substring(0, 60)}...`);

    const thumbnailUrl = await downloadAndUpload(outlet.id, imageUrl);

    if (thumbnailUrl) {
      // Update database
      const { error } = await supabase
        .from('mall_outlets')
        .update({ thumbnail_url: thumbnailUrl })
        .eq('id', outlet.id);

      if (error) {
        console.log(`  ✗ DB update failed: ${error.message}`);
        return false;
      }

      console.log(`  ✓ Saved: ${thumbnailUrl.substring(0, 60)}...`);
      return true;
    }
  }

  console.log(`  ✗ All image downloads failed`);
  return false;
}

async function main() {
  const args = process.argv.slice(2);
  const includeAll = args.includes('--all');
  const numArgs = args.filter(a => !a.startsWith('--')).map(Number);

  const limit = numArgs[0] || 100;
  const offset = numArgs[1] || 0;

  console.log('=== SCRAPE ALL OUTLET THUMBNAILS ===\n');
  console.log(`Mode: ${includeAll ? 'ALL outlets' : 'Only missing thumbnails'}`);
  console.log(`Limit: ${limit}, Offset: ${offset}\n`);

  // Get outlets to process
  const outlets = await getOutlets(limit, offset, includeAll);

  if (outlets.length === 0) {
    console.log('No outlets to process!');
    return;
  }

  console.log(`Found ${outlets.length} outlets to process\n`);

  // Cache mall names
  const mallNameCache = new Map();
  for (const outlet of outlets) {
    if (!mallNameCache.has(outlet.mall_id)) {
      mallNameCache.set(outlet.mall_id, await getMallName(outlet.mall_id));
    }
  }

  // Launch browser
  const browser = await chromium.launch({
    headless: true
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'en-SG'
  });

  const page = await context.newPage();

  let success = 0;
  let failed = 0;

  for (let i = 0; i < outlets.length; i++) {
    const outlet = outlets[i];
    const mallName = mallNameCache.get(outlet.mall_id);

    console.log(`\n--- Progress: ${i + 1}/${outlets.length} ---`);

    const result = await processOutlet(page, outlet, mallName);

    if (result) {
      success++;
    } else {
      failed++;
    }

    // Rate limiting - vary delay to appear more human
    const delayMs = 2000 + Math.random() * 1000;
    await delay(delayMs);

    // Take a longer break every 20 outlets
    if ((i + 1) % 20 === 0) {
      console.log('\n[Taking a short break...]');
      await delay(5000);
    }
  }

  await browser.close();

  console.log('\n\n=== SUMMARY ===');
  console.log(`Processed: ${outlets.length}`);
  console.log(`Success: ${success}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success rate: ${((success / outlets.length) * 100).toFixed(1)}%`);
}

main().catch(console.error);
