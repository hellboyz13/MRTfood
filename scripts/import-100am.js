const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MALL_ID = '100-am';

const outlets = [
  { name: 'Jian Cha', unit: '#01-11' },
  { name: 'Luckin Coffee', unit: '#01-13A' },
  { name: 'Mincheng Bibimbap', unit: '#01-06' },
  { name: 'Mos Burger', unit: '#01-12' },
  { name: 'Muffin Homme', unit: '#01-07' },
  { name: 'Nanyang Dao', unit: '#01-04' },
  { name: 'Pullman Bakery', unit: '#01-03' },
  { name: 'So Good Bakery', unit: '#01-10 & 14A' },
  { name: 'Subway', unit: '#01-15' },
  { name: 'Sweet Dots Desserts', unit: '#03-16' },
  { name: 'Takagi Cafe', unit: '#01-14B' },
  { name: 'The Whale Tea', unit: '#01-15A' },
  { name: 'Ya Kun Kaya Toast', unit: '#02-16 & 27A' },
  { name: 'Henri Charpentier', unit: '#01-13' },
  { name: 'Hoe Nam Prawn Noodles House', unit: '#02-09' },
  { name: 'Hvala Kissa', unit: '#01-05' },
  { name: 'Iki Soba', unit: '#02-15/28' },
  { name: 'Ma Maison – Itadakimasu by PARCO', unit: '#02-11' },
  { name: 'Maguro Brothers – Itadakimasu by PARCO', unit: '#03-K1' },
  { name: 'Menya Kokoro (Mazesoba) & Emma – Itadakimasu by PARCO', unit: '#02-10' },
  { name: 'Ramen Keisuke Tori King – Itadakimasu by PARCO', unit: '#03-15' },
  { name: 'Spicy Chef – Hunan Cuisine', unit: '#02-14A/B/C' },
  { name: 'Tachibana', unit: '#03-13' },
  { name: 'The Public Izakaya by Hachi', unit: '#01-08/08A/09' },
  { name: 'The Tree Cafe', unit: '#01-01' },
  { name: 'Yakiniku Gyubei – Itadakimasu by PARCO', unit: '#03-11' },
  { name: 'Yakitori GO GO FIVE – Itadakimasu by PARCO', unit: '#03-10' },
  { name: 'YAYOI – Itadakimasu by PARCO', unit: '#03-12' },
  { name: 'Zhang Liang Malatang', unit: '#02-17/18/19/20/21' }
];

function getCategory(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('coffee') || nameLower.includes('café') || nameLower.includes('cafe') ||
      nameLower.includes('kissa') || nameLower.includes('tree cafe')) {
    return 'cafe, food';
  }
  if (nameLower.includes('bakery') || nameLower.includes('pullman')) {
    return 'bakery, food';
  }
  if (nameLower.includes('tea') || nameLower.includes('cha')) {
    return 'drinks, food';
  }
  if (nameLower.includes('dessert') || nameLower.includes('sweet') || nameLower.includes('charpentier')) {
    return 'desserts, food';
  }
  if (nameLower.includes('burger') || nameLower.includes('subway')) {
    return 'fast food, food';
  }
  if (nameLower.includes('ramen') || nameLower.includes('soba') || nameLower.includes('yakiniku') ||
      nameLower.includes('yakitori') || nameLower.includes('yayoi') || nameLower.includes('maguro') ||
      nameLower.includes('izakaya') || nameLower.includes('tachibana') || nameLower.includes('menya')) {
    return 'japanese, food';
  }
  if (nameLower.includes('bibimbap') || nameLower.includes('korean')) {
    return 'korean, food';
  }
  if (nameLower.includes('malatang') || nameLower.includes('hunan') || nameLower.includes('spicy chef')) {
    return 'chinese, food';
  }
  if (nameLower.includes('ma maison')) {
    return 'western, food';
  }
  if (nameLower.includes('prawn noodle') || nameLower.includes('ya kun') || nameLower.includes('nanyang')) {
    return 'local, food';
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
    + '-100-am';
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
    // Partial match fallback for thumbnails
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

async function import100AM() {
  console.log('=== IMPORTING 100AM MALL ===\n');

  // Check if mall exists
  const { data: mall } = await supabase
    .from('malls')
    .select('id')
    .eq('id', MALL_ID)
    .single();

  if (!mall) {
    console.log('Mall "100am" not found in database. Please add the mall first.');
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

import100AM();
