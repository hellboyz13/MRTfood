const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MALL_ID = 'capitol-singapore';

const outlets = [
  { name: 'Kei Kaisendon', unit: '#B1-32' },
  { name: 'Stirling Steaks', unit: '#B2-53' },
  { name: 'Choon Hoy Parlor', unit: '#01-84A' },
  { name: 'Supergreen', unit: '#B2-26' },
  { name: 'Muyuu', unit: '#B2-27/28' },
  { name: 'Coffee Hive', unit: '#B1-15/16' },
  { name: 'Capitol Bistro Bar Patisserie', unit: '#01-86/87' },
  { name: 'Two Cranes', unit: '#B2-33/34' },
  { name: 'The Masses', unit: '#01-84' },
  { name: 'Bold Thai', unit: '#B2-55' }
];

function getCategory(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('coffee') || nameLower.includes('café') || nameLower.includes('cafe') ||
      nameLower.includes('hive') || nameLower.includes('bistro') || nameLower.includes('patisserie')) {
    return 'cafe, food';
  }
  if (nameLower.includes('steak') || nameLower.includes('stirling') || nameLower.includes('grill')) {
    return 'western, food';
  }
  if (nameLower.includes('kaisendon') || nameLower.includes('kei') || nameLower.includes('muyuu') ||
      nameLower.includes('crane') || nameLower.includes('japanese')) {
    return 'japanese, food';
  }
  if (nameLower.includes('thai') || nameLower.includes('bold')) {
    return 'thai, food';
  }
  if (nameLower.includes('choon hoy') || nameLower.includes('parlor') || nameLower.includes('local')) {
    return 'local, food';
  }
  if (nameLower.includes('supergreen') || nameLower.includes('vegetarian') || nameLower.includes('vegan')) {
    return 'vegetarian, food';
  }

  return 'restaurant, food';
}

function normalizeName(name) {
  return name.toLowerCase()
    .replace(/[''`']/g, '')
    .replace(/[®™©–—]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-capitol';
}

async function findExistingData(name) {
  const searchName = normalizeName(name);

  const { data } = await supabase
    .from('mall_outlets')
    .select('name, thumbnail_url, opening_hours')
    .limit(2000);

  let thumbnail = null;
  let hours = null;

  if (data) {
    for (const outlet of data) {
      const outletNormalized = normalizeName(outlet.name);
      if (outletNormalized === searchName) {
        if (outlet.thumbnail_url && !thumbnail) thumbnail = outlet.thumbnail_url;
        if (outlet.opening_hours && !hours) hours = outlet.opening_hours;
        if (thumbnail && hours) break;
      }
    }
    if (!thumbnail) {
      for (const outlet of data) {
        const outletNormalized = normalizeName(outlet.name);
        if ((searchName.includes(outletNormalized) || outletNormalized.includes(searchName)) &&
            outlet.thumbnail_url && searchName.length > 3 && outletNormalized.length > 3) {
          thumbnail = outlet.thumbnail_url;
          break;
        }
      }
    }
  }

  return { thumbnail, hours };
}

async function importCapitol() {
  console.log('=== IMPORTING CAPITOL SINGAPORE ===\n');

  // Check if mall exists
  const { data: mall } = await supabase
    .from('malls')
    .select('id')
    .eq('id', MALL_ID)
    .single();

  if (!mall) {
    console.log(`Mall "${MALL_ID}" not found in database. Please add the mall first.`);
    return;
  }

  // Delete existing outlets
  console.log('Removing existing outlets...');
  const { data: existing } = await supabase
    .from('mall_outlets')
    .select('id')
    .eq('mall_id', MALL_ID);

  if (existing?.length > 0) {
    await supabase.from('mall_outlets').delete().eq('mall_id', MALL_ID);
    console.log(`Deleted ${existing.length} existing outlets`);
  }

  // Import outlets
  console.log('\nImporting outlets...');
  let imported = 0;
  let withThumbnail = 0;
  let withHours = 0;

  for (const outlet of outlets) {
    const { thumbnail, hours } = await findExistingData(outlet.name);

    const { error } = await supabase
      .from('mall_outlets')
      .insert({
        id: generateId(outlet.name),
        name: outlet.name,
        mall_id: MALL_ID,
        level: outlet.unit,
        category: getCategory(outlet.name),
        thumbnail_url: thumbnail,
        opening_hours: hours,
        tags: []
      });

    if (!error) {
      imported++;
      if (thumbnail) withThumbnail++;
      if (hours) withHours++;
      console.log(`  ✓ ${outlet.name} (${outlet.unit}) ${thumbnail ? '✓img' : ''} ${hours ? '✓hrs' : ''}`);
    } else {
      console.log(`  ✗ ${outlet.name} - ${error.message}`);
    }
  }

  console.log(`\n=== COMPLETE ===`);
  console.log(`Imported: ${imported}/${outlets.length} outlets`);
  console.log(`With thumbnails: ${withThumbnail}/${imported}`);
  console.log(`With hours: ${withHours}/${imported}`);
}

importCapitol();
