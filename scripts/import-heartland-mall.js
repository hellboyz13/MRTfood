const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MALL_ID = 'heartland-mall-kovan';

const outlets = [
  // Dine In
  { name: 'AONE SIGNATURE', unit: '#02-02' },
  { name: 'Buddy Hoagies Cafe & Grill', unit: '#01-27' },
  { name: 'Gong Yuan Malatang', unit: '#02-15' },
  { name: 'Ivins Peranakan Restaurant', unit: '#02-20/21' },
  { name: 'Nan Yang Dao', unit: '#01-08' },
  { name: 'Saizeriya', unit: '#02-26/27/28/29' },
  { name: 'Sanook Kitchen', unit: '#01-12' },
  { name: 'Suki-Ya', unit: '#02-09' },
  { name: 'SUKIYA', unit: '#01-06' },
  { name: 'The Charcoal Grill Legend', unit: '#01-13' },
  { name: 'Toast Box', unit: '#01-14/15' },
  { name: 'Vegetarian Express', unit: '#02-22' },
  // Take-Away
  { name: 'Fragrance', unit: '#01-22' },
  { name: 'Ho Kee Pau', unit: '#01-K2' },
  { name: 'Mixue Ice Cream & Tea', unit: '#01-19/20' },
  { name: 'Old Chang Kee', unit: '#01-10' },
  { name: 'SnackzIt', unit: '#01-21' },
  { name: 'Stuff\'d', unit: '#01-13A' },
  { name: 'The Summer Acai', unit: '#03-15' },
  { name: 'WOK HEY', unit: '#01-23/24' },
  // Bakery & Confectionery
  { name: 'Four Leaves', unit: '#01-17/18' },
  { name: 'Prima Deli', unit: '#01-09' },
  { name: 'Toast & Roll By Swee Heng', unit: '#01-02' },
  // Desserts & Bubble Tea
  { name: 'KOI Thé', unit: '#01-16' },
  { name: 'LIHO', unit: '#02-08' },
  { name: 'Mr Bean', unit: '#01-07' },
  { name: 'Mr. Coconut', unit: '#02-8A' }
];

function getCategory(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('coffee') || nameLower.includes('café') || nameLower.includes('cafe') ||
      nameLower.includes('toast box') || nameLower.includes('hoagies')) {
    return 'cafe, food';
  }
  if (nameLower.includes('bakery') || nameLower.includes('bread') || nameLower.includes('four leaves') ||
      nameLower.includes('prima deli') || nameLower.includes('swee heng') || nameLower.includes('toast & roll')) {
    return 'bakery, food';
  }
  if (nameLower.includes('tea') || nameLower.includes('koi') || nameLower.includes('liho') ||
      nameLower.includes('mr bean') || nameLower.includes('coconut') || nameLower.includes('mixue')) {
    return 'drinks, food';
  }
  if (nameLower.includes('ice cream') || nameLower.includes('dessert') || nameLower.includes('acai')) {
    return 'desserts, food';
  }
  if (nameLower.includes('saizeriya') || nameLower.includes('pizza') || nameLower.includes('pasta')) {
    return 'italian, food';
  }
  if (nameLower.includes('suki') || nameLower.includes('sukiya') || nameLower.includes('a-one') ||
      nameLower.includes('aone')) {
    return 'japanese, food';
  }
  if (nameLower.includes('sanook') || nameLower.includes('thai')) {
    return 'thai, food';
  }
  if (nameLower.includes('malatang') || nameLower.includes('gong yuan') || nameLower.includes('wok hey')) {
    return 'chinese, food';
  }
  if (nameLower.includes('peranakan') || nameLower.includes('ivins') || nameLower.includes('nanyang') ||
      nameLower.includes('nan yang') || nameLower.includes('old chang kee') || nameLower.includes('pau') ||
      nameLower.includes('fragrance')) {
    return 'local, food';
  }
  if (nameLower.includes('vegetarian')) {
    return 'vegetarian, food';
  }
  if (nameLower.includes('charcoal') || nameLower.includes('grill') || nameLower.includes('bbq')) {
    return 'korean, food';
  }
  if (nameLower.includes('snack') || nameLower.includes('stuff')) {
    return 'fast food, food';
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
    + '-heartland-mall-kovan';
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

async function importHeartlandMall() {
  console.log('=== IMPORTING HEARTLAND MALL KOVAN ===\n');

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

importHeartlandMall();
