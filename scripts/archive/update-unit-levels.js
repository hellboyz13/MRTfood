const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  // Read the updated CSV
  const csvContent = fs.readFileSync('weird-units-updated.csv', 'utf-8');
  const lines = csvContent.trim().split('\n');
  const header = lines[0];
  const rows = lines.slice(1);

  console.log(`Read ${rows.length} rows from CSV`);

  // Parse rows and filter those with non-empty levels
  const updates = [];
  for (const line of rows) {
    const match = line.match(/^"([^"]*?)","([^"]*?)","([^"]*?)","([^"]*?)"$/);
    if (!match) continue;

    const [, id, name, mallId, level] = match;

    // Only include rows with actual unit numbers (not empty, not "-")
    if (level && level.trim() && level.trim() !== '-' && level.trim() !== '') {
      updates.push({ id, name, mallId, level: level.trim() });
    }
  }

  console.log(`Found ${updates.length} outlets with unit numbers to update`);

  // Group by mall for display
  const byMall = {};
  for (const u of updates) {
    byMall[u.mallId] = (byMall[u.mallId] || 0) + 1;
  }
  console.log('\nBreakdown by mall:');
  for (const [mall, count] of Object.entries(byMall).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${mall}: ${count}`);
  }

  console.log('\nUpdating database...');

  let updated = 0;
  let failed = 0;
  let notFound = 0;
  const errors = [];

  for (const update of updates) {
    const { data, error } = await supabase
      .from('mall_outlets')
      .update({ level: update.level })
      .eq('id', update.id)
      .select();

    if (error) {
      console.error(`Failed to update ${update.id}: ${error.message}`);
      errors.push({ id: update.id, error: error.message });
      failed++;
    } else if (!data || data.length === 0) {
      console.log(`Not found: ${update.id} (${update.name})`);
      notFound++;
    } else {
      updated++;
      console.log(`Updated: ${update.name} -> ${update.level}`);
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Updated: ${updated}`);
  console.log(`Not found: ${notFound}`);
  console.log(`Failed: ${failed}`);

  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.forEach(e => console.log(`  ${e.id}: ${e.error}`));
  }
}

main().catch(console.error);
