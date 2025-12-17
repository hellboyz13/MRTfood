/**
 * Filter Malls Script
 * Removes malls that don't match the criteria
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function filterMalls() {
  // Get all malls
  const { data: malls, error: mallError } = await supabase
    .from('malls')
    .select('id, name');

  if (mallError) {
    console.error('Error fetching malls:', mallError);
    return;
  }

  console.log('Total malls:', malls.length);

  // Get outlet counts per mall
  const { data: outlets, error: outletError } = await supabase
    .from('mall_outlets')
    .select('mall_id');

  if (outletError) {
    console.error('Error fetching outlets:', outletError);
    return;
  }

  // Count outlets per mall
  const outletCounts = {};
  outlets.forEach(o => {
    outletCounts[o.mall_id] = (outletCounts[o.mall_id] || 0) + 1;
  });

  // Keywords to KEEP (must contain one of these)
  const keepKeywords = ['mall', 'plaza', 'square', 'city', 'centre', 'point', 'junction', 'hub'];

  // Keywords to REMOVE (if contains any of these, remove)
  const removeKeywords = ['blk', 'hdb', 'neighbourhood', 'market', 'hawker'];

  const toDelete = [];
  const toKeep = [];

  for (const mall of malls) {
    const nameLower = mall.name.toLowerCase();
    const outletCount = outletCounts[mall.id] || 0;

    // Check if should be removed
    const hasRemoveKeyword = removeKeywords.some(kw => nameLower.includes(kw));
    const hasKeepKeyword = keepKeywords.some(kw => nameLower.includes(kw));
    const hasZeroOutlets = outletCount === 0;

    // Decide: delete if has remove keyword, zero outlets, or no keep keyword
    if (hasRemoveKeyword || hasZeroOutlets || !hasKeepKeyword) {
      toDelete.push({
        id: mall.id,
        name: mall.name,
        outlets: outletCount,
        reason: hasRemoveKeyword ? 'remove keyword' :
                hasZeroOutlets ? 'zero outlets' : 'no keep keyword'
      });
    } else {
      toKeep.push({ id: mall.id, name: mall.name, outlets: outletCount });
    }
  }

  console.log('\nMalls to KEEP:', toKeep.length);
  toKeep.sort((a, b) => b.outlets - a.outlets);
  toKeep.forEach(m => console.log('  ✓', m.name, '(' + m.outlets + ' outlets)'));

  console.log('\nMalls to DELETE:', toDelete.length);
  toDelete.forEach(m => console.log('  ✗', m.name, '-', m.reason));

  // Delete malls (outlets will cascade delete)
  if (toDelete.length > 0) {
    const idsToDelete = toDelete.map(m => m.id);

    // First delete outlets for these malls
    const { error: deleteOutletsError } = await supabase
      .from('mall_outlets')
      .delete()
      .in('mall_id', idsToDelete);

    if (deleteOutletsError) {
      console.error('Error deleting outlets:', deleteOutletsError);
      return;
    }

    // Then delete malls
    const { error: deleteMallsError } = await supabase
      .from('malls')
      .delete()
      .in('id', idsToDelete);

    if (deleteMallsError) {
      console.error('Error deleting malls:', deleteMallsError);
      return;
    }

    console.log('\n✓ Deleted', toDelete.length, 'malls and their outlets');
  }

  console.log('\nFinal count:', toKeep.length, 'malls remaining');
}

filterMalls();
