import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local file
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMenuImages() {
  console.log('🔍 Checking menu_images table...\n');

  // Check total count
  const { count: totalCount, error: countError } = await supabase
    .from('menu_images')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('❌ Error counting images:', countError);
    return;
  }

  console.log(`📊 Total images in database: ${totalCount}\n`);

  // Check chain outlet images
  const { data: outletImages, error: outletError } = await supabase
    .from('menu_images')
    .select('outlet_id')
    .not('outlet_id', 'is', null)
    .limit(5);

  if (outletError) {
    console.error('❌ Error fetching outlet images:', outletError);
  } else {
    console.log(`🏢 Chain outlet images: ${outletImages?.length || 0} found (showing first 5)`);
    outletImages?.forEach((img, i) => {
      console.log(`   ${i + 1}. outlet_id: ${img.outlet_id}`);
    });
  }

  console.log();

  // Check food listing images
  const { data: listingImages, error: listingError } = await supabase
    .from('menu_images')
    .select('listing_id')
    .not('listing_id', 'is', null)
    .limit(5);

  if (listingError) {
    console.error('❌ Error fetching listing images:', listingError);
  } else {
    console.log(`🍽️  Food listing images: ${listingImages?.length || 0} found (showing first 5)`);
    listingImages?.forEach((img, i) => {
      console.log(`   ${i + 1}. listing_id: ${img.listing_id}`);
    });
  }

  // Get sample image with full details
  console.log('\n📸 Sample image:');
  const { data: sample, error: sampleError } = await supabase
    .from('menu_images')
    .select('*')
    .limit(1)
    .single();

  if (sampleError) {
    console.error('❌ Error fetching sample:', sampleError);
  } else if (sample) {
    console.log(JSON.stringify(sample, null, 2));
  }
}

checkMenuImages();
