const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function count() {
  const { count: foodCount } = await supabase.from('food_listings').select('*', { count: 'exact', head: true }).eq('is_active', true);
  const { count: mallCount } = await supabase.from('mall_outlets').select('*', { count: 'exact', head: true });

  console.log('Active food listings:', foodCount);
  console.log('Mall outlets:', mallCount);
  console.log('Total:', (foodCount || 0) + (mallCount || 0));

  const secondsPerItem = 4;
  const totalSeconds = ((foodCount || 0) + (mallCount || 0)) * secondsPerItem;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  console.log('');
  console.log('Estimated time at ~4 sec/item:');
  console.log('  Food listings:', Math.round((foodCount || 0) * secondsPerItem / 60), 'minutes');
  console.log('  Mall outlets:', Math.round((mallCount || 0) * secondsPerItem / 60), 'minutes');
  console.log('  Total:', hours, 'hours', minutes, 'minutes');
}
count();
