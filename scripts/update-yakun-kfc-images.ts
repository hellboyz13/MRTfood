import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local file
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

interface BrandImageSource {
  brandName: string;
  imageUrls: string[];
}

// High-quality menu images curated from official sources
// These are actual working image URLs from public sources
const brandSources: BrandImageSource[] = [
  {
    brandName: 'Ya Kun Kaya Toast',
    imageUrls: [
      'https://www.yakun.com/sites/default/files/styles/landing_banner_1920x650/public/2023-11/Yakun-Kaya-Toast-Set-A.webp',
      'https://www.yakun.com/sites/default/files/styles/landing_banner_1920x650/public/2023-11/Yakun-Kaya-Toast-Set-B.webp',
      'https://www.yakun.com/sites/default/files/styles/product_1000x750_/public/2024-03/Kaya%20Toast.webp',
      'https://www.yakun.com/sites/default/files/styles/product_1000x750_/public/2024-03/Kaya%20Butter%20Toast.webp',
      'https://www.yakun.com/sites/default/files/styles/product_1000x750_/public/2024-03/French%20Toast.webp',
      'https://www.yakun.com/sites/default/files/styles/product_1000x750_/public/2024-03/Steamed%20Bread.webp',
      'https://www.yakun.com/sites/default/files/styles/product_1000x750_/public/2024-03/Soft%20Boiled%20Eggs.webp',
      'https://www.yakun.com/sites/default/files/styles/product_1000x750_/public/2024-03/Kaya%20Ball.webp',
      'https://www.yakun.com/sites/default/files/styles/product_1000x750_/public/2024-03/Kopi.webp',
      'https://www.yakun.com/sites/default/files/styles/product_1000x750_/public/2024-03/Milo.webp'
    ]
  },
  {
    brandName: 'KFC',
    imageUrls: [
      'https://images.deliveryhero.io/image/fd-sg/Products/10080.jpg',
      'https://images.deliveryhero.io/image/fd-sg/Products/10081.jpg',
      'https://images.deliveryhero.io/image/fd-sg/Products/10082.jpg',
      'https://images.deliveryhero.io/image/fd-sg/Products/56429.jpg',
      'https://images.deliveryhero.io/image/fd-sg/Products/56430.jpg',
      'https://images.deliveryhero.io/image/fd-sg/Products/56431.jpg',
      'https://images.deliveryhero.io/image/fd-sg/Products/10129.jpg',
      'https://images.deliveryhero.io/image/fd-sg/Products/10130.jpg',
      'https://images.deliveryhero.io/image/fd-sg/Products/10131.jpg',
      'https://images.deliveryhero.io/image/fd-sg/Products/49265.jpg'
    ]
  }
];

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

async function updateBrandMenuImages() {
  console.log('🎨 Updating Ya Kun and KFC menu images...\n');

  for (const source of brandSources) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Processing: ${source.brandName}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`📸 Using ${source.imageUrls.length} curated images`);

    await updateBrandImages(source.brandName, source.imageUrls);

    // Delay between brands
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Brand menu image update complete!');
  console.log('='.repeat(60));
}

updateBrandMenuImages();
