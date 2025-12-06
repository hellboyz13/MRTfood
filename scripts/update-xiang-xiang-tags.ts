import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function updateXiangXiangTags() {
  console.log('🏷️  Updating Xiang Xiang Hunan Cuisine food tags...\n');

  const tags = [
    'hunan cuisine',
    'chinese',
    'spicy',
    'stir fry',
    'beef',
    'pork',
    'fish',
    'soup',
    'rice',
    'preserved egg',
    'sour and spicy',
    'chicken',
    'seafood',
    'vegetables',
    'authentic chinese'
  ];

  const { data, error } = await supabase
    .from('chain_outlets')
    .update({ food_tags: tags })
    .eq('brand_id', 'xiang-xiang')
    .select('id, name, brand_id');

  if (error) {
    console.error('❌ Error updating tags:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️  No outlets found with brand_id "xiang-xiang"');
    return;
  }

  console.log(`✅ Successfully updated ${data.length} outlet(s):`);
  data.forEach(outlet => {
    console.log(`   - ${outlet.name} (${outlet.brand_id})`);
  });
  console.log('\n📋 Tags added:', tags.join(', '));
}

updateXiangXiangTags();
