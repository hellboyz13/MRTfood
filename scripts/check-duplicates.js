/**
 * Check for duplicate food listings at the same station
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function main() {
  const { data } = await supabase
    .from('food_listings')
    .select('id, name, station_id')
    .eq('is_active', true)
    .not('station_id', 'is', null)
    .order('station_id')
    .order('name');

  // Group by station + normalized name
  const groups = {};
  data.forEach(l => {
    const normName = l.name.toLowerCase()
      .replace(/'/g, "'")
      .replace(/[^a-z0-9 ]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const key = l.station_id + '|' + normName;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(l);
  });

  // Find duplicates
  const duplicates = Object.entries(groups).filter(([k, v]) => v.length > 1);

  console.log('=== DUPLICATE CHECK ===');
  console.log('Total listings checked:', data.length);
  console.log('Duplicate groups found:', duplicates.length);

  if (duplicates.length > 0) {
    console.log('\nDuplicates to remove:');

    const toDeactivate = [];

    duplicates.forEach(([key, items]) => {
      const [station] = key.split('|');
      console.log('\n  ' + station + ':');

      // Keep the first one, mark others for deactivation
      items.forEach((item, idx) => {
        if (idx === 0) {
          console.log('    ✓ KEEP: ' + item.name);
        } else {
          console.log('    ✗ REMOVE: ' + item.name + ' (id: ' + item.id.slice(0, 8) + ')');
          toDeactivate.push(item.id);
        }
      });
    });

    console.log('\n\nTotal to deactivate:', toDeactivate.length);

    // Deactivate duplicates
    if (toDeactivate.length > 0) {
      console.log('\nDeactivating duplicates...');

      for (const id of toDeactivate) {
        const { error } = await supabase
          .from('food_listings')
          .update({ is_active: false })
          .eq('id', id);

        if (error) {
          console.log('  Error deactivating ' + id + ': ' + error.message);
        }
      }

      console.log('Done! Deactivated', toDeactivate.length, 'duplicates.');
    }
  } else {
    console.log('\nNo duplicates found!');
  }
}

main().catch(console.error);
