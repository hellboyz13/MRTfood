const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Mapping of hawker centre names in CSV to mall IDs in database
const HAWKER_CENTRE_MAP = {
  'Maxwell Food Centre': 'maxwell-food-centre',
  'Tiong Bahru Market': 'tiong-bahru-food-centre',
  'Old Airport Road Food Centre': 'old-airport-road-food-centre',
  'Amoy Street Food Centre': 'amoy-street-food-centre',
  'Adam Road Food Centre': 'adam-road-food-centre',
  'Fernvale Hawker Centre': 'fernvale-hawker-centre-and-market',
  'Our Tampines Hub Hawker': 'our-tampines-hub-hawker',
  'Hong Lim Food Centre': 'hong-lim-market-and-food-centre',
  'Newton Food Centre': 'newton-food-centre',
  'Chinatown Complex Food Centre': 'chinatown-complex',
  'Bedok Interchange Hawker Centre': 'bedok-interchange-hawker-centre',
  'Ghim Moh Market Food Centre': 'ghim-moh-market-and-food-centre',
  'Bendemeer Market Food Centre': 'bendemeer-market-and-food-centre',
  'Circuit Road Hawker Centre': 'circuit-road-hawker-centre',
  'Holland Village Food Centre': 'holland-village-market-and-food-centre',
  'Kampung Admiralty Hawker Centre': 'kampung-admiralty-hawker-centre',
  'Kovan 209 Market Food Centre': 'kovan-209-market-and-food-centre',
  'Pek Kio Market Food Centre': 'pek-kio-market-and-food-centre',
  'Punggol Coast Hawker Centre': 'punggol-coast-hawker-centre',
  'Seah Im Food Centre': 'seah-im-food-centre',
  'Sembawang Hills Food Centre': 'sembawang-hills-food-centre',
  'Telok Blangah Crescent Food Centre': 'telok-blangah-food-centre',
  'Woodleigh Village Hawker Centre': 'woodleigh-village-hawker-centre'
};

// Default tags based on stall name patterns
function inferTags(stallName) {
  const tags = ['Hawker'];
  const nameLower = stallName.toLowerCase();

  // Cuisine type
  if (nameLower.includes('chicken rice') || nameLower.includes('hainanese')) tags.push('Chicken Rice');
  if (nameLower.includes('prawn') || nameLower.includes('hokkien')) tags.push('Hokkien Mee');
  if (nameLower.includes('laksa')) tags.push('Laksa');
  if (nameLower.includes('nasi lemak')) tags.push('Nasi Lemak');
  if (nameLower.includes('duck')) tags.push('Duck Rice');
  if (nameLower.includes('satay')) tags.push('Satay');
  if (nameLower.includes('carrot cake') || nameLower.includes('chai tow')) tags.push('Carrot Cake');
  if (nameLower.includes('fish') && (nameLower.includes('soup') || nameLower.includes('porridge'))) tags.push('Fish Soup');
  if (nameLower.includes('lor mee')) tags.push('Lor Mee');
  if (nameLower.includes('kway teow') || nameLower.includes('ckway teow')) tags.push('Char Kway Teow');
  if (nameLower.includes('wanton') || nameLower.includes('wonton')) tags.push('Wanton Mee');
  if (nameLower.includes('bak chor mee') || nameLower.includes('minced meat') || nameLower.includes('fishball')) tags.push('Bak Chor Mee');
  if (nameLower.includes('curry')) tags.push('Curry');
  if (nameLower.includes('biryani') || nameLower.includes('briyani')) tags.push('Indian');
  if (nameLower.includes('muslim') || nameLower.includes('halal')) tags.push('Halal');
  if (nameLower.includes('vegetarian') || nameLower.includes('veggie')) tags.push('Vegetarian');
  if (nameLower.includes('western')) tags.push('Western');
  if (nameLower.includes('coffee') || nameLower.includes('kopi') || nameLower.includes('drinks')) tags.push('Drinks');
  if (nameLower.includes('dessert') || nameLower.includes('pancake') || nameLower.includes('chendol') || nameLower.includes('kueh')) tags.push('Dessert');
  if (nameLower.includes('porridge') || nameLower.includes('congee')) tags.push('Porridge');
  if (nameLower.includes('oyster')) tags.push('Oyster Omelette');
  if (nameLower.includes('rojak') || nameLower.includes('popiah')) tags.push('Rojak');
  if (nameLower.includes('kway chap')) tags.push('Kway Chap');
  if (nameLower.includes('beef')) tags.push('Beef');
  if (nameLower.includes('pork') || nameLower.includes('bak kut teh')) tags.push('Pork');
  if (nameLower.includes('claypot')) tags.push('Claypot Rice');
  if (nameLower.includes('ban mian') || nameLower.includes('mee hoon kueh')) tags.push('Ban Mian');
  if (nameLower.includes('yong tau') || nameLower.includes('ytf')) tags.push('Yong Tau Foo');
  if (nameLower.includes('dim sum') || nameLower.includes('tim sum')) tags.push('Dim Sum');
  if (nameLower.includes('japanese') || nameLower.includes('ramen') || nameLower.includes('soba')) tags.push('Japanese');
  if (nameLower.includes('korean') || nameLower.includes('kimchi')) tags.push('Korean');
  if (nameLower.includes('thai')) tags.push('Thai');
  if (nameLower.includes('malay') || nameLower.includes('nasi') || nameLower.includes('mee rebus') || nameLower.includes('mee soto')) tags.push('Malay');
  if (nameLower.includes('indian') || nameLower.includes('prata') || nameLower.includes('vadai')) tags.push('Indian');
  if (nameLower.includes('teochew')) tags.push('Teochew');
  if (nameLower.includes('cantonese')) tags.push('Cantonese');
  if (nameLower.includes('hong kong') || nameLower.includes('hk')) tags.push('Hong Kong');

  return [...new Set(tags)]; // Remove duplicates
}

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);
}

