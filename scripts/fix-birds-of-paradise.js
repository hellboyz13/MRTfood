const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bkzfrgrxfnqounyeqvvn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1Nzk5MzAsImV4cCI6MjA4MDE1NTkzMH0.wOYifcpHN4rxtg_gcDYPzzpAeXoOykBfP_jWLMMfdP4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
  // First, let's see what we have
  const { data: birds } = await supabase
    .from('food_listings')
    .select('id, name, address, station_id')
    .ilike('name', '%Birds of Paradise%')
    .eq('is_active', true);

  console.log('Current Birds of Paradise listings:');
  birds.forEach(b => console.log(`  - ${b.name} @ ${b.station_id}: ${b.address}`));

  // The Tanjong Pagar one should stay at tanjong-pagar
  // The Katong one should be at paya-lebar

  // Restore tanjong-pagar one
  const tpBird = birds.find(b => b.address && b.address.includes('Craig'));
  if (tpBird) {
    await supabase
      .from('food_listings')
      .update({ station_id: 'tanjong-pagar' })
      .eq('id', tpBird.id);
    console.log(`\nRestored ${tpBird.name} to tanjong-pagar`);
  }

  // Move Katong one to paya-lebar
  const katongBird = birds.find(b => b.name.includes('Katong') || (b.address && b.address.includes('East Coast')));
  if (katongBird) {
    await supabase
      .from('food_listings')
      .update({ station_id: 'paya-lebar' })
      .eq('id', katongBird.id);
    console.log(`Moved ${katongBird.name} to paya-lebar`);
  }
}

fix().catch(console.error);
