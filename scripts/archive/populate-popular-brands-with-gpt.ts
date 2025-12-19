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

// Popular brands that we want high-quality menu images for
const POPULAR_BRANDS = [
  "McDonald's",
  'KFC',
  'Burger King',
  'Subway',
  'Pizza Hut',
  'KOI',
  'Gong Cha',
  'LiHO',
  'Each A Cup',
  'Chicha San Chen',
  'Tiger Sugar',
  'The Alley',
  'Din Tai Fung',
  'Tim Ho Wan',
  'Crystal Jade',
  'Ajisen Ramen',
  'Pepper Lunch',
  'Sushi Express',
  'Genki Sushi',
  'Haidilao',
  'Suki-Ya',
  'Seoul Garden',
  '4Fingers',
  'Toast Box',
  'Ya Kun Kaya Toast',
  'Old Chang Kee',
  'Mr Bean',
  'Putien',
  'Jollibee'
];

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function searchMenuImagesWithGPT(brandName: string): Promise<string[]> {
  console.log(`  🔍 Searching online for ${brandName} menu images...`);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that finds official menu images for restaurant chains in Singapore. Return ONLY valid image URLs in JSON array format."
        },
        {
          role: "user",
          content: `Find 10 official food menu images for "${brandName}" in Singapore.

Look for:
- Official website menu images
- Food delivery platform images (GrabFood, Foodpanda, Deliveroo)
- Official social media menu posts
- High-quality food photography

Return ONLY a JSON array of direct image URLs (must end in .jpg, .png, .webp or be from image CDNs):
["url1", "url2", "url3", ...]

Important:
- ONLY return direct image URLs that can be loaded in an <img> tag
- NO webpage URLs or social media post URLs
- Focus on actual food/menu items, not logos or restaurant interiors
- Prefer official sources over user-generated content
- Return exactly 10 URLs if possible

If you cannot find real image URLs, return an empty array: []`
        }
      ],
      max_tokens: 1000,
      temperature: 0.3
    });

    const content = response.choices[0]?.message?.content?.trim() || '[]';
    console.log(`  📝 GPT Response length: ${content.length} chars`);

    // Try to parse the JSON response
    try {
      // Extract JSON array from response (handle cases where GPT adds extra text)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.log(`  ⚠️  No JSON array found in response`);
        return [];
      }

      const imageUrls = JSON.parse(jsonMatch[0]);
      if (Array.isArray(imageUrls)) {
        // Filter to ensure they're valid image URLs
        const validUrls = imageUrls.filter(url =>
          typeof url === 'string' &&
          url.startsWith('http') &&
          (url.includes('.jpg') || url.includes('.png') || url.includes('.webp') || url.includes('image'))
        );
        console.log(`  ✅ Found ${validUrls.length} valid image URLs`);
        return validUrls.slice(0, 10);
      }
    } catch (parseError) {
      console.error(`  ❌ Failed to parse GPT response as JSON`);
    }

    return [];
  } catch (error) {
    console.error(`  ❌ Error searching images:`, error);
    return [];
  }
}

async function isFoodImage(imageUrl: string): Promise<boolean> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Is this image showing food, dishes, or meals? Answer with only 'yes' or 'no'. Images of restaurant interiors, logos, signs, or people should be 'no'. Only actual food/dishes should be 'yes'."
            },
            {
              type: "image_url",
              image_url: { url: imageUrl }
            }
          ]
        }
      ],
      max_tokens: 10
    });

    const answer = response.choices[0]?.message?.content?.toLowerCase().trim() || 'no';
    return answer.includes('yes');
  } catch (error) {
    console.error(`    ⚠️  AI vetting error:`, error);
    return false;
  }
}

async function updateBrandImages(brandName: string, imageUrls: string[]) {
  if (imageUrls.length === 0) {
    console.log(`  ⚠️  No images to update for ${brandName}`);
    return false;
  }

  // Get all outlets for this brand
  const { data: outlets, error: outletsError } = await supabase
    .from('chain_outlets')
    .select('id, brand_id, chain_brands!inner(name)')
    .eq('chain_brands.name', brandName);

  if (outletsError || !outlets || outlets.length === 0) {
    console.error(`  ❌ Error fetching outlets for ${brandName}:`, outletsError);
    return false;
  }

  console.log(`  📍 Found ${outlets.length} outlets for ${brandName}`);

  // Delete existing images for this brand
  const outletIds = outlets.map(o => o.id);
  const { error: deleteError } = await supabase
    .from('menu_images')
    .delete()
    .in('outlet_id', outletIds);

  if (deleteError) {
    console.error(`  ❌ Error deleting old images:`, deleteError);
  } else {
    console.log(`  🗑️  Deleted old images`);
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
    console.error(`  ❌ Database error:`, error.message);
    return false;
  }

  console.log(`  ✅ Inserted ${imageUrls.length} images for ${outlets.length} outlets`);
  return true;
}

async function processBrand(brandName: string, index: number, total: number) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[${index + 1}/${total}] Processing: ${brandName}`);
  console.log(`${'='.repeat(60)}`);

    // Search for menu images online using GPT
    const imageUrls = await searchMenuImagesWithGPT(brandName);

    if (imageUrls.length === 0) {
      console.log(`  ⚠️  No images found online\n`);
      failCount++;
      await delay(2000);
      continue;
    }

    console.log(`  🤖 AI vetting ${imageUrls.length} images...`);

    // Vet each image with AI
    const foodImages: string[] = [];
    let vetted = 0;

    for (const imageUrl of imageUrls) {
      if (foodImages.length >= 10) break; // Stop at 10 food images

      const isFood = await isFoodImage(imageUrl);
      vetted++;

      if (isFood) {
        foodImages.push(imageUrl);
        console.log(`     ✅ Image ${vetted}/${imageUrls.length}: FOOD (${foodImages.length} collected)`);
      } else {
        console.log(`     ❌ Image ${vetted}/${imageUrls.length}: Not food`);
      }

      // Delay between AI calls (500ms = 2 per second)
      await delay(500);
    }

    if (foodImages.length === 0) {
      console.log(`  ⚠️  No food images found after vetting\n`);
      failCount++;
      await delay(1000);
      continue;
    }

    console.log(`  📸 Storing ${foodImages.length} verified food images`);

    // Store in database
    const success = await updateBrandImages(brandName, foodImages);

    if (success) {
      console.log(`  ✅ Success!`);
      successCount++;
    } else {
      console.log(`  ❌ Failed to store images`);
      failCount++;
    }

    // Delay between brands to respect rate limits
    await delay(2000);
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ❌ Failed: ${failCount}`);
  console.log(`  ⏭️  Skipped: ${skipCount}`);
  console.log('='.repeat(60));
}

populatePopularBrandsWithGPT();
