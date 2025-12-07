import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkImageCounts() {
  // Check chain outlet images grouped by brand
  const { data: outlets } = await supabase
    .from('chain_outlets')
    .select('id, name, brand_id, chain_brands!inner(name)');

  if (!outlets) return;

  // Get image counts
  const brandImageCounts: Record<string, { brandName: string; outlets: number; imagesPerOutlet: number }> = {};

  for (const outlet of outlets) {
    const brandName = (outlet as any).chain_brands.name;
    const brandId = outlet.brand_id;

    if (!brandImageCounts[brandId]) {
      const { count } = await supabase
        .from('menu_images')
        .select('*', { count: 'exact', head: true })
        .eq('outlet_id', outlet.id);

      brandImageCounts[brandId] = {
        brandName,
        outlets: outlets.filter(o => o.brand_id === brandId).length,
        imagesPerOutlet: count || 0
      };
    }
  }

  console.log('\n📊 Image counts by brand:\n');
  Object.entries(brandImageCounts)
    .sort((a, b) => a[1].imagesPerOutlet - b[1].imagesPerOutlet)
    .forEach(([brandId, info]) => {
      console.log(`${info.brandName}: ${info.imagesPerOutlet} images per outlet (${info.outlets} outlets total)`);
    });
}

checkImageCounts();
