import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function findKovan() {
  const { data, error } = await supabase
    .from('stations')
    .select('id, name')
    .ilike('name', '%kovan%');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Search results for "kovan":', data);
}

findKovan();
