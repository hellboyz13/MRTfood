/**
 * Import tags from CSV and remove non-food outlets
 *
 * Also removes similar outlets based on patterns (e.g., all "7-Eleven" variations)
 *
 * Usage:
 *   node scripts/import-outlet-tags.js --dry-run     # Preview changes
 *   node scripts/import-outlet-tags.js               # Apply changes
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DRY_RUN = process.argv.includes('--dry-run');

// Non-food patterns to remove (based on CSV "to_remove" column)
// These will match any outlet containing these keywords
const NON_FOOD_PATTERNS = [
  // Convenience stores
  '7-eleven', '7 eleven',
  // Retail/Non-food
  'bata', 'bank of china', 'beauty language', 'anytime fitness',
  'bottles & bottles', '8 by bottles', '1855 the bottle shop',
  'candy empire', 'categories', 'cellar deluxe', 'cellarbration',
  'ecapitavoucher', 'follow us on wechat', 'gold class', 'golden village',
  'godiva', 'beryl\'s', 'bliss nest capsules', 'honeyworld',
  'klook', 'kuriya japanese market', 'little farms',
  'marks & spencer', 'm&s food', 'met group', 'metro',
  'nature\'s nutrition', 'nespresso', 'phuture', 'red dot supervalue',
  'redtail bar by zouk', 'ryan\'s grocery', 'the club', 'the flex',
  'the ion edit', 'the liquor shop', 'the oaks cellars', 'the sgfr store',
  'valu$', 'vivino', 'warehouse', 'what\'s on', 'wing joo loong',
  'world of candies', 'zouk'
];

// Parse CSV content
function parseCSV(content) {
  const lines = content.split('\n');
  const results = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle CSV with quoted fields
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    if (values.length >= 2) {
      const name = values[0].replace(/^"|"$/g, '');
      const tags = values[1] ? values[1].split(',').map(t => t.trim()).filter(t => t) : [];
      const toRemove = values[2] && values[2].toLowerCase() === 'yes';

      results.push({ name, tags, toRemove });
    }
  }

  return results;
}

// Normalize name for matching
function normalizeName(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/['']/g, "'")
    .replace(/\s*\([^)]*\)\s*$/g, '') // Remove parenthetical suffixes
    .trim();
}

// Check if outlet matches non-food patterns
function isNonFoodOutlet(name) {
  const nameLower = name.toLowerCase();
  return NON_FOOD_PATTERNS.some(pattern => nameLower.includes(pattern));
}

async function importTags() {
  console.log('=== Importing Outlet Tags & Removing Non-Food Outlets ===');
  if (DRY_RUN) {
    console.log('>>> DRY RUN MODE - No changes will be made <<<\n');
  }

  // Read CSV file
  const csvPath = path.join(__dirname, '..', 'outlets-tagged-full.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const tagData = parseCSV(csvContent);

  console.log(`Loaded ${tagData.length} entries from CSV\n`);

  // Get all outlets from database
  let allOutlets = [];
  let offset = 0;
  while (true) {
    const { data } = await supabase
      .from('mall_outlets')
      .select('id, name, tags')
      .range(offset, offset + 999);
    if (!data || data.length === 0) break;
    allOutlets = allOutlets.concat(data);
    if (data.length < 1000) break;
    offset += 1000;
  }

  console.log(`Found ${allOutlets.length} outlets in database\n`);

  // Build lookup maps
  const exactNameMap = new Map();
  const normalizedNameMap = new Map();

  tagData.forEach(entry => {
    exactNameMap.set(entry.name, entry);
    normalizedNameMap.set(normalizeName(entry.name), entry);
  });

  // Process outlets
  const toUpdate = [];
  const toRemove = [];
  let notFoundCount = 0;

  for (const outlet of allOutlets) {
    // First check if it matches non-food patterns
    if (isNonFoodOutlet(outlet.name)) {
      toRemove.push({ outlet, reason: 'Matches non-food pattern' });
      continue;
    }

    // Try exact match first, then normalized
    let tagEntry = exactNameMap.get(outlet.name);
    if (!tagEntry) {
      tagEntry = normalizedNameMap.get(normalizeName(outlet.name));
    }

    if (!tagEntry) {
      notFoundCount++;
      continue;
    }

    if (tagEntry.toRemove) {
      toRemove.push({ outlet, reason: 'Flagged in CSV' });
    } else if (tagEntry.tags.length > 0) {
      // Merge with existing tags
      const existingTags = outlet.tags || [];
      const mergedTags = [...new Set([...existingTags, ...tagEntry.tags])];

      // Only update if tags actually changed
      if (JSON.stringify(mergedTags.sort()) !== JSON.stringify(existingTags.sort())) {
        toUpdate.push({ outlet, newTags: mergedTags });
      }
    }
  }

  console.log('=== Summary ===');
  console.log(`Outlets to update with tags: ${toUpdate.length}`);
  console.log(`Outlets to remove (non-food): ${toRemove.length}`);
  console.log(`Outlets not found in CSV: ${notFoundCount}\n`);

  // Show removals grouped by reason
  if (toRemove.length > 0) {
    const byPattern = toRemove.filter(r => r.reason === 'Matches non-food pattern');
    const byCSV = toRemove.filter(r => r.reason === 'Flagged in CSV');

    if (byPattern.length > 0) {
      console.log(`=== Removing by Pattern Match (${byPattern.length}) ===`);
      byPattern.forEach(item => {
        console.log(`  - ${item.outlet.name}`);
      });
      console.log('');
    }

    if (byCSV.length > 0) {
      console.log(`=== Removing by CSV Flag (${byCSV.length}) ===`);
      byCSV.forEach(item => {
        console.log(`  - ${item.outlet.name}`);
      });
      console.log('');
    }
  }

  // Show sample updates
  if (toUpdate.length > 0) {
    console.log('=== Sample Tag Updates ===');
    toUpdate.slice(0, 10).forEach(item => {
      console.log(`  ${item.outlet.name}`);
      console.log(`    Old: [${(item.outlet.tags || []).join(', ')}]`);
      console.log(`    New: [${item.newTags.join(', ')}]`);
    });
    if (toUpdate.length > 10) {
      console.log(`  ... and ${toUpdate.length - 10} more`);
    }
    console.log('');
  }

  if (DRY_RUN) {
    console.log('--- DRY RUN: No changes made ---');
    console.log('Run without --dry-run to apply changes.');
    return;
  }

  // Apply removals
  let removed = 0;
  for (const item of toRemove) {
    const { error } = await supabase
      .from('mall_outlets')
      .delete()
      .eq('id', item.outlet.id);

    if (!error) {
      removed++;
    } else {
      console.error(`Error removing ${item.outlet.name}:`, error.message);
    }
  }

  // Apply tag updates
  let updated = 0;
  for (const item of toUpdate) {
    const { error } = await supabase
      .from('mall_outlets')
      .update({ tags: item.newTags })
      .eq('id', item.outlet.id);

    if (!error) {
      updated++;
    } else {
      console.error(`Error updating ${item.outlet.name}:`, error.message);
    }
  }

  console.log('=== Done ===');
  console.log(`Removed: ${removed} outlets`);
  console.log(`Updated: ${updated} outlets with new tags`);
}

importTags().catch(console.error);
