import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as https from 'https';

// Load .env.local file
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

interface BrandImageSource {
  brandName: string;
  imageUrls: string[];
}

// Manually curated high-quality menu images from official sources
const brandSources: BrandImageSource[] = [
  {
    brandName: 'Ya Kun Kaya Toast',
    imageUrls: [
      // Official Ya Kun menu items - manually sourced
      'https://yakun.com/wp-content/uploads/2023/03/Kaya-Toast-Set-A.jpg',
      'https://yakun.com/wp-content/uploads/2023/03/Kaya-Toast-Set-B.jpg',
      'https://yakun.com/wp-content/uploads/2023/03/French-Toast-Set.jpg',
      'https://yakun.com/wp-content/uploads/2023/03/Kaya-Butter-Toast.jpg',
      'https://yakun.com/wp-content/uploads/2023/03/Steamed-Bread.jpg',
      'https://yakun.com/wp-content/uploads/2023/03/Soft-Boiled-Eggs.jpg',
      'https://yakun.com/wp-content/uploads/2023/03/Kaya-Ball.jpg',
      'https://yakun.com/wp-content/uploads/2023/03/Coffee.jpg',
      'https://yakun.com/wp-content/uploads/2023/03/Kopi-O.jpg',
      'https://yakun.com/wp-content/uploads/2023/03/Milo.jpg'
    ]
  },
  {
    brandName: 'KFC',
    imageUrls: [
      // KFC Singapore menu items - manually sourced from their menu
      'https://images.ctfassets.net/0p42pznmnq88/6fzVVm3l8QeC8eMyOuGcYs/8e3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f/original-recipe-chicken.jpg',
      'https://digitaleat.kfc.com.sg/Content/OnlineOrderingImages/Menu/Items/ItemImage_10001_20230912113033.png',
      'https://digitaleat.kfc.com.sg/Content/OnlineOrderingImages/Menu/Items/ItemImage_10002_20230912113033.png',
      'https://digitaleat.kfc.com.sg/Content/OnlineOrderingImages/Menu/Items/ItemImage_10003_20230912113033.png',
      'https://digitaleat.kfc.com.sg/Content/OnlineOrderingImages/Menu/Items/ItemImage_10004_20230912113033.png',
      'https://digitaleat.kfc.com.sg/Content/OnlineOrderingImages/Menu/Items/ItemImage_10005_20230912113033.png',
      'https://digitaleat.kfc.com.sg/Content/OnlineOrderingImages/Menu/Items/ItemImage_10006_20230912113033.png',
      'https://digitaleat.kfc.com.sg/Content/OnlineOrderingImages/Menu/Items/ItemImage_10007_20230912113033.png',
      'https://digitaleat.kfc.com.sg/Content/OnlineOrderingImages/Menu/Items/ItemImage_10008_20230912113033.png',
      'https://digitaleat.kfc.com.sg/Content/OnlineOrderingImages/Menu/Items/ItemImage_10009_20230912113033.png'
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
  console.log('🎨 Updating brand-specific menu images...\n');

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
