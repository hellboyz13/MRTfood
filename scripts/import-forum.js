const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MALL_ID = 'forum-the-shopping-mall';

const outlets = [
  { name: 'Chui Er Ge Sichuan Kitchen', unit: '#01-41 to 43' },
  { name: 'EAT.', unit: '#B1-31/32' },
  { name: 'Gyu San Japanese Sando & Charcoal Bar', unit: '#01-28' },
  { name: 'Hana', unit: '#01-17' },
  { name: 'Jade Palace Seafood Restaurant', unit: '#B1-12/15' },
  { name: 'Kind Kones', unit: '#B1-27 & K1' },
  { name: 'LINO', unit: '#01-01/04' },
  { name: 'McDonald\'s', unit: '#B1-25' },
  { name: 'Pita Tree Mediterranean Grilled Kebabs', unit: '#01-K3' },
  { name: 'See\'s Candies', unit: '#01-K2' },
  { name: 'Social Place', unit: '#01-22' },
  { name: 'Tan Jin Ji Chengdu Hotpot', unit: '#B1-39 to 47' },
  { name: 'The Coffee Bean & Tea Leaf', unit: '#01-45/46' }
];

function getCategory(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('coffee') || nameLower.includes('café') || nameLower.includes('cafe')) {
    return 'cafe, food';
  }
  if (nameLower.includes('candy') || nameLower.includes('candies') || nameLower.includes('kones') ||
      nameLower.includes('ice cream') || nameLower.includes('dessert')) {
    return 'desserts, food';
  }
  if (nameLower.includes('mcdonald') || nameLower.includes('burger king') || nameLower.includes('kfc')) {
    return 'fast food, food';
  }
  if (nameLower.includes('sushi') || nameLower.includes('japanese') || nameLower.includes('sando') ||
      nameLower.includes('gyu') || nameLower.includes('hana')) {
    return 'japanese, food';
  }
  if (nameLower.includes('sichuan') || nameLower.includes('chengdu') || nameLower.includes('hotpot') ||
      nameLower.includes('jade palace') || nameLower.includes('chinese') || nameLower.includes('seafood')) {
    return 'chinese, food';
  }
  if (nameLower.includes('mediterranean') || nameLower.includes('pita') || nameLower.includes('kebab')) {
    return 'western, food';
  }
  if (nameLower.includes('lino') || nameLower.includes('italian') || nameLower.includes('pizza') ||
      nameLower.includes('pasta')) {
    return 'italian, food';
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
    + '-forum';
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

async function importForum() {
  console.log('=== IMPORTING FORUM THE SHOPPING MALL ===\n');

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

importForum();
