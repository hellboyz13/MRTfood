/**
 * Update supper tags based on opening hours
 * Supper = closes past midnight (12am-6am) on at least one day
 *
 * Usage:
 *   node scripts/update-supper-tags.js           # Update both tables
 *   node scripts/update-supper-tags.js --dry-run # Preview changes
 *   node scripts/update-supper-tags.js mall      # Only mall_outlets
 *   node scripts/update-supper-tags.js food      # Only food_listings
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function parseHour(hourStr, ampm) {
  let hour = parseInt(hourStr);
  const isPM = ampm.toUpperCase() === 'PM';
  if (isPM && hour < 12) hour += 12;
  if (!isPM && hour === 12) hour = 0;
  return hour;
}

function extractClosingHour(text) {
  const match = text.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*$/i);
  if (match) {
    return parseHour(match[1], match[3]);
  }
  return null;
}

function isLateNight(hour) {
  // Supper: 12am (0) to 6am (5) - places open past midnight
  return hour >= 0 && hour < 6;
}

function isSupperPlace(hours) {
  if (!hours) return false;

  // Check periods format (from Google API)
  if (hours.periods) {
    for (const period of hours.periods) {
      if (period.close?.time) {
        const time = parseInt(period.close.time);
        // Supper: closes at 0000-0559 (past midnight)
        if (time >= 0 && time < 600) return true;
      }
    }
  }

  // Check weekday_text format
  if (hours.weekday_text) {
    for (const text of hours.weekday_text) {
      if (text.toLowerCase().includes('24 hours')) return true;
      const closingTime = extractClosingHour(text);
      if (closingTime !== null && isLateNight(closingTime)) {
        return true;
      }
    }
  }

  // Check weekdayDescriptions format (scraped data)
  if (hours.weekdayDescriptions) {
    for (const text of hours.weekdayDescriptions) {
      // Look for "Closes X am" pattern
      const closesMatch = text.match(/closes?\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
      if (closesMatch) {
        const hour = parseHour(closesMatch[1], closesMatch[3]);
        if (isLateNight(hour)) return true;
      }

      // Look for time range ending like "– 1:00 AM" or "to 2 AM"
      const rangeMatch = text.match(/(?:–|-|to)\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\s*$/i);
      if (rangeMatch) {
        const hour = parseHour(rangeMatch[1], rangeMatch[3]);
        if (isLateNight(hour)) return true;
      }
    }
  }

  // Check string format (plain text hours)
  if (typeof hours === 'string') {
    const lines = hours.split('\n');
    for (const text of lines) {
      const closingTime = extractClosingHour(text);
      if (closingTime !== null && isLateNight(closingTime)) {
        return true;
      }
    }
  }

  return false;
}

async function fetchAllRecords(table) {
  let allRecords = [];
  let offset = 0;
  const batchSize = 1000;

  while (true) {
    const { data: batch, error } = await supabase
      .from(table)
      .select('id, name, opening_hours, tags')
      .not('opening_hours', 'is', null)
      .range(offset, offset + batchSize - 1);

    if (error) {
      console.error(`Error fetching ${table}:`, error);
      return null;
    }

    if (batch.length === 0) break;
    allRecords = allRecords.concat(batch);
    offset += batchSize;

    if (batch.length < batchSize) break;
  }

  return allRecords;
}

async function updateSupperTags(table, records, dryRun) {
  let added = 0, removed = 0, kept = 0;

  for (const record of records) {
    const isSupper = isSupperPlace(record.opening_hours);
    const currentTags = record.tags || [];
    const hasSupperTag = currentTags.some(t => t.toLowerCase() === 'supper');

    if (isSupper && !hasSupperTag) {
      const newTags = [...currentTags, 'Supper'];
      if (!dryRun) {
        await supabase.from(table).update({ tags: newTags }).eq('id', record.id);
      }
      console.log(`+ ${record.name}`);
      added++;
    } else if (!isSupper && hasSupperTag) {
      const newTags = currentTags.filter(t => t.toLowerCase() !== 'supper');
      if (!dryRun) {
        await supabase.from(table).update({ tags: newTags }).eq('id', record.id);
      }
      console.log(`- ${record.name} (removed)`);
      removed++;
    } else if (isSupper && hasSupperTag) {
      kept++;
    }
  }

  return { added, removed, kept };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const tableArg = args.find(a => a === 'mall' || a === 'food');

  const tables = tableArg === 'mall' ? ['mall_outlets']
    : tableArg === 'food' ? ['food_listings']
    : ['mall_outlets', 'food_listings'];

  console.log(`\n=== UPDATE SUPPER TAGS ${dryRun ? '(DRY RUN)' : ''} ===\n`);

  let totalAdded = 0, totalRemoved = 0, totalKept = 0;

  for (const table of tables) {
    console.log(`\n--- ${table} ---\n`);

    const records = await fetchAllRecords(table);
    if (!records) continue;

    console.log(`Found ${records.length} records with opening hours\n`);

    const result = await updateSupperTags(table, records, dryRun);
    totalAdded += result.added;
    totalRemoved += result.removed;
    totalKept += result.kept;

    console.log(`\n${table}: Added ${result.added}, Removed ${result.removed}, Kept ${result.kept}`);
  }

  console.log('\n=== TOTAL SUMMARY ===');
  console.log(`Added Supper tag: ${totalAdded}`);
  console.log(`Removed incorrect Supper tag: ${totalRemoved}`);
  console.log(`Already had correct Supper tag: ${totalKept}`);
  console.log(`Total supper places: ${totalAdded + totalKept}`);

  if (dryRun) {
    console.log('\n(Dry run - no changes made. Run without --dry-run to apply)');
  }
}

main().catch(console.error);
