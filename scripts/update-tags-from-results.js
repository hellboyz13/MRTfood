const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const results = require('../tag-verification-results.json');

async function updateTags() {
  console.log('=== UPDATING FOOD LISTING TAGS ===\n');

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  // Update mismatched listings (add missing tags)
  console.log('Updating mismatched listings...');
  for (const item of results.mismatched) {
    // Get current listing
    const { data: listing, error: fetchError } = await supabase
      .from('food_listings')
      .select('tags')
      .eq('id', item.id)
      .single();

    if (fetchError) {
      console.log('  [ERROR] ' + item.name + ': ' + fetchError.message);
      errors++;
      continue;
    }

    // Filter out false positives (Fast Food, Vietnamese detected incorrectly)
    const nameLower = item.name.toLowerCase();
    const validTags = item.missingTags.filter(tag => {
      // Skip Fast Food - usually false positive
      if (tag === 'Fast Food') return false;
      // Only add Vietnamese if name suggests it
      if (tag === 'Vietnamese') {
        return nameLower.includes('vietnam') ||
               nameLower.includes('pho') ||
               nameLower.includes('banh');
      }
      // Only add Korean if name suggests it (filter out false positive)
      if (tag === 'Korean') {
        return nameLower.includes('korea') ||
               nameLower.includes('kimchi') ||
               nameLower.includes('bulgogi');
      }
      return true;
    });

    if (validTags.length === 0) {
      console.log('  [SKIP] ' + item.name + ' (filtered out false positives)');
      skipped++;
      continue;
    }

    // Merge tags
    const currentTags = listing.tags || [];
    const newTags = [...new Set([...currentTags, ...validTags])];

    const { error: updateError } = await supabase
      .from('food_listings')
      .update({ tags: newTags })
      .eq('id', item.id);

    if (updateError) {
      console.log('  [ERROR] ' + item.name + ': ' + updateError.message);
      errors++;
    } else {
      console.log('  [UPDATED] ' + item.name + ': +' + validTags.join(', '));
      updated++;
    }
  }

  // Update no-tags listings with suggested tags
  console.log('\nUpdating listings with no tags...');
  for (const item of results.noTags) {
    if (!item.suggestedTags || item.suggestedTags.length === 0) {
      // Add default tags based on name
      let defaultTags = [];
      const nameLower = item.name.toLowerCase();

      if (nameLower.includes('hokkien')) {
        defaultTags = ['Hawker', 'Hokkien Mee', 'Chinese'];
      } else if (nameLower.includes('laksa')) {
        defaultTags = ['Hawker', 'Laksa'];
      } else if (nameLower.includes('noodle') || nameLower.includes('mee')) {
        defaultTags = ['Hawker', 'Noodles'];
      }

      if (defaultTags.length > 0) {
        const { error } = await supabase
          .from('food_listings')
          .update({ tags: defaultTags })
          .eq('id', item.id);

        if (error) {
          console.log('  [ERROR] ' + item.name + ': ' + error.message);
          errors++;
        } else {
          console.log('  [UPDATED] ' + item.name + ': +' + defaultTags.join(', '));
          updated++;
        }
      } else {
        console.log('  [SKIP] ' + item.name + ' (no suggested tags, no name match)');
        skipped++;
      }
    } else {
      const { error } = await supabase
        .from('food_listings')
        .update({ tags: item.suggestedTags })
        .eq('id', item.id);

      if (error) {
        console.log('  [ERROR] ' + item.name + ': ' + error.message);
        errors++;
      } else {
        console.log('  [UPDATED] ' + item.name + ': +' + item.suggestedTags.join(', '));
        updated++;
      }
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log('Updated: ' + updated);
  console.log('Skipped: ' + skipped);
  console.log('Errors: ' + errors);
}

updateTags();
