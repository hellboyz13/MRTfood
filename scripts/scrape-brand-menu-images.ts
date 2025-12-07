import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local file
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const openaiApiKey = process.env.OPENAI_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);
const openai = new OpenAI({ apiKey: openaiApiKey });

interface BrandImageSource {
  brandName: string;
  url: string;
  instructions: string;
}

const brandSources: BrandImageSource[] = [
  {
    brandName: 'Ya Kun Kaya Toast',
    url: 'https://www.instagram.com/yakunkayatoastsg/?hl=en',
    instructions: 'Extract 10 food menu images from this Instagram page. Avoid mooncakes and collaboration posts. Focus on signature items like kaya toast, soft-boiled eggs, coffee, and other menu items.'
  },
  {
    brandName: 'KFC',
    url: 'https://www.kfc.com.sg/?srsltid=AfmBOooMiBBOmru4Sz3Y2ZzxA0OdnLQnoQxSjBpg09IGM3RcKZkgVy-E',
    instructions: 'Extract 10 food menu images from the KFC Singapore menu page. Focus on fried chicken, burgers, and other menu items.'
  }
];

async function scrapeImagesWithGPT(brandName: string, url: string, instructions: string): Promise<string[]> {
  console.log(`\n🔍 Scraping images for ${brandName} from ${url}...`);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: `I need you to help me find image URLs from this webpage: ${url}

${instructions}

Please provide ONLY a JSON array of 10 direct image URLs (not webpage URLs). The format should be:
["url1", "url2", "url3", ...]

Important:
- Return ONLY valid image URLs (ending in .jpg, .png, .webp, etc. or image CDN URLs)
- No Instagram post URLs or webpage URLs
- No mooncakes or promotional collaboration images
- Focus on actual food menu items
- Return exactly 10 URLs

If you cannot access the webpage, return an empty array: []`
        }
      ],
      max_tokens: 1000
    });

    const content = response.choices[0]?.message?.content?.trim() || '[]';
    console.log(`📝 GPT Response: ${content.substring(0, 200)}...`);

    // Try to parse the JSON response
    try {
      const imageUrls = JSON.parse(content);
      if (Array.isArray(imageUrls)) {
        console.log(`✅ Found ${imageUrls.length} image URLs`);
        return imageUrls.slice(0, 10); // Ensure max 10
      }
    } catch (parseError) {
      console.error(`❌ Failed to parse GPT response as JSON`);
    }

    return [];
  } catch (error) {
    console.error(`❌ Error scraping images:`, error);
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
  console.log('🎨 Scraping brand-specific menu images with GPT-4...\n');

  for (const source of brandSources) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Processing: ${source.brandName}`);
    console.log(`${'='.repeat(60)}`);

    const imageUrls = await scrapeImagesWithGPT(
      source.brandName,
      source.url,
      source.instructions
    );

    if (imageUrls.length > 0) {
      await updateBrandImages(source.brandName, imageUrls);
    }

    // Delay between brands to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Brand menu image scraping complete!');
  console.log('='.repeat(60));
}

scrapeBrandMenuImages();
