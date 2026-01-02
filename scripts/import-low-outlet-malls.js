const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

async function run() {
  console.log('='.repeat(60));
  console.log('IMPORTING STALLS FOR LOW-OUTLET MALLS');
  console.log('='.repeat(60));

  const inputPath = path.join(__dirname, 'low-outlet-malls.json');
  const data = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

  let totalInserted = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const [mallId, mall] of Object.entries(data)) {
    if (!mall.stalls || mall.stalls.length === 0) continue;

    console.log(`\n--- ${mall.name} (${mall.stalls.length} stalls) ---`);

    // Check if mall exists
    const { data: mallData, error: mallError } = await supabase
      .from('malls')
      .select('id, name')
      .eq('id', mallId)
      .single();

    if (mallError || !mallData) {
      console.log(`  ❌ Mall not found: ${mallId}`);
      continue;
    }

    for (const stall of mall.stalls) {
      const slug = generateSlug(stall.name);

      // Check if stall already exists
      const { data: existing } = await supabase
        .from('mall_outlets')
        .select('id')
        .eq('mall_id', mallId)
        .ilike('name', stall.name)
        .single();

      if (existing) {
        console.log(`  ⏭️  Already exists: ${stall.name}`);
        totalSkipped++;
        continue;
      }

      // Prepare outlet data
      const outletData = {
        id: `${slug}-${mallId}`,
        mall_id: mallId,
        name: stall.name,
        level: stall.unit || null,
        category: 'food',
        opening_hours: stall.openingHours || null,
        thumbnail_url: stall.thumbnail || null,
        price_range: null,
        tags: null
      };

      const { error: insertError } = await supabase
        .from('mall_outlets')
        .insert(outletData);

      if (insertError) {
        console.log(`  ❌ Error inserting ${stall.name}: ${insertError.message}`);
        totalErrors++;
      } else {
        const hasHours = stall.openingHours ? '⏰' : '';
        console.log(`  ✅ Inserted: ${stall.name} ${hasHours}`);
        totalInserted++;
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Inserted: ${totalInserted}`);
  console.log(`Skipped (already exists): ${totalSkipped}`);
  console.log(`Errors: ${totalErrors}`);
}

run().catch(console.error);
