const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  const { data } = await supabase
    .from('food_listings')
    .select('tags')
    .eq('is_active', true);

  // Collect all unique tags
  const allTags = {};
  data.forEach(d => {
    if (d.tags && Array.isArray(d.tags)) {
      d.tags.forEach(t => {
        allTags[t] = (allTags[t] || 0) + 1;
      });
    }
  });

  // Sort by count
  const sorted = Object.entries(allTags).sort((a, b) => b[1] - a[1]);

  console.log('Tags in food_listings (sorted by count):');
  sorted.forEach(([tag, count]) => console.log('  ' + tag + ':', count));
  console.log('');
  console.log('Total unique tags:', sorted.length);

  // Count with no tags
  const noTags = data.filter(d => !d.tags || d.tags.length === 0).length;
  console.log('Listings with no tags:', noTags);
}
check();
