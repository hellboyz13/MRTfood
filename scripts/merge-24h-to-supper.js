const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4'
);

async function merge24hToSupper() {
  console.log('=== MERGING 24 HOUR TO SUPPER ===\n');

  // Step 1: Create "supper" source if it doesn't exist
  console.log('1. Creating/updating Supper source...');
  const { error: sourceError } = await supabase
    .from('sources')
    .upsert({
      id: 'supper',
      name: 'Supper',
      icon: '🌙',
      bg_color: '#7C3AED', // Purple background
      category: 'curated'
    }, { onConflict: 'id' });

  if (sourceError) {
    console.error('Error creating source:', sourceError.message);
  } else {
    console.log('   Created/updated Supper source with 🌙 icon\n');
  }

  // Step 2: Get all listings with is_24h=true OR have "24 hour" in tags OR have "Supper" in tags
  console.log('2. Finding all 24h and Supper listings...');

  // Get is_24h listings
  const { data: is24hListings } = await supabase
    .from('food_listings')
    .select('id, name, tags, is_24h')
    .eq('is_24h', true);

  // Get listings with "24 hour" tag
  const { data: tagged24hListings } = await supabase
    .from('food_listings')
    .select('id, name, tags, is_24h')
    .contains('tags', ['24 hour']);

  // Get listings with "Supper" tag
  const { data: supperListings } = await supabase
    .from('food_listings')
    .select('id, name, tags, is_24h')
    .contains('tags', ['Supper']);

  // Combine and dedupe
  const allListings = new Map();
  [...(is24hListings || []), ...(tagged24hListings || []), ...(supperListings || [])].forEach(l => {
    allListings.set(l.id, l);
  });

  const listings = Array.from(allListings.values());
  console.log(`   Found ${listings.length} listings to process\n`);

  // Step 3: Update each listing
  console.log('3. Updating listings...');
  let updated = 0;

  for (const listing of listings) {
    // Build new tags array: add "Supper", remove "24 hour"
    let newTags = listing.tags || [];

    // Remove "24 hour" tag (case insensitive)
    newTags = newTags.filter(t => t.toLowerCase() !== '24 hour');

    // Add "Supper" if not already present
    if (!newTags.some(t => t.toLowerCase() === 'supper')) {
      newTags = ['Supper', ...newTags];
    }

    // Update the listing
    const { error: updateError } = await supabase
      .from('food_listings')
      .update({
        tags: newTags,
        is_24h: false // Clear the old is_24h flag
      })
      .eq('id', listing.id);

    if (updateError) {
      console.error(`   ERROR updating ${listing.name}:`, updateError.message);
    } else {
      console.log(`   Updated: ${listing.name}`);
      updated++;
    }

    // Add to listing_sources for the badge
    const { error: sourceError } = await supabase
      .from('listing_sources')
      .upsert({
        listing_id: listing.id,
        source_id: 'supper',
        is_primary: true
      }, { onConflict: 'listing_id,source_id' });

    if (sourceError && !sourceError.message.includes('duplicate')) {
      console.error(`   ERROR adding badge for ${listing.name}:`, sourceError.message);
    }
  }

  // Step 4: Remove old "24-hour" source entries from listing_sources
  console.log('\n4. Removing old 24-hour source entries...');
  const { error: deleteError } = await supabase
    .from('listing_sources')
    .delete()
    .eq('source_id', '24-hour');

  if (deleteError) {
    console.error('   Error removing old source entries:', deleteError.message);
  } else {
    console.log('   Removed old 24-hour source entries');
  }

  console.log(`\n=== DONE! Updated ${updated} listings ===`);
}

merge24hToSupper();
