import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Generate food tags using OpenAI
async function generateFoodTags(brandName: string, category: string): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'user',
        content: `For the Singapore restaurant/chain "${brandName}" (category: ${category}), generate a JSON array of 10-15 relevant food search tags. Include:
- Specific dishes they serve
- Cuisine type (e.g., "chinese", "japanese", "western", "local")
- Food categories (e.g., "noodles", "rice", "soup", "fried chicken", "bubble tea")
- Dietary tags if applicable (e.g., "halal", "vegetarian")
- Common search terms people might use

Return ONLY a JSON array of lowercase strings, no explanation. Example: ["pizza", "italian", "pasta", "cheese", "western", "fast food"]`
      }],
      temperature: 0.3,
      max_tokens: 200,
    });

    const content = response.choices[0].message.content?.trim();
    if (!content) return [];

    const tags = JSON.parse(content);
    return Array.isArray(tags) ? tags : [];
  } catch (error) {
    console.error(`Error generating tags for ${brandName}:`, error);
    return [];
  }
}

async function generateAllTags() {
  console.log('🤖 Generating AI food tags for all chain brands...\n');

  // Get all outlets to find unique brands
  const { data: outlets } = await supabase
    .from('chain_outlets')
    .select('brand_id')
    .eq('is_active', true);

  if (!outlets || outlets.length === 0) {
    console.log('No outlets found!');
    return;
  }

  // Get unique brand IDs
  const uniqueBrandIds = [...new Set(outlets.map(o => o.brand_id))];
  console.log(`Found ${uniqueBrandIds.length} unique brands to process\n`);

  // Map brand IDs to readable names and categories
  const brandInfo: Record<string, { name: string; category: string }> = {
    'mcdonalds': { name: "McDonald's", category: 'fast-food' },
    'kfc': { name: 'KFC', category: 'fast-food' },
    'subway': { name: 'Subway', category: 'fast-food' },
    'jollibee': { name: 'Jollibee', category: 'fast-food' },
    'burger-king': { name: 'Burger King', category: 'fast-food' },
    'din-tai-fung': { name: 'Din Tai Fung', category: 'chinese' },
    'tim-ho-wan': { name: 'Tim Ho Wan', category: 'chinese' },
    'crystal-jade': { name: 'Crystal Jade', category: 'chinese' },
    'putien': { name: 'Putien', category: 'chinese' },
    'haidilao': { name: 'Haidilao', category: 'hotpot' },
    'beauty-in-the-pot': { name: 'Beauty in the Pot', category: 'hotpot' },
    'suki-ya': { name: 'Suki-Ya', category: 'hotpot' },
    'seoul-garden': { name: 'Seoul Garden', category: 'hotpot' },
    'koi': { name: 'KOI', category: 'bubble-tea' },
    'liho': { name: 'LiHO', category: 'bubble-tea' },
    'gong-cha': { name: 'Gong Cha', category: 'bubble-tea' },
    'tiger-sugar': { name: 'Tiger Sugar', category: 'bubble-tea' },
    'chicha-san-chen': { name: 'Chicha San Chen', category: 'bubble-tea' },
    'the-alley': { name: 'The Alley', category: 'bubble-tea' },
    'each-a-cup': { name: 'Each A Cup', category: 'bubble-tea' },
    'ya-kun': { name: 'Ya Kun Kaya Toast', category: 'local' },
    'toast-box': { name: 'Toast Box', category: 'local' },
    'old-chang-kee': { name: 'Old Chang Kee', category: 'local' },
    'mr-bean': { name: 'Mr Bean', category: 'local' },
    '4fingers': { name: '4Fingers', category: 'local' },
    'pepper-lunch': { name: 'Pepper Lunch', category: 'japanese' },
    'genki-sushi': { name: 'Genki Sushi', category: 'japanese' },
    'sushi-express': { name: 'Sushi Express', category: 'japanese' },
    'ajisen-ramen': { name: 'Ajisen Ramen', category: 'japanese' },
  };

  let processed = 0;
  let failed = 0;

  for (const brandId of uniqueBrandIds) {
    const brand = brandInfo[brandId];
    if (!brand) {
      console.log(`[${processed + 1}/${uniqueBrandIds.length}] ⚠️  Unknown brand: ${brandId} - skipping`);
      failed++;
      continue;
    }

    console.log(`[${processed + 1}/${uniqueBrandIds.length}] Processing: ${brand.name} (${brand.category})`);

    try {
      // Generate tags
      const tags = await generateFoodTags(brand.name, brand.category);

      if (tags.length === 0) {
        console.log(`  ⚠️  No tags generated`);
        failed++;
        continue;
      }

      console.log(`  Generated ${tags.length} tags:`, tags.join(', '));

      // Update all outlets for this brand
      const { error: outletError } = await supabase
        .from('chain_outlets')
        .update({ food_tags: tags })
        .eq('brand_id', brandId);

      if (outletError) {
        console.error(`  ❌ Error updating outlets:`, outletError);
        failed++;
        continue;
      }

      console.log(`  ✅ Updated all outlets for this brand\n`);
      processed++;

      // Rate limiting - wait 1 second between requests
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`  ❌ Error:`, error);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Complete!`);
  console.log(`   Processed: ${processed}/${uniqueBrandIds.length}`);
  console.log(`   Failed: ${failed}`);
  console.log('='.repeat(60));
}

generateAllTags();
