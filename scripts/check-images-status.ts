import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function check() {
  const { count: total } = await supabase
    .from('food_listings')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  const { count: withImages } = await supabase
    .from('food_listings')
    .select('*', { count: 'exact', head: true })
    .not('image_url', 'is', null)
    .eq('is_active', true);

  const { count: withoutImages } = await supabase
    .from('food_listings')
    .select('*', { count: 'exact', head: true })
    .is('image_url', null)
    .eq('is_active', true);

  console.log('📊 Food Listing Images Status:');
  console.log('================================');
  console.log(`Total active listings: ${total}`);
  console.log(`With images: ${withImages}`);
  console.log(`Without images: ${withoutImages}`);
  console.log('');
  console.log('Google API Key exists:', !!process.env.GOOGLE_PLACES_API_KEY || !!process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY);

  // Show sample of listings without images
  const { data: sample } = await supabase
    .from('food_listings')
    .select('name, address')
    .is('image_url', null)
    .eq('is_active', true)
    .limit(10);

  if (sample && sample.length > 0) {
    console.log('\nSample listings without images:');
    sample.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.name}`);
    });
  }
}
check();
