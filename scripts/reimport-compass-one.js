const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function generateId(name, mallId) {
  const slug = name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-');
  return `${slug}-${mallId}`;
}

function getCategory(name) {
  const n = name.toLowerCase();
  if (n.includes('mcdonald') || n.includes('kfc') || n.includes('pizza hut') || n.includes('subway')) return 'fast food, food';
  if (n.includes('sushi') || n.includes('maki-san') || n.includes('ramen') || n.includes('yakiniku') || n.includes('yoshinoya') || n.includes('pepper lunch')) return 'japanese, food';
  if (n.includes('starbucks') || n.includes('coffee') || n.includes('toast')) return 'cafe, food';
  if (n.includes('korean') || n.includes('pocha') || n.includes('seorae')) return 'korean, food';
  if (n.includes('hotpot') || n.includes('hot pot') || n.includes('din tai fung') || n.includes('canton') || n.includes('white restaurant') || n.includes('hunan')) return 'chinese, food';
  return 'restaurant, food';
}

async function main() {
  const mallId = 'compass-one';

  // Delete existing
  const { data: existing } = await supabase
    .from('mall_outlets')
    .select('id')
    .eq('mall_id', mallId);

  if (existing?.length > 0) {
    await supabase.from('mall_outlets').delete().eq('mall_id', mallId);
    console.log(`Deleted ${existing.length} existing compass-one outlets`);
  }

  // Read and import
  const outlets = JSON.parse(fs.readFileSync('compass-one-outlets.json', 'utf8'));
  let imported = 0;

  for (const outlet of outlets) {
    const { error } = await supabase.from('mall_outlets').insert({
      id: generateId(outlet.name, mallId),
      name: outlet.name,
      mall_id: mallId,
      level: outlet.level,
      category: getCategory(outlet.name),
      thumbnail_url: null,
      opening_hours: null,
      tags: []
    });

    if (!error) {
      imported++;
      console.log(`[${outlet.level}] ${outlet.name}`);
    } else {
      console.log(`ERROR: ${outlet.name} - ${error.message}`);
    }
  }

  console.log(`\nImported ${imported}/${outlets.length} outlets`);
}

main().catch(console.error);
