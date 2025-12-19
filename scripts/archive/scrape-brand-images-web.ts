import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local file
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function scrapeInstagramImages(url: string): Promise<string[]> {
  try {
    console.log(`  🔍 Fetching Instagram page...`);
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const images: string[] = [];

    // Instagram embeds image data in script tags
    $('script').each((i, elem) => {
      const scriptContent = $(elem).html();
      if (scriptContent && scriptContent.includes('display_url')) {
        // Extract image URLs from Instagram's embedded JSON
        const matches = scriptContent.match(/"display_url":"([^"]+)"/g);
        if (matches) {
          matches.forEach(match => {
            const url = match.replace(/"display_url":"/, '').replace(/"$/, '');
            // Unescape the URL
            const unescapedUrl = url.replace(/\\u0026/g, '&');
            if (unescapedUrl.includes('instagram') && !images.includes(unescapedUrl)) {
              images.push(unescapedUrl);
            }
          });
        }
      }
    });

    console.log(`  ✅ Found ${images.length} Instagram images`);
    return images.slice(0, 10); // Return first 10
  } catch (error) {
    console.error(`  ❌ Error scraping Instagram:`, error);
    return [];
  }
}

async function scrapeKFCImages(url: string): Promise<string[]> {
  try {
    console.log(`  🔍 Fetching KFC website...`);
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const images: string[] = [];

    // Find all image tags
    $('img').each((i, elem) => {
      const src = $(elem).attr('src');
      if (src && (src.includes('menu') || src.includes('product') || src.includes('item') || src.includes('food'))) {
        // Make sure it's an absolute URL
        let imageUrl = src;
        if (src.startsWith('//')) {
          imageUrl = 'https:' + src;
        } else if (src.startsWith('/')) {
          imageUrl = 'https://www.kfc.com.sg' + src;
        }

        if (!images.includes(imageUrl)) {
          images.push(imageUrl);
        }
      }
    });

    console.log(`  ✅ Found ${images.length} KFC menu images`);
    return images.slice(0, 10); // Return first 10
  } catch (error) {
    console.error(`  ❌ Error scraping KFC:`, error);
    return [];
  }
}

async function updateBrandImages(brandName: string, imageUrls: string[]) {
  if (imageUrls.length === 0) {
    console.log(`⚠️  No images to update for ${brandName}`);
    return false;
  }

  // Get all outlets for this brand
  const { data: outlets, error: outletsError } = await supabase
    .from('chain_outlets')
    .select('id, brand_id, chain_brands!inner(name)')
    .eq('chain_brands.name', brandName);

  if (outletsError || !outlets || outlets.length === 0) {
    console.error(`❌ Error fetching outlets for ${brandName}:`, outletsError);
    return false;
  }

  console.log(`📍 Found ${outlets.length} outlets for ${brandName}`);

  // Delete existing images for this brand
  const outletIds = outlets.map(o => o.id);
  const { error: deleteError } = await supabase
    .from('menu_images')
    .delete()
    .in('outlet_id', outletIds);

  if (deleteError) {
    console.error(`❌ Error deleting old images:`, deleteError);
  } else {
    console.log(`🗑️  Deleted old images`);
  }

  // Create new image records
  const menuImages = outletIds.flatMap(outletId =>
    imageUrls.map((imageUrl, index) => ({
      listing_id: null,
      outlet_id: outletId,
      image_url: imageUrl,
      photo_reference: null,
      width: null,
      height: null,
      is_header: index === 0,
      display_order: index,
    }))
  );

  const { data, error } = await supabase
    .from('menu_images')
    .insert(menuImages)
    .select();

  if (error) {
    console.error(`❌ Database error:`, error.message);
    return false;
  }

  console.log(`✅ Inserted ${imageUrls.length} images for ${outlets.length} outlets`);
  return true;
}

async function scrapeBrandMenuImages() {
  console.log('🎨 Scraping brand-specific menu images...\n');

  // Ya Kun Kaya Toast
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Processing: Ya Kun Kaya Toast`);
  console.log(`${'='.repeat(60)}`);

  const yakunImages = await scrapeInstagramImages('https://www.instagram.com/yakunkayatoastsg/?hl=en');
  if (yakunImages.length > 0) {
    await updateBrandImages('Ya Kun Kaya Toast', yakunImages);
  }

  await new Promise(resolve => setTimeout(resolve, 2000));

  // KFC
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Processing: KFC`);
  console.log(`${'='.repeat(60)}`);

  const kfcImages = await scrapeKFCImages('https://www.kfc.com.sg/?srsltid=AfmBOooMiBBOmru4Sz3Y2ZzxA0OdnLQnoQxSjBpg09IGM3RcKZkgVy-E');
  if (kfcImages.length > 0) {
    await updateBrandImages('KFC', kfcImages);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Brand menu image scraping complete!');
  console.log('='.repeat(60));
}

scrapeBrandMenuImages();
