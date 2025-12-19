const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'sb_secret_J_vsb7RYUQ_0Dm2YTR_Fuw_O-ovCRlN'
);

function fixLevel(level) {
  if (!level) return level;

  let fixed = level;

  // 1. Remove "UNIT-" prefix: #UNIT-01-01 → #01-01
  fixed = fixed.replace(/#UNIT-/g, '#');

  // 2. Fix KIO typo: #B2-KIO-02 → #B2-K02
  fixed = fixed.replace(/KIO-/g, 'K');
  fixed = fixed.replace(/KIO/g, 'K');

  // 3. Remove space after #: "# 01-03" → "#01-03"
  fixed = fixed.replace(/# (\d)/g, '#$1');
  fixed = fixed.replace(/# ([BL])/gi, '#$1');

  // 4. Remove spaces around dash: "01 - 03" → "01-03"
  fixed = fixed.replace(/(\d) - (\d)/g, '$1-$2');

  // 5. Extract unit from "Mall Name\n#01-32" patterns
  const mallNameMatch = fixed.match(/#[A-Za-z]?\d{1,2}-[\d\w\/&\s]+/);
  if (mallNameMatch && fixed.includes('\n')) {
    fixed = mallNameMatch[0].trim();
  }

  // 6. Clean up any remaining whitespace issues
  fixed = fixed.replace(/\s+/g, ' ').trim();

  // 7. Clean up multiple spaces around & or /
  fixed = fixed.replace(/\s*&\s*/g, ' & ');
  fixed = fixed.replace(/\s*\/\s*/g, '/');

  return fixed;
}

async function main() {
  const { data, error } = await supabase
    .from('mall_outlets')
    .select('id, name, level, mall_id');

  if (error) {
    console.error('Error:', error);
    return;
  }

  // Find outlets that need fixing
  const toFix = data.filter(row => {
    const lvl = (row.level || '').trim();
    if (!lvl) return false;

    return (
      lvl.includes('UNIT-') ||
      lvl.includes('KIO') ||
      /# \d/.test(lvl) ||
      /# [BL]/i.test(lvl) ||
      /\d - \d/.test(lvl) ||
      lvl.includes('\n')
    );
  });

  // Generate before/after
  const changes = toFix.map(row => ({
    id: row.id,
    name: row.name,
    mall_id: row.mall_id,
    before: row.level,
    after: fixLevel(row.level)
  })).filter(c => c.before !== c.after);

  // Output before CSV
  console.error(`Found ${changes.length} outlets to fix\n`);

  // Print CSV to stdout
  console.log('id,name,mall_id,before,after');
  changes.forEach(c => {
    const name = c.name.replace(/"/g, '""');
    const before = (c.before || '').replace(/"/g, '""').replace(/\n/g, '\\n');
    const after = (c.after || '').replace(/"/g, '""');
    console.log(`"${c.id}","${name}","${c.mall_id}","${before}","${after}"`);
  });

  // Ask for confirmation via stderr
  console.error(`\nReady to update ${changes.length} records in database.`);

  // Update database
  let updated = 0;
  let failed = 0;

  for (const change of changes) {
    const { error: updateError } = await supabase
      .from('mall_outlets')
      .update({ level: change.after })
      .eq('id', change.id);

    if (updateError) {
      console.error(`Failed to update ${change.id}: ${updateError.message}`);
      failed++;
    } else {
      updated++;
    }
  }

  console.error(`\nDone! Updated: ${updated}, Failed: ${failed}`);
}

main();
