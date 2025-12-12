const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixMissingSources() {
  // Get all listings
  const { data: listings } = await supabase
    .from('food_listings')
    .select('id, name, source_id, station_id')
    .order('name');

  // Find listings without sources
  const noSource = listings.filter(l => !l.source_id);

  // Find listings with sources (to use as reference)
  const withSource = listings.filter(l => l.source_id);

  console.log('Listings without source: ' + noSource.length);
  console.log('Listings with source: ' + withSource.length);
  console.log('\n=== AUTO-FIXING FROM DUPLICATES ===\n');

  let fixed = 0;
  let stillMissing = [];

  for (const listing of noSource) {
    // Extract base name (remove location in parentheses)
    const baseName = listing.name.replace(/\s*\([^)]+\)\s*$/, '').trim().toLowerCase();

    // Find a matching restaurant with a source
    const match = withSource.find(w => {
      const wBaseName = w.name.replace(/\s*\([^)]+\)\s*$/, '').trim().toLowerCase();
      return wBaseName === baseName ||
             w.name.toLowerCase().includes(baseName) ||
             baseName.includes(w.name.toLowerCase());
    });

    if (match) {
      // Update the source
      const { error } = await supabase
        .from('food_listings')
        .update({ source_id: match.source_id })
        .eq('id', listing.id);

      if (!error) {
        console.log('Fixed: ' + listing.name + ' -> ' + match.source_id + ' (from ' + match.name + ')');
        fixed++;
      } else {
        console.log('Error fixing ' + listing.name + ': ' + error.message);
        stillMissing.push(listing);
      }
    } else {
      stillMissing.push(listing);
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log('Auto-fixed: ' + fixed);
  console.log('Still missing: ' + stillMissing.length);

  if (stillMissing.length > 0) {
    console.log('\n=== STILL MISSING SOURCES ===\n');
    stillMissing.forEach(l => {
      console.log(l.name + ' | ' + l.station_id);
    });
  }
}

fixMissingSources().catch(console.error);
