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

async function checkData() {
  console.log('Checking chain outlets data...\n');

  // Check brands
  const { data: brands, error: brandsError } = await supabase
    .from('chain_brands')
    .select('id, name');

  if (brandsError) {
    console.error('Error fetching brands:', brandsError.message);
  } else {
    console.log(`✓ Found ${brands.length} chain brands`);
  }

  // Check outlets
  const { data: outlets, error: outletsError } = await supabase
    .from('chain_outlets')
    .select('id, name, brand_id');

  if (outletsError) {
    console.error('Error fetching outlets:', outletsError.message);
  } else {
    console.log(`✓ Found ${outlets.length} chain outlets\n`);

    // Count by brand
    const countsByBrand: { [key: string]: number } = {};
    outlets.forEach((outlet: any) => {
      countsByBrand[outlet.brand_id] = (countsByBrand[outlet.brand_id] || 0) + 1;
    });

    console.log('Outlets by brand:');
    Object.entries(countsByBrand)
      .sort((a, b) => b[1] - a[1])
      .forEach(([brandId, count]) => {
        const brand = brands?.find((b: any) => b.id === brandId);
        console.log(`  ${brand?.name || brandId}: ${count}`);
      });
  }
}

checkData();
