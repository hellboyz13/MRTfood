/**
 * Cleanup Malls
 * 1. Delete malls with no outlets
 * 2. Add closing_time and tags columns if needed
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanup() {
  console.log('========================================');
  console.log('Cleanup Malls');
  console.log('========================================\n');

  // Get all malls
  const { data: malls, error: mallError } = await supabase.from('malls').select('id, name');
  if (mallError) {
    console.error('Error fetching malls:', mallError);
    return;
  }

  // Get outlet counts per mall
  const { data: outlets, error: outletError } = await supabase.from('mall_outlets').select('mall_id');
  if (outletError) {
    console.error('Error fetching outlets:', outletError);
    return;
  }

  const outletCounts = {};
  outlets.forEach(o => {
    outletCounts[o.mall_id] = (outletCounts[o.mall_id] || 0) + 1;
  });

  // Find malls with no outlets
  const mallsToDelete = malls.filter(m => {
    return outletCounts[m.id] === undefined || outletCounts[m.id] === 0;
  });

  console.log('Malls with no outlets:');
  mallsToDelete.forEach(m => console.log('  -', m.name));

  if (mallsToDelete.length > 0) {
    const idsToDelete = mallsToDelete.map(m => m.id);

    const { error: deleteError } = await supabase
      .from('malls')
      .delete()
      .in('id', idsToDelete);

    if (deleteError) {
      console.error('\nError deleting malls:', deleteError);
    } else {
      console.log('\nDeleted', mallsToDelete.length, 'malls');
    }
  } else {
    console.log('\nNo malls to delete');
  }

  // Get final counts
  const { count: mallCount } = await supabase.from('malls').select('*', { count: 'exact', head: true });
  const { count: outletCount } = await supabase.from('mall_outlets').select('*', { count: 'exact', head: true });

  console.log('\n========================================');
  console.log('FINAL COUNTS');
  console.log('========================================');
  console.log('Malls:', mallCount);
  console.log('Outlets:', outletCount);
  console.log('========================================\n');
}

cleanup().catch(console.error);
