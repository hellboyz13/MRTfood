const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Map JSON keys to database mall IDs
const MALL_ID_MAP = {
  'east-coast-lagoon-food-village': 'east-coast-lagoon-food-village',
  'lau-pa-sat': 'lau-pa-sat',
  'hougang-hainanese-village-centre': 'hougang-hainanese-village-centre',
  'marine-terrace-market': 'blk-50-hawker-centre',
  'bedok-corner-food-centre': 'bedok-reservoir-food-centre', // Map to Bedok Reservoir
  'makansutra-gluttons-bay': 'esplanade-mall-food-court',
  'kopitiam-plaza-singapura': 'food-junction-plaza-singapura',
  'timbre-plus-eastside': 'expo-food-court',
  'kopitiam-tampines-mall': 'tampines-mall-food-court',
  'pacific-plaza': 'pacific-plaza',
  'bedok-reservoir-food-centre': 'bedok-reservoir-food-centre'
};

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
  console.log('IMPORTING FOOD CENTRE STALLS TO DATABASE');
  console.log('='.repeat(60));

  const inputPath = path.join(__dirname, '..', 'food-centre-stalls-clean.json');
  const data = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

  let totalInserted = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const [jsonKey, centre] of Object.entries(data)) {
    const mallId = MALL_ID_MAP[jsonKey];
    if (!mallId) {
      console.log(`\n⚠️  No mall mapping for: ${jsonKey}`);
      continue;
    }

    if (!centre.stalls || centre.stalls.length === 0) {
      console.log(`\n⚠️  No stalls for: ${centre.name}`);
      continue;
    }

    console.log(`\n--- ${centre.name} → ${mallId} (${centre.stalls.length} stalls) ---`);

    // Check if mall exists
    const { data: mall, error: mallError } = await supabase
      .from('malls')
      .select('id, name')
      .eq('id', mallId)
      .single();

    if (mallError || !mall) {
      console.log(`  ❌ Mall not found: ${mallId}`);
      continue;
    }

    for (const stall of centre.stalls) {
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

      // Prepare outlet data (only columns that exist in table)
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
        const hasThumb = stall.thumbnail ? '🖼️' : '';
        console.log(`  ✅ Inserted: ${stall.name} ${hasHours} ${hasThumb}`);
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
