const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4'
);

async function setup() {
  // 1. Create Dessert source
  console.log('1. Creating Dessert source...');
  const { error: sourceError } = await supabase
    .from('food_sources')
    .upsert({
      id: 'dessert',
      name: 'Dessert',
      icon: '🍰',
      bg_color: '#FECACA', // Light pink
      weight: 55
    }, { onConflict: 'id' });

  if (sourceError) {
    console.log('  Error:', sourceError.message);
  } else {
    console.log('  Created Dessert source with 🍰 icon');
  }

  // 2. Find listings that should have Dessert tag
  console.log('\n2. Finding dessert-related listings...');

  // Names that are definitely dessert places
  const dessertNames = [
    'Tiong Bahru Bakery', 'Plain Vanilla', 'Elijah Pies', 'Alice Boulangerie',
    'Micro Bakery & Kitchen', 'La Levain', 'Two Bakers', 'Hvala',
    'Ice Cream', 'Cake', 'Bakery', 'Dessert', 'Pastry'
  ];

  // Get all listings
  const { data: allListings } = await supabase
    .from('food_listings')
    .select('id, name, tags')
    .eq('is_active', true);

  const dessertListings = allListings.filter(l => {
    // Check if name matches any dessert keyword
    const nameMatch = dessertNames.some(n => l.name.toLowerCase().includes(n.toLowerCase()));
    if (nameMatch) return true;

    // Check if tags contain dessert keywords
    if (l.tags) {
      const tagMatch = l.tags.some(t => {
        const tLower = t.toLowerCase();
        return tLower.includes('bakery') ||
               tLower.includes('cake') ||
               tLower.includes('dessert') ||
               tLower.includes('ice cream') ||
               tLower.includes('pastry') ||
               tLower.includes('sweet');
      });
      if (tagMatch) return true;
    }
    return false;
  });

  console.log('  Found', dessertListings.length, 'potential dessert listings');

  // 3. Update listings with Dessert tag and add source badge
  console.log('\n3. Updating listings...');
  let updated = 0;

  for (const listing of dessertListings) {
    // Add Dessert tag if not present
    let newTags = listing.tags || [];
    const hasDessert = newTags.some(t => t.toLowerCase() === 'dessert');
    if (!hasDessert) {
      newTags = ['Dessert', ...newTags];
    }

    const { error: updateError } = await supabase
      .from('food_listings')
      .update({ tags: newTags })
      .eq('id', listing.id);

    if (!updateError) {
      // Add dessert source badge
      await supabase
        .from('listing_sources')
        .upsert({
          listing_id: listing.id,
          source_id: 'dessert',
          is_primary: false
        }, { onConflict: 'listing_id,source_id' });

      console.log('  Tagged:', listing.name);
      updated++;
    }
  }

  console.log('\n=== Done! Tagged', updated, 'listings with Dessert ===');
}

setup();
