const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'sb_secret_J_vsb7RYUQ_0Dm2YTR_Fuw_O-ovCRlN'
);

async function findWeirdUnits() {
  const { data, error } = await supabase
    .from('mall_outlets')
    .select('id, name, level, mall_id');

  if (error) {
    console.error('Error:', error);
    return;
  }

  // Find outlets with unidentifiable/weird levels
  const weird = data.filter(row => {
    const lvl = (row.level || '').trim();

    // Valid patterns for Singapore mall units:
    // #01-23, #B1-05, B2-100, 01-234, L1-05, #01-23/24, #01-23A
    // Level 1, Basement 1, L1, L2, B1, B2
    // #UNIT-01-01, East Wing Level 1, etc.

    // Empty is suspicious
    if (!lvl) return true;

    // Just a dash
    if (lvl === '-') return true;

    // Check if it looks like a normal unit pattern
    const hasDigit = /\d/.test(lvl);
    const hasLevelIndicator = /^(#|Level|Basement|L\d|B\d|East|West|North|South)/i.test(lvl);
    const looksLikeUnit = /\d{1,2}-\d{1,4}/.test(lvl) || /^[BL]\d$/i.test(lvl);

    // If it has no digits AND doesn't look like a level indicator, it's suspicious
    if (!hasDigit && !hasLevelIndicator) return true;

    // If it's just text without any structure
    if (/^[a-zA-Z\s]+$/.test(lvl) && !hasLevelIndicator) return true;

    return false;
  });

  // Output as CSV
  console.log('id,name,mall_id,level');
  weird.forEach(w => {
    const name = w.name.replace(/"/g, '""');
    const level = (w.level || '').replace(/"/g, '""');
    console.log(`"${w.id}","${name}","${w.mall_id}","${level}"`);
  });
}

findWeirdUnits();
