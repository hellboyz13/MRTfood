const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'sb_secret_J_vsb7RYUQ_0Dm2YTR_Fuw_O-ovCRlN'
);

async function main() {
  const { data, error } = await supabase
    .from('mall_outlets')
    .select('id, name, level, mall_id');

  if (error) {
    console.error('Error:', error);
    return;
  }

  // Find weird patterns
  const weird = data.filter(row => {
    const lvl = (row.level || '').trim();
    if (!lvl) return false; // skip empty - already covered

    // Weird patterns to flag:
    return (
      lvl.includes('UNIT-') ||        // #UNIT-01-01 should be #01-01
      lvl.includes('KIO') ||          // typo for K (kiosk)
      /# \d/.test(lvl) ||             // space after # like '# 01-03'
      /\d - \d/.test(lvl) ||          // spaces around dash like '01 - 03'
      lvl.includes('  ') ||           // double spaces
      lvl.includes(',,')              // double commas
    );
  });

  console.log(`Outlets with weird unit number patterns (${weird.length} total):\n`);

  // Group by pattern type
  const byPattern = {
    'UNIT- prefix': [],
    'KIO typo': [],
    'space after #': [],
    'spaces around dash': [],
    'other': []
  };

  weird.forEach(w => {
    const lvl = w.level;
    if (lvl.includes('UNIT-')) byPattern['UNIT- prefix'].push(w);
    else if (lvl.includes('KIO')) byPattern['KIO typo'].push(w);
    else if (/# \d/.test(lvl)) byPattern['space after #'].push(w);
    else if (/\d - \d/.test(lvl)) byPattern['spaces around dash'].push(w);
    else byPattern['other'].push(w);
  });

  // Output as CSV
  console.log('id,name,mall_id,level,issue');
  weird.forEach(w => {
    const name = w.name.replace(/"/g, '""');
    const level = (w.level || '').replace(/"/g, '""').replace(/\n/g, ' ');

    let issue = 'other';
    if (w.level.includes('UNIT-')) issue = 'UNIT- prefix';
    else if (w.level.includes('KIO')) issue = 'KIO typo';
    else if (/# \d/.test(w.level)) issue = 'space after #';
    else if (/\d - \d/.test(w.level)) issue = 'spaces around dash';
    else if (/[A-Za-z]{10,}/.test(w.level)) issue = 'mall name in level';

    console.log(`"${w.id}","${name}","${w.mall_id}","${level}","${issue}"`);
  });
}

main();
