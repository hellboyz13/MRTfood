const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Duplicates and bad entries to delete
const toDeleteNames = [
  'Astons Steak And Salad',      // duplicate of "ASTONS Steak & Salad"
  'Bakerycuisine',               // duplicate of "Bakery Cuisine"
  'Filters',                     // not a food outlet
];

async function main() {
  console.log('=== CLEANUP DUPLICATES AND BAD ENTRIES ===\n');

  // Get all Centrepoint outlets
  const { data: outlets } = await supabase
    .from('mall_outlets')
    .select('id, name, level')
    .eq('mall_id', 'the-centrepoint');

  console.log(`Current outlets: ${outlets?.length}`);

  // Delete bad entries
  const toDelete = outlets?.filter(o =>
    toDeleteNames.some(n => o.name.toLowerCase() === n.toLowerCase())
  ) || [];

  console.log(`\nDeleting ${toDelete.length} bad entries:`);
  toDelete.forEach(o => console.log(`  - ${o.name}`));

  if (toDelete.length > 0) {
    const ids = toDelete.map(o => o.id);
    await supabase.from('mall_outlets').delete().in('id', ids);
  }

  // Fix unit numbers - remove "Map" and clean up
  const toFix = outlets?.filter(o =>
    o.level && (o.level.includes('Map') || o.level.includes('\n'))
  ) || [];

  console.log(`\nFixing ${toFix.length} unit numbers:`);

  for (const o of toFix) {
    let level = o.level
      .replace(/\n?Map$/i, '')
      .replace(/\n?MAP$/i, '')
      .replace(/Map/gi, '')
      .trim();

    // Convert to standard format
    if (level.startsWith('Basement ')) {
      level = '#B' + level.replace('Basement ', '');
    } else if (level.startsWith('Level ')) {
      const lvl = level.replace('Level ', '');
      level = '#0' + lvl;
    }

    console.log(`  ${o.name}: "${o.level}" -> "${level}"`);

    await supabase
      .from('mall_outlets')
      .update({ level })
      .eq('id', o.id);
  }

  // Show final list
  const { data: remaining } = await supabase
    .from('mall_outlets')
    .select('name, level')
    .eq('mall_id', 'the-centrepoint')
    .order('name');

  console.log(`\n=== FINAL F&B OUTLETS: ${remaining?.length} ===`);
  remaining?.forEach(o => console.log(`  - ${o.name} ${o.level ? '(' + o.level + ')' : ''}`));
}

main().catch(console.error);
