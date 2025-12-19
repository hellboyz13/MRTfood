import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function test() {
  // Get Yat Ka Yan
  const { data: listing } = await supabase
    .from('food_listings')
    .select('id, name, distance_to_station, walking_time')
    .ilike('name', '%Yat Ka Yan%')
    .single();

  console.log('Before update:', listing);

  // Try to update
  const { data, error } = await supabase
    .from('food_listings')
    .update({
      distance_to_station: 376,
      walking_time: 300, // 5 min in seconds
    })
    .eq('id', listing?.id)
    .select();

  if (error) {
    console.log('Update error:', error);
  } else {
    console.log('Update result:', data);
  }

  // Fetch again
  const { data: after } = await supabase
    .from('food_listings')
    .select('id, name, distance_to_station, walking_time')
    .ilike('name', '%Yat Ka Yan%')
    .single();

  console.log('After update:', after);
}

test();
