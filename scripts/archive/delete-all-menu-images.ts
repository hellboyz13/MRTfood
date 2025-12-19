import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local file
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteAllMenuImages() {
  console.log('🗑️  Deleting all menu images from database...\n');

  const { error } = await supabase
    .from('menu_images')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

  if (error) {
    console.error('❌ Error deleting images:', error);
    return;
  }

  console.log('✅ All menu images deleted successfully!\n');
}

deleteAllMenuImages();
