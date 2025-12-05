import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkzfrgrxfnqounyeqvvn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function updateSourceIcons() {
  console.log('Updating food-king and overkill-food icons to watermelon...\n');

  // Update food-king icon
  const { error: foodKingError } = await supabase
    .from('food_sources')
    .update({ icon: '🍉' })
    .eq('id', 'food-king');

  if (foodKingError) {
    console.error('Error updating food-king:', foodKingError);
  } else {
    console.log('✓ Updated food-king icon to 🍉');
  }

  // Update overkill-food icon
  const { error: overkillError } = await supabase
    .from('food_sources')
    .update({ icon: '🍉' })
    .eq('id', 'overkill-food');

  if (overkillError) {
    console.error('Error updating overkill-food:', overkillError);
  } else {
    console.log('✓ Updated overkill-food icon to 🍉');
  }

  // Verify the updates
  const { data: sources, error: fetchError } = await supabase
    .from('food_sources')
    .select('id, name, icon')
    .in('id', ['food-king', 'overkill-food']);

  if (fetchError) {
    console.error('Error fetching sources:', fetchError);
  } else {
    console.log('\nVerification:');
    sources?.forEach(s => {
      console.log(`  ${s.id}: ${s.icon} ${s.name}`);
    });
  }

  console.log('\nDone!');
}

updateSourceIcons().catch(console.error);
