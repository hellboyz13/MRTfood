const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Shaw Centre mappings
const shawCentreMapping = {
  'mui kee': '#03-09',
  'tarte by cheryl koh': '#02-05/06/07',
  'food republic': '#B1-02',
  'bistro du vin': '#01-14',
  'shabu jin': '#01-15',
  'les amis restaurant': '#01-16/17/18',
  'la taperia wine & tapas': '#02-08/09/10/11',
  'la taperia': '#02-08/09/10/11',
  'jinjo': '#02-18/19/20',
  'tenjin': '#01-11',
  'xi yan': '#03-12/13',
  'the ship restaurant & bar': '#03-16/17/18',
  '8 korean bbq': '#04-20/21',
  'ippudo sg': '#04-22',
  'bar ippudo': '#04-23',
  'picolino': '#03-23/24',
  'sushi ryujiro': '#01-19',
  'wagyu jin': '#02-12/13',
  'sushi jin': '#01-11',
  'scotts grill': '#01-13',
  'torijin': '#03-08',
  'zeniya': '#03-07',
  'unagi yondaime kikukawa': '#03-05/06',
  'fi woodfire thai': '#03-04',
};

// Wheelock Place mappings
const wheelockPlaceMapping = {
  'breadtalk': '#B2-01',
  'cafe bakeaholic': '#02-19',
  'cafe at zall bookstore': '#01-02/03',
  'cafe at the zall bookstore': '#01-02/03',
  'chicha san chen': '#B1-05',
  'chicha san chen (吃茶三千)': '#B1-05',
  'cedele': '#03-13A/14',
  'cedele all day dining': '#03-13A/14',
  'kei kaisendon': '#B1-05A',
  'm&s cafe': '#01-K2',
  'm&s café': '#01-K2',
  'namnam noodle bar': '#B2-02',
  'pistachio middle eastern & mediterranean grill': '#02-04/05',
  'prive': '#01-K1',
  'privé': '#01-K1',
  'starbucks': '#B1-01',
  'sun with moon japanese dining & cafe': '#03-15/16/17',
  'sun with moon japanese dining & café': '#03-15/16/17',
  'the humble pie & the ugly cake shop': '#02-01A',
  'toast box': '#B2-01',
  'uya 四代目菊川': '#02-15/16',
  'delifrance': '#B1-03',
  'délifrance': '#B1-03',
  'style by style vibes cafe': '#02-08',
  'style by style vibes café': '#02-08',
};

// Waterway Point mappings
const waterwayPointMapping = {
  'chagee': '#01-42',
  'buddy hoagies cafe & grill': '#02-22',
  'buddy hoagies café & grill': '#02-22',
  'byd by 1826': '#01-70',
  'daily chicken': '#01-66',
  'burger king': '#01-26',
  'delifrance': '#01-17B',
  'délifrance': '#01-17B',
  'ajummas': '#B1-14',
  "ajumma's": '#B1-14',
  'din tai fung': '#01-22',
  'a-one signature': '#01-92',
  'cedele bakery kitchen': '#01-17',
  'fish & co': '#B1-18',
  'fish & co.': '#B1-18',
  'gong yuan ma la tang': '#02-21',
  'starbucks': '#01-67',
};

// Sun Plaza mappings
const sunPlazaMapping = {
  'bakeinc': '#01-20',
  'bengawan solo': '#B1-15/16',
  'four leaves': '#B1-30',
  'fragrance bak kwa': '#B1-14',
  'fruitbox': '#B1-40',
  'gyoza-san': '#B1-10',
  'the home restaurant': '#B1-19',
  'the home restaurant 回味之家': '#B1-19',
  'mr bean': '#B1-28',
  'nine fresh': '#B1-36',
  'ordinary burgers': '#B1-31',
  'r&b tea': '#B1-38',
  'r&b 巡茶': '#B1-38',
  'koong woh tong': '#B1-29',
  'koong woh tong 恭和堂': '#B1-29',
  'men men don don': '#B1-12/13',
  'pontian wanton noodles': '#B1-32/33/37',
};

// SingPost Centre mappings
const singpostMapping = {
  "carl's jr": '#03-105',
  'carls jr': '#03-105',
  'bai wei mini bowl': '#03-103',
  'bibimbap': '#B1-154',
  'bibimbap!': '#B1-154',
  'chicken hotpot': '#B1-155',
  'grab & gold cafe': '#03-107',
  'grab & gold® café': '#03-107',
  'kaffe & toast / thai noodle bar': '#B1-157',
  'kaffe & toast thai noodle bar': '#B1-157',
  'hjh maimunah': '#B1-160/161',
};

