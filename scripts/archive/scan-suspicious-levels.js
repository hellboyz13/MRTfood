/**
 * Scan for suspicious unit numbers in mall_outlets
 * Flags: floors > 7, standalone numbers, weird patterns
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
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
  console.log('\n========================================');
  console.log('SUSPICIOUS UNIT NUMBERS');
  console.log('========================================\n');

  const suspicious = [];

  for (const outlet of outlets) {
    const level = outlet.level;
    if (!level) continue;

    // Extract floor number from patterns like #08-XX, #99-XX, etc.
    const match = level.match(/^#?(\d+)-/);
    if (match) {
      const floorNum = parseInt(match[1], 10);
      // Flag if floor > 7 (most neighbourhood malls are 1-6 floors)
      if (floorNum > 7) {
        suspicious.push({
          id: outlet.id,
          name: outlet.name,
          level: outlet.level,
          mall_id: outlet.mall_id,
          floor: floorNum,
          reason: `High floor number (${floorNum})`
        });
      }
    }

    // Check for standalone numbers (like just '21')
    if (/^\d+$/.test(level.trim())) {
      suspicious.push({
        id: outlet.id,
        name: outlet.name,
        level: outlet.level,
        mall_id: outlet.mall_id,
        floor: parseInt(level.trim(), 10),
        reason: 'Standalone number (not unit format)'
      });
    }

    // Patterns like 'Level XX' without proper unit
    if (/^Level \d+$/i.test(level.trim())) {
      const num = parseInt(level.match(/\d+/)[0], 10);
      if (num > 7) {
        suspicious.push({
          id: outlet.id,
          name: outlet.name,
          level: outlet.level,
          mall_id: outlet.mall_id,
          floor: num,
          reason: `High floor in Level format (${num})`
        });
      }
    }

    // Check for #99-XX patterns (clearly wrong)
    if (/^#?9\d-/.test(level)) {
      // Already caught above, but double check
    }

    // Check for unusual basement levels (B3 and below are rare)
    const basementMatch = level.match(/^#?B(\d+)-/i);
    if (basementMatch) {
      const basementNum = parseInt(basementMatch[1], 10);
      if (basementNum > 3) {
        suspicious.push({
          id: outlet.id,
          name: outlet.name,
          level: outlet.level,
          mall_id: outlet.mall_id,
          floor: -basementNum,
          reason: `Deep basement (B${basementNum})`
        });
      }
    }
  }

  // Remove duplicates (same outlet might match multiple patterns)
  const seen = new Set();
  const unique = suspicious.filter(s => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });

  // Sort by floor number (highest first)
  unique.sort((a, b) => (b.floor || 0) - (a.floor || 0));

  // Group by mall
  const byMall = {};
  for (const s of unique) {
    if (!byMall[s.mall_id]) byMall[s.mall_id] = [];
    byMall[s.mall_id].push(s);
  }

  for (const [mall, items] of Object.entries(byMall)) {
    console.log('\n' + mall.toUpperCase());
    console.log('-'.repeat(50));
    for (const item of items) {
      console.log(`  ${item.level.padEnd(15)} | ${item.name.substring(0, 35)}`);
      console.log(`    Reason: ${item.reason}`);
      console.log(`    ID: ${item.id}`);
    }
  }

  console.log('\n========================================');
  console.log('SUMMARY');
  console.log('========================================');
  console.log('Total suspicious entries:', unique.length);
  console.log('Malls affected:', Object.keys(byMall).length);

  // List IDs for easy cleanup
  if (unique.length > 0) {
    console.log('\n========================================');
    console.log('IDs TO REVIEW/CLEAN:');
    console.log('========================================');
    unique.forEach(s => {
      console.log(`${s.id}`);
    });
  }
}

main().catch(console.error);
