const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Normalize name for matching (e.g., "McDonald's" matches "MCDONALD'S")
function normalizeName(name) {
  return name.toLowerCase()
    .replace(/[''`']/g, '')      // Remove apostrophes
    .replace(/[®™©–—]/g, '')     // Remove trademark symbols and dashes
    .replace(/[^a-z0-9\s]/g, '') // Remove other special chars
    .replace(/\s+/g, ' ')        // Normalize spaces
    .trim();
}

async function propagateChainData() {
  console.log('=== PROPAGATING CHAIN DATA ===\n');

  // Get all outlets
  const { data: allOutlets, error } = await supabase
    .from('mall_outlets')
    .select('id, name, mall_id, thumbnail_url, opening_hours');

  if (error) {
    console.error('Error fetching outlets:', error.message);
    return;
  }

  console.log(`Total outlets: ${allOutlets.length}`);

  // Build lookup maps for outlets WITH data (grouped by normalized name)
  const thumbnailsByName = new Map();
  const hoursByName = new Map();

  for (const outlet of allOutlets) {
    const normalized = normalizeName(outlet.name);

    if (outlet.thumbnail_url && !thumbnailsByName.has(normalized)) {
      thumbnailsByName.set(normalized, outlet.thumbnail_url);
    }
    if (outlet.opening_hours && !hoursByName.has(normalized)) {
      hoursByName.set(normalized, outlet.opening_hours);
    }
  }

  console.log(`Unique names with thumbnails: ${thumbnailsByName.size}`);
  console.log(`Unique names with hours: ${hoursByName.size}`);

  // Find outlets missing data and try to fill from matching names
  let thumbnailUpdates = 0;
  let hoursUpdates = 0;

  for (const outlet of allOutlets) {
    const normalized = normalizeName(outlet.name);
    const updates = {};

    // Check if missing thumbnail but another outlet with same name has one
    if (!outlet.thumbnail_url && thumbnailsByName.has(normalized)) {
      updates.thumbnail_url = thumbnailsByName.get(normalized);
    }

    // Check if missing hours but another outlet with same name has one
    if (!outlet.opening_hours && hoursByName.has(normalized)) {
      updates.opening_hours = hoursByName.get(normalized);
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('mall_outlets')
        .update(updates)
        .eq('id', outlet.id);

      if (!updateError) {
        if (updates.thumbnail_url) {
          thumbnailUpdates++;
          console.log(`  ✓ Thumbnail: ${outlet.name} (${outlet.mall_id})`);
        }
        if (updates.opening_hours) {
          hoursUpdates++;
          console.log(`  ✓ Hours: ${outlet.name} (${outlet.mall_id})`);
        }
      } else {
        console.log(`  ✗ ${outlet.name}: ${updateError.message}`);
      }
    }
  }

  console.log(`\n=== COMPLETE ===`);
  console.log(`Thumbnails propagated: ${thumbnailUpdates}`);
  console.log(`Hours propagated: ${hoursUpdates}`);

  // Show summary for the 3 new malls
  const malls = ['hougang-mall', 'harbourfront-centre', 'great-world'];
  console.log('\n=== UPDATED COVERAGE ===');

  for (const mallId of malls) {
    const { data } = await supabase
      .from('mall_outlets')
      .select('thumbnail_url, opening_hours')
      .eq('mall_id', mallId);

    const total = data.length;
    const withThumb = data.filter(d => d.thumbnail_url).length;
    const withHours = data.filter(d => d.opening_hours).length;

    console.log(`${mallId}: ${withThumb}/${total} thumbnails, ${withHours}/${total} hours`);
  }
}

propagateChainData();
