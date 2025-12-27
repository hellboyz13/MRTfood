const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'sb_secret_J_vsb7RYUQ_0Dm2YTR_Fuw_O-ovCRlN'
);

async function main() {
  const { data } = await supabase
    .from('mall_outlets')
    .select('id, name, level, thumbnail_url')
    .eq('mall_id', 'kap-mall')
    .order('name');

  // Find duplicates based on similar names
  const nameMap = {};
  data.forEach(o => {
    // Normalize name for comparison
    const key = o.name.toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace('kap', '')
      .replace('mall', '');
    if (!nameMap[key]) nameMap[key] = [];
    nameMap[key].push(o);
  });

  console.log('Checking for duplicates...\n');

  const toDelete = [];

  for (const [key, items] of Object.entries(nameMap)) {
    if (items.length > 1) {
      console.log(`Duplicate group: ${key}`);
      items.forEach(i => {
        console.log(`  - ${i.name} (${i.level || 'no level'}) - ID: ${i.id.substring(0, 8)}`);
        console.log(`    Has thumbnail: ${i.thumbnail_url ? 'Yes' : 'No'}`);
      });

      // Keep the one with thumbnail, or the first one
      const withThumbnail = items.filter(i => i.thumbnail_url);
      const toKeep = withThumbnail.length > 0 ? withThumbnail[0] : items[0];

      items.forEach(i => {
        if (i.id !== toKeep.id) {
          toDelete.push(i);
        }
      });

      console.log(`  -> Keeping: ${toKeep.name}\n`);
    }
  }

  if (toDelete.length > 0) {
    console.log(`\nDeleting ${toDelete.length} duplicates...`);
    for (const item of toDelete) {
      const { error } = await supabase
        .from('mall_outlets')
        .delete()
        .eq('id', item.id);

      if (error) {
        console.log(`  Error deleting ${item.name}: ${error.message}`);
      } else {
        console.log(`  Deleted: ${item.name}`);
      }
    }
  } else {
    console.log('No duplicates found to delete.');
  }
}

main().catch(console.error);
