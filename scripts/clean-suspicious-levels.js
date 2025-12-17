/**
 * Clean suspicious unit numbers from mall_outlets
 * Sets level to null for entries with invalid floor numbers
 *
 * Run with: node scripts/clean-suspicious-levels.js [--save]
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Known tall malls (floors > 7 are valid)
const TALL_MALLS = [
  'ngee-ann-city',      // 7 floors + basement
  'orchard-central',    // 11 floors
  'orchard-gateway',    // 10+ floors (hotel)
  'wisma-atria',        // 4 retail floors but address shows higher
  'ion-orchard',        // 4 basement + 4 above (but 55 is wrong)
];

async function main() {
  const args = process.argv.slice(2);
  const saveMode = args.includes('--save');

  console.log('========================================');
  console.log('Clean Suspicious Unit Numbers');
  console.log('========================================');
  console.log(`Mode: ${saveMode ? 'SAVE' : 'DRY RUN'}\n`);

  // Get all outlets with level info
  const { data: outlets, error } = await supabase
    .from('mall_outlets')
    .select('id, name, level, mall_id')
    .not('level', 'is', null);

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log('Total outlets with level info:', outlets.length);

  const toClean = [];

  for (const outlet of outlets) {
    const level = outlet.level;
    if (!level) continue;

    let shouldClean = false;
    let reason = '';

    // 1. Standalone numbers (no dash = not unit format)
    if (/^\d+$/.test(level.trim())) {
      shouldClean = true;
      reason = 'Standalone number (not unit format)';
    }

    // 2. High floor numbers (> 15 is definitely wrong for any mall)
    const floorMatch = level.match(/^#?(\d+)-/);
    if (floorMatch) {
      const floorNum = parseInt(floorMatch[1], 10);
      if (floorNum > 15) {
        shouldClean = true;
        reason = `Impossible floor number (${floorNum})`;
      } else if (floorNum > 7 && !TALL_MALLS.includes(outlet.mall_id)) {
        // For non-tall malls, > 7 is suspicious
        shouldClean = true;
        reason = `High floor for this mall (${floorNum})`;
      }
    }

    // 3. Deep basements (B4+) - very rare
    const basementMatch = level.match(/^#?B(\d+)-/i);
    if (basementMatch) {
      const basementNum = parseInt(basementMatch[1], 10);
      if (basementNum > 3) {
        shouldClean = true;
        reason = `Deep basement (B${basementNum})`;
      }
    }

    // 4. Level XX format with high number
    if (/^Level \d+$/i.test(level.trim())) {
      const num = parseInt(level.match(/\d+/)[0], 10);
      if (num > 10 && !TALL_MALLS.includes(outlet.mall_id)) {
        shouldClean = true;
        reason = `High floor in Level format (${num})`;
      }
    }

    if (shouldClean) {
      toClean.push({
        id: outlet.id,
        name: outlet.name,
        level: outlet.level,
        mall_id: outlet.mall_id,
        reason
      });
    }
  }

  console.log(`\nFound ${toClean.length} entries to clean:\n`);

  // Group by mall for display
  const byMall = {};
  for (const item of toClean) {
    if (!byMall[item.mall_id]) byMall[item.mall_id] = [];
    byMall[item.mall_id].push(item);
  }

  for (const [mall, items] of Object.entries(byMall)) {
    console.log(`\n${mall}`);
    console.log('-'.repeat(50));
    for (const item of items) {
      console.log(`  ${item.level.padEnd(15)} → null | ${item.name.substring(0, 30)}`);
      console.log(`    Reason: ${item.reason}`);
    }
  }

  if (!saveMode) {
    console.log('\n========================================');
    console.log('DRY RUN - No changes made');
    console.log('Run with --save to apply changes');
    console.log('========================================');
    return;
  }

  // Apply changes
  console.log('\n========================================');
  console.log('APPLYING CHANGES');
  console.log('========================================\n');

  let success = 0;
  let failed = 0;

  for (const item of toClean) {
    const { error } = await supabase
      .from('mall_outlets')
      .update({ level: null })
      .eq('id', item.id);

    if (error) {
      console.error(`✗ Failed: ${item.name} - ${error.message}`);
      failed++;
    } else {
      console.log(`✓ Cleaned: ${item.name}`);
      success++;
    }
  }

  console.log('\n========================================');
  console.log('SUMMARY');
  console.log('========================================');
  console.log(`Success: ${success}`);
  console.log(`Failed: ${failed}`);
}

main().catch(console.error);
