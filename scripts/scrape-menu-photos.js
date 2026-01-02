/**
 * Scrape menu photos from Google Maps using Playwright (FREE - no API)
 * Usage: node scripts/scrape-menu-photos.js [limit]
 */

const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Find food listings without menu images
async function findListingsWithoutImages(limit) {
  // Get listing IDs that already have images
  const { data: existingImages } = await supabase
    .from('menu_images')
    .select('listing_id')
    .not('listing_id', 'is', null);

  const listingIdsWithImages = new Set((existingImages || []).map(i => i.listing_id));

  // Get food listings
  const { data: listings } = await supabase
    .from('food_listings')
    .select('id, name, address, place_id')
    .limit(500);

  const withoutImages = listings.filter(l => !listingIdsWithImages.has(l.id));
  console.log(`Found ${withoutImages.length} listings without images`);

  return withoutImages.slice(0, limit);
}

// Scrape photos from Google Maps
async function scrapePhotos(page, listing) {
  const query = `${listing.name} Singapore restaurant`;
  const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;

  console.log(`\n--- ${listing.name} ---`);
  console.log(`Searching: ${query}`);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await delay(2000);

    // Check if we landed on a place page or search results
    let currentUrl = page.url();

    // If on search results, click first result
    if (currentUrl.includes('/maps/search/')) {
      const firstResult = await page.$('div[role="feed"] a[href*="/maps/place/"]');
      if (firstResult) {
        await firstResult.click();
        await delay(2500);
      }
    }

    // Look for photos section - click on main image or photos tab
    const photosButton = await page.$('button[aria-label*="Photo"]');
    if (photosButton) {
      await photosButton.click();
      await delay(2000);
    } else {
      // Try clicking the main image
      const mainImage = await page.$('button[aria-label*="photos"]');
      if (mainImage) {
        await mainImage.click();
        await delay(2000);
      }
    }

    // Try to find and click "Menu" tab in photos if available
    const menuTab = await page.$('button[aria-label*="Menu"]');
    if (menuTab) {
      console.log('Found Menu tab, clicking...');
      await menuTab.click();
      await delay(1500);
    }

    // Collect photo URLs from the page
    const photoUrls = await page.evaluate(() => {
      const urls = [];

      // Method 1: Look for images in the photos gallery
      const galleryImages = document.querySelectorAll('img[src*="googleusercontent"]');
      galleryImages.forEach(img => {
        let src = img.src;
        // Get higher resolution version
        if (src.includes('=')) {
          src = src.split('=')[0] + '=w800-h600';
        }
        if (!urls.includes(src) && !src.includes('profile') && !src.includes('avatar')) {
          urls.push(src);
        }
      });

      // Method 2: Look for background images
      const bgImages = document.querySelectorAll('[style*="background-image"]');
      bgImages.forEach(el => {
        const style = el.getAttribute('style');
        const match = style.match(/url\("([^"]+)"\)/);
        if (match && match[1].includes('googleusercontent')) {
          let src = match[1];
          if (src.includes('=')) {
            src = src.split('=')[0] + '=w800-h600';
          }
          if (!urls.includes(src)) {
            urls.push(src);
          }
        }
      });

      return urls.slice(0, 8); // Get up to 8 photos
    });

    console.log(`Found ${photoUrls.length} photos`);

    if (photoUrls.length === 0) {
      // Try alternative: get any food-related images from the page
      const altPhotos = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img'));
        return imgs
          .filter(img => img.src.includes('googleusercontent') && img.width > 100)
          .map(img => {
            let src = img.src;
            if (src.includes('=')) src = src.split('=')[0] + '=w800-h600';
            return src;
          })
          .slice(0, 8);
      });

      if (altPhotos.length > 0) {
        console.log(`Found ${altPhotos.length} alternative photos`);
        return altPhotos;
      }
    }

    return photoUrls;

  } catch (error) {
    console.log(`Error: ${error.message}`);
    return [];
  }
}

// Download and upload photos to Supabase
async function uploadPhotos(listing, photoUrls) {
  if (photoUrls.length === 0) return 0;

  const slug = listing.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  let uploaded = 0;

  for (let i = 0; i < Math.min(photoUrls.length, 5); i++) {
    const url = photoUrls[i];
    const fileName = `${i + 1}.jpg`;
    const filePath = `listings/${slug}/menu/${fileName}`;

    try {
      // Download image
      const response = await fetch(url);
      if (!response.ok) continue;

      const buffer = await response.arrayBuffer();

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('restaurant-photos')
        .upload(filePath, Buffer.from(buffer), {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) {
        console.log(`  Upload error: ${uploadError.message}`);
        continue;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('restaurant-photos')
        .getPublicUrl(filePath);

      // Insert into menu_images
      const { error: insertError } = await supabase
        .from('menu_images')
        .insert({
          listing_id: listing.id,
          image_url: urlData.publicUrl,
          display_order: i + 1
        });

      if (!insertError) {
        console.log(`  ✓ Photo ${i + 1} uploaded`);
        uploaded++;
      }

    } catch (err) {
      console.log(`  Photo ${i + 1} failed: ${err.message}`);
    }
  }

  return uploaded;
}

async function main() {
  const limit = parseInt(process.argv[2]) || 2;

  console.log(`\n=== SCRAPE MENU PHOTOS (limit: ${limit}) ===\n`);

  // Find listings without images
  const listings = await findListingsWithoutImages(limit);
  if (listings.length === 0) {
    console.log('No listings to process');
    return;
  }

  // Launch browser
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  let totalUploaded = 0;

  for (const listing of listings) {
    const photoUrls = await scrapePhotos(page, listing);
    const uploaded = await uploadPhotos(listing, photoUrls);
    totalUploaded += uploaded;
    await delay(1000);
  }

  await browser.close();

  console.log(`\n=== SUMMARY ===`);
  console.log(`Listings processed: ${listings.length}`);
  console.log(`Photos uploaded: ${totalUploaded}`);
}

main().catch(console.error);
