import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4'
);

async function main() {
  console.log('Renaming Overkill and Food King to GET FED...\n');

  // Get current sources
  const { data: sources, error: sourcesError } = await supabase
    .from('food_sources')
    .select('*');

  if (sourcesError) {
    console.error('Error fetching sources:', sourcesError);
    return;
  }

  console.log('Current sources:', sources?.map(s => s.id));

  // Check if food-king and overkill-food exist
  const foodKing = sources?.find(s => s.id === 'food-king');
  const overkill = sources?.find(s => s.id === 'overkill-food');
  const getfed = sources?.find(s => s.id === 'get-fed');

  console.log('\nfood-king exists:', !!foodKing);
  console.log('overkill-food exists:', !!overkill);
  console.log('get-fed exists:', !!getfed);

  // If get-fed doesn't exist, create it
  if (!getfed) {
    console.log('\n1. Creating GET FED source...');
    const { error: createError } = await supabase
      .from('food_sources')
      .insert({
        id: 'get-fed',
        name: 'GET FED',
        icon: '🍉',
        url: 'https://www.youtube.com/@getfed',
        bg_color: '#FED7AA',
        weight: 40
      });

    if (createError) {
      console.error('Error creating get-fed source:', createError);
      return;
    } else {
      console.log('   ✓ Created GET FED source');
    }
  }

  // Update food_listing_sources to point to get-fed instead of food-king
  if (foodKing) {
    console.log('\n2. Updating food-king references to get-fed...');
    const { error: updateError } = await supabase
      .from('food_listing_sources')
      .update({ source_id: 'get-fed' })
      .eq('source_id', 'food-king');

    if (updateError) {
      console.error('Error updating food-king references:', updateError);
    } else {
      console.log('   ✓ Updated food-king references in food_listing_sources');
    }

    // Also update food_listings table source_id column
    const { error: listingsUpdateError } = await supabase
      .from('food_listings')
      .update({ source_id: 'get-fed' })
      .eq('source_id', 'food-king');

    if (listingsUpdateError) {
      console.error('Error updating food_listings:', listingsUpdateError);
    } else {
      console.log('   ✓ Updated food-king references in food_listings');
    }

    // Delete old food-king source
    console.log('\n3. Deleting old food-king source...');
    const { error: deleteError } = await supabase
      .from('food_sources')
      .delete()
      .eq('id', 'food-king');

    if (deleteError) {
      console.error('Error deleting food-king source:', deleteError);
    } else {
      console.log('   ✓ Deleted food-king source');
    }
  }

  // Update overkill-food references to get-fed
  if (overkill) {
    console.log('\n4. Updating overkill-food references to get-fed...');
    const { error: updateError } = await supabase
      .from('food_listing_sources')
      .update({ source_id: 'get-fed' })
      .eq('source_id', 'overkill-food');

    if (updateError) {
      console.error('Error updating overkill-food references:', updateError);
    } else {
      console.log('   ✓ Updated overkill-food references in food_listing_sources');
    }

    // Also update food_listings table source_id column
    const { error: listingsUpdateError } = await supabase
      .from('food_listings')
      .update({ source_id: 'get-fed' })
      .eq('source_id', 'overkill-food');

    if (listingsUpdateError) {
      console.error('Error updating food_listings:', listingsUpdateError);
    } else {
      console.log('   ✓ Updated overkill-food references in food_listings');
    }

    // Delete old overkill-food source
    console.log('\n5. Deleting old overkill-food source...');
    const { error: deleteError } = await supabase
      .from('food_sources')
      .delete()
      .eq('id', 'overkill-food');

    if (deleteError) {
      console.error('Error deleting overkill-food source:', deleteError);
    } else {
      console.log('   ✓ Deleted overkill-food source');
    }
  }

  // Final check
  console.log('\n========================================');
  console.log('Final sources:');
  const { data: finalSources } = await supabase.from('food_sources').select('id, name');
  console.log(finalSources?.map(s => `  - ${s.id}: ${s.name}`).join('\n'));
}

main().catch(console.error);
