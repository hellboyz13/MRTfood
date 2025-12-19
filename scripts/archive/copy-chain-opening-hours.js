const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Normalize name for matching (same as thumbnail script)
function normalizeName(name) {
  return name.toLowerCase()
    .replace(/[®™'\'\"]/g, '')
    .replace(/\s*\([^)]*\)/g, '') // Remove parentheses content
    .replace(/\s*-\s*[^-]*$/, '') // Remove location suffix after dash
    .replace(/\s*@\s*.*$/, '') // Remove @ location
    .replace(/,\s*.*$/, '') // Remove comma suffix
    .trim();
}

async function copyOpeningHours() {
  console.log('=== COPY CHAIN RESTAURANT OPENING HOURS ===\n');

  // Get all outlets with opening_hours
  const { data: outletsWithHours, error: err1 } = await supabase
    .from('mall_outlets')
    .select('id, name, opening_hours')
    .not('opening_hours', 'is', null);

  if (err1) {
    console.error('Error fetching outlets with hours:', err1);
    return;
  }

  // Build map of normalized chain names to opening_hours
  const chainHours = new Map();

  for (const outlet of outletsWithHours) {
    const normalizedName = normalizeName(outlet.name);
    if (!chainHours.has(normalizedName) && outlet.opening_hours) {
      chainHours.set(normalizedName, outlet.opening_hours);
    }
  }

  console.log(`Found ${chainHours.size} unique chain names with opening hours\n`);

  // Get all outlets without opening_hours
  const { data: outletsWithoutHours, error: err2 } = await supabase
    .from('mall_outlets')
    .select('id, name')
    .is('opening_hours', null);

  if (err2) {
    console.error('Error fetching outlets without hours:', err2);
    return;
  }

  console.log(`Found ${outletsWithoutHours.length} outlets without opening hours\n`);

  let updated = 0;
  let skipped = 0;

  for (const outlet of outletsWithoutHours) {
    const normalizedName = normalizeName(outlet.name);

    if (chainHours.has(normalizedName)) {
      const hours = chainHours.get(normalizedName);

      const { error: updateError } = await supabase
        .from('mall_outlets')
        .update({ opening_hours: hours })
        .eq('id', outlet.id);

      if (updateError) {
        console.log(`Error updating ${outlet.name}: ${updateError.message}`);
      } else {
        console.log(`Updated: ${outlet.name}`);
        updated++;
      }
    } else {
      skipped++;
    }
  }

  console.log(`\n=== COMPLETE ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped (no matching chain): ${skipped}`);
}

copyOpeningHours().catch(console.error);
