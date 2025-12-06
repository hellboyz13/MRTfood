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

  // Get all unique brands
  const { data: brands } = await supabase
    .from('chain_brands')
    .select('id, name, category')
    .eq('is_active', true)
    .order('name');

  if (!brands || brands.length === 0) {
    console.log('No brands found!');
    return;
  }

  console.log(`Found ${brands.length} brands to process\n`);

  let processed = 0;
  let failed = 0;

  for (const brand of brands) {
    console.log(`[${processed + 1}/${brands.length}] Processing: ${brand.name} (${brand.category})`);

    try {
      // Generate tags
      const tags = await generateFoodTags(brand.name, brand.category);

      if (tags.length === 0) {
        console.log(`  ⚠️  No tags generated`);
        failed++;
        continue;
      }

      console.log(`  Generated ${tags.length} tags:`, tags.join(', '));

      // Update brand
      const { error: brandError } = await supabase
        .from('chain_brands')
        .update({ food_tags: tags })
        .eq('id', brand.id);

      if (brandError) {
        console.error(`  ❌ Error updating brand:`, brandError);
        failed++;
        continue;
      }

      // Update all outlets for this brand
      const { error: outletError } = await supabase
        .from('chain_outlets')
        .update({ food_tags: tags })
        .eq('brand_id', brand.id);

      if (outletError) {
        console.error(`  ❌ Error updating outlets:`, outletError);
        failed++;
        continue;
      }

      console.log(`  ✅ Updated brand and outlets\n`);
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
  console.log(`   Processed: ${processed}/${brands.length}`);
  console.log(`   Failed: ${failed}`);
  console.log('='.repeat(60));
}

generateAllTags();
