const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ION Orchard F&B from official website
const ionOrchardRestaurants = [
  { name: "1-ATICO BY 1-ALTITUDE", unit: "#55-01, #56-01" },
  { name: "BACHA COFFEE", unit: "#01-15/16" },
  { name: "CAFE NESUTO", unit: "#04-27/28/29/30/31/32" },
  { name: "CANTON PARADISE+", unit: "#B3-17" },
  { name: "HOSHINO COFFEE", unit: "#B3-22" },
  { name: "IMPERIAL TREASURE FINE TEOCHEW CUISINE", unit: "#03-05" },
  { name: "IMPERIAL TREASURE HUAIYANG CUISINE", unit: "#04-12A" },
  { name: "ITACHO SUSHI", unit: "#B3-20" },
  { name: "JUMBO SEAFOOD", unit: "#04-09/10" },
  { name: "KANSHOKU RAMEN BAR", unit: "#B3-18" },
  { name: "MARUTAMA RAMEN", unit: "#B4-54" },
  { name: "MONSTER CURRY", unit: "#B4-52" },
  { name: "NIKU KAPPO BY WATAMI", unit: "#B4-67/68" },
  { name: "POCHA! KOREAN STREET DINING", unit: "#B4-67/68" },
  { name: "POULET + BRASSERIE", unit: "#B3-21" },
  { name: "SANOOK KITCHEN", unit: "#B3-19" },
  { name: "SEN-RYO", unit: "#03-17/18" },
  { name: "SURREY HILLS GROCER", unit: "#05-02" },
  { name: "TASTE PARADISE", unit: "#04-07" },
  { name: "TEMPURA TENDON TENYA", unit: "#B4-56" },
  { name: "THE MARMALADE PANTRY", unit: "#04-11" },
  { name: "TWG TEA", unit: "#02-20/21" },
  { name: "VIOLET OON SINGAPORE", unit: "#04-12" }
];

const MALL_ID = 'ion-orchard';

function getCategory(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('coffee') || nameLower.includes('cafe') || nameLower.includes('twg') ||
      nameLower.includes('bacha')) {
    return 'cafe, food';
  }
  if (nameLower.includes('sushi') || nameLower.includes('ramen') || nameLower.includes('sen-ryo') ||
      nameLower.includes('tempura') || nameLower.includes('tendon') || nameLower.includes('itacho') ||
      nameLower.includes('niku kappo') || nameLower.includes('watami')) {
    return 'japanese, food';
  }
  if (nameLower.includes('korean') || nameLower.includes('pocha')) {
    return 'korean, food';
  }
  if (nameLower.includes('canton') || nameLower.includes('paradise') || nameLower.includes('imperial treasure') ||
      nameLower.includes('taste paradise')) {
    return 'chinese, food';
  }
  if (nameLower.includes('thai') || nameLower.includes('sanook')) {
    return 'thai, food';
  }
  if (nameLower.includes('violet oon')) {
    return 'local, food';
  }
  if (nameLower.includes('jumbo') || nameLower.includes('seafood')) {
    return 'seafood, food';
  }
  if (nameLower.includes('marmalade') || nameLower.includes('surrey') || nameLower.includes('poulet') ||
      nameLower.includes('atico') || nameLower.includes('altitude')) {
    return 'western, food';
  }
  if (nameLower.includes('monster curry') || nameLower.includes('curry')) {
    return 'local, food';
  }

  return 'restaurant, food';
}

function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-ion-orchard';
}

async function importRestaurants() {
  console.log('=== ION ORCHARD IMPORT ===\n');

  console.log('Step 1: Removing existing outlets...');
  const { data: existing } = await supabase
    .from('mall_outlets')
    .select('id')
    .eq('mall_id', MALL_ID);

  if (existing && existing.length > 0) {
    console.log(`Found ${existing.length} existing outlets to remove`);
    await supabase.from('mall_outlets').delete().eq('mall_id', MALL_ID);
  } else {
    console.log('No existing outlets found');
  }

  console.log('\nStep 2: Importing outlets...');
  let imported = 0;
  let failed = 0;

  for (const restaurant of ionOrchardRestaurants) {
    const category = getCategory(restaurant.name);
    const id = generateId(restaurant.name);

    const { error: insertError } = await supabase
      .from('mall_outlets')
      .insert({
        id: id,
        name: restaurant.name,
        mall_id: MALL_ID,
        level: restaurant.unit,
        category: category,
        tags: []
      });

    if (insertError) {
      console.log(`Error inserting ${restaurant.name}: ${insertError.message}`);
      failed++;
      continue;
    }

    console.log(`Imported: ${restaurant.name} (${category})`);
    imported++;
  }

  console.log(`\n=== IMPORT COMPLETE ===`);
  console.log(`Imported: ${imported}`);
  console.log(`Failed: ${failed}`);

  const { data: finalCount } = await supabase
    .from('mall_outlets')
    .select('id')
    .eq('mall_id', MALL_ID);

  console.log(`\nTotal outlets at ION Orchard: ${finalCount?.length || 0}`);
}

importRestaurants().catch(console.error);