async function importStalls() {
  console.log('='.repeat(60));
  console.log('IMPORTING HAWKER STALLS TO DATABASE');
  console.log('='.repeat(60));

  // Read CSV
  const csvPath = path.join(__dirname, '..', 'hawker-stalls.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.trim().split('\n').slice(1); // Skip header

  console.log(`\nTotal stalls in CSV: ${lines.length}`);

  // Get existing mall IDs
  const { data: malls } = await supabase.from('malls').select('id, name');
  const mallIds = new Set(malls.map(m => m.id));
  console.log(`Total hawker centres in DB: ${malls.length}`);

  // Get existing outlets to avoid duplicates
  const { data: existingOutlets } = await supabase
    .from('mall_outlets')
    .select('name, mall_id');
  const existingSet = new Set(existingOutlets.map(o => `${o.mall_id}:${o.name.toLowerCase()}`));
  console.log(`Existing outlets: ${existingOutlets.length}`);

  let inserted = 0;
  let skipped = 0;
  let noMall = 0;
  const errors = [];

  for (const line of lines) {
    // Parse CSV line (handle commas in names)
    const match = line.match(/^([^,]+),(.+),([^,]+)$/);
    if (!match) {
      console.log(`  Invalid line: ${line.substring(0, 50)}...`);
      continue;
    }

    const [, hawkerCentre, stallName, source] = match;
    const mallId = HAWKER_CENTRE_MAP[hawkerCentre];

    if (!mallId) {
      console.log(`  No mapping for: ${hawkerCentre}`);
      noMall++;
      continue;
    }

    if (!mallIds.has(mallId)) {
      console.log(`  Mall not in DB: ${mallId}`);
      noMall++;
      continue;
    }

    // Check for duplicate
    const key = `${mallId}:${stallName.toLowerCase()}`;
    if (existingSet.has(key)) {
      skipped++;
      continue;
    }

    // Generate outlet data
    const outletId = `${mallId}-${generateSlug(stallName)}-${Date.now().toString(36)}`;
    const tags = inferTags(stallName);

    const outlet = {
      id: outletId,
      name: stallName,
      mall_id: mallId,
      category: 'hawker stall',
      tags: tags,
      price_range: '$' // Default for hawker
    };

    const { error } = await supabase.from('mall_outlets').insert(outlet);

    if (error) {
      errors.push({ stallName, error: error.message });
      console.log(`  Error: ${stallName} - ${error.message}`);
    } else {
      inserted++;
      existingSet.add(key); // Prevent duplicates within this run
      console.log(`  + ${stallName} (${hawkerCentre})`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Inserted: ${inserted}`);
  console.log(`Skipped (duplicate): ${skipped}`);
  console.log(`No mall mapping: ${noMall}`);
  console.log(`Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.forEach(e => console.log(`  - ${e.stallName}: ${e.error}`));
  }
}

importStalls().catch(console.error);