// AMK Hub mappings
const amkHubMapping = {
  'ya kun kaya toast': '#B1-63',
  'ya kun kaya toast (amk hub)': '#B1-63',
  'toast box': '#01-01/02',
  'toast box (amk hub)': '#01-01/02',
  'daxi': '#B1-19/20',
  'daxi - amk hub': '#B1-19/20',
};

// Clarke Quay mappings
const clarkeQuayMapping = {
  'coco lato': '#01-13 Blk D',
  'kopi & spells': '#01-01 Blk C',
  'malayan settlement': '#01-03',
};

// Our Tampines Hub mappings
const ourTampinesHubMapping = {
  'shake shake in a tub': '#B1-K11',
  'shake shake in a tub - tampine hub': '#B1-K11',
  'fish & co': '#01-102',
  'fish & co.': '#01-102',
  'fish & co. our tampines hub': '#01-102',
  'dutch colony coffee co': '#01-103',
  'dutch colony coffee co.': '#01-103',
};

// Jurong Point mappings
const jurongPointMapping = {
  'ghost kakigori': '#B1-78',
  'ghost kakigori (jurong point)': '#B1-78',
};

// Normalize name for matching
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[®™©]/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[&]/g, 'and')
    .replace(/['']/g, "'")
    .replace(/[""]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Find unit number
function findUnit(name, mallId) {
  const normalized = normalizeName(name);
  const nameLower = name.toLowerCase().trim();

  let mapping = null;
  switch (mallId) {
    case 'shaw-centre':
      mapping = shawCentreMapping;
      break;
    case 'wheelock-place':
      mapping = wheelockPlaceMapping;
      break;
    case 'waterway-point':
      mapping = waterwayPointMapping;
      break;
    case 'sun-plaza':
      mapping = sunPlazaMapping;
      break;
    case 'singpost-centre':
      mapping = singpostMapping;
      break;
    case 'amk-hub':
      mapping = amkHubMapping;
      break;
    case 'clarke-quay':
      mapping = clarkeQuayMapping;
      break;
    case 'our-tampines-hub':
      mapping = ourTampinesHubMapping;
      break;
    case 'jurong-point':
      mapping = jurongPointMapping;
      break;
    default:
      return null;
  }

  if (!mapping) return null;

  // Direct match
  if (mapping[nameLower]) return mapping[nameLower];
  if (mapping[normalized]) return mapping[normalized];

  // Try partial match
  for (const [key, value] of Object.entries(mapping)) {
    const keyNorm = normalizeName(key);
    if (keyNorm.includes(normalized) || normalized.includes(keyNorm)) {
      return value;
    }
  }

  return null;
}

async function main() {
  // Read the CSV
  const csvContent = fs.readFileSync('weird-units.csv', 'utf-8');
  const lines = csvContent.trim().split('\n');
  const rows = lines.slice(1);

  console.log(`Read ${rows.length} rows from CSV`);

  // Find outlets that need updating
  const updates = [];
  const supported = ['shaw-centre', 'wheelock-place', 'waterway-point', 'sun-plaza',
                     'singpost-centre', 'amk-hub', 'clarke-quay', 'our-tampines-hub', 'jurong-point'];

  for (const line of rows) {
    const match = line.match(/^"([^"]*?)","([^"]*?)","([^"]*?)","([^"]*?)"$/);
    if (!match) continue;

    const [, id, name, mallId, level] = match;

    // Skip if already has level or not a supported mall
    if (level && level.trim() && level.trim() !== '-' && level.trim() !== '') continue;
    if (!supported.includes(mallId)) continue;

    const unit = findUnit(name, mallId);
    if (unit) {
      updates.push({ id, name, mallId, level: unit });
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

  for (const update of updates) {
    const { data, error } = await supabase
      .from('mall_outlets')
      .update({ level: update.level })
      .eq('id', update.id)
      .select();

    if (error) {
      console.error(`Failed to update ${update.id}: ${error.message}`);
      failed++;
    } else if (!data || data.length === 0) {
      console.log(`Not found: ${update.id} (${update.name})`);
      notFound++;
    } else {
      updated++;
      console.log(`Updated: ${update.name} (${update.mallId}) -> ${update.level}`);
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Updated: ${updated}`);
  console.log(`Not found: ${notFound}`);
  console.log(`Failed: ${failed}`);
}

main().catch(console.error);
