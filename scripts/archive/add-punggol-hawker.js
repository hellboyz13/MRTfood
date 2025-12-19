const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MALL_ID = 'one-punggol-hawker-centre';

// Hawker stalls from user's list
const hawkerStalls = [
  { stall: '#02-28', name: '115 Tai Ho Jiak', specialty: 'Western Food' },
  { stall: '#02-13', name: '75 Ah Balling', specialty: 'Tang Yuan' },
  { stall: '#02-35', name: 'Amoy Ban Mian', specialty: 'Ban Mian' },
  { stall: '#02-14', name: 'Botak Cantonese Porridge', specialty: 'Porridge' },
  { stall: '#02-12', name: 'Changi Village Hokkien Mee', specialty: 'Hokkien Mee' },
  { stall: '#02-20', name: 'Chwee Kueh', specialty: 'Chwee Kueh' },
  { stall: '#02-31', name: 'Cut Fruits', specialty: 'Desserts' },
  { stall: '#02-34', name: 'Eng Kee Chicken Wing', specialty: 'Economic Bee Hoon' },
  { stall: '#02-18', name: 'Fei Zhuang Yuan', specialty: 'Herbal Bak Kut Teh' },
  { stall: '#02-27', name: 'Fuyuan Mala Xiang Guo', specialty: 'Mala' },
  { stall: '#02-25', name: 'Guo Qin Noodle', specialty: 'Wanton Noodle' },
  { stall: '#02-09', name: 'Hi Leskmi Whampoa Nasi Lemak', specialty: 'Nasi Lemak' },
  { stall: '#02-16', name: 'Jin Kimchi', specialty: 'Korean' },
  { stall: '#02-19', name: 'Kwang Kee Fish Porridge', specialty: 'Fish Soup' },
  { stall: '#02-22', name: 'Le Yuan Noodles', specialty: 'Chinese Noodles' },
  { stall: '#02-26', name: 'LeiPoPo', specialty: 'Chinese' },
  { stall: '#02-36', name: 'Munchi Pancakes', specialty: 'Pancakes' },
  { stall: '#02-17', name: 'OBBA Jjajang', specialty: 'Korean' },
  { stall: '#02-10', name: 'POKEQPAN', specialty: 'Japanese Teppanyaki Bento' },
  { stall: '#02-23/24', name: 'Pot Master', specialty: 'Claypot Rice' },
  { stall: '#02-02', name: 'Punggol Roti Prata', specialty: 'Prata & Indian Rojak' },
  { stall: '#02-07', name: 'Punjabi Dhaba', specialty: 'Punjabi Food (Halal)' },
  { stall: '#02-08', name: 'Rendang Nation', specialty: 'Malay Food, Nasi Padang' },
  { stall: '#02-03', name: 'Shahith Ar-Raheeq', specialty: 'Indian Muslim Food (Halal)' },
  { stall: '#02-29', name: 'Souperb', specialty: 'Tonic Soup' },
  { stall: '#02-04', name: 'Tian Tian Dian Xin', specialty: 'Dim Sum' },
  { stall: '#02-05', name: 'Timbre Pizza', specialty: 'Modern Pizzas' },
  { stall: '#02-32/33', name: 'Tuckshop', specialty: 'Mixed Hawker Fare' },
  { stall: '#02-01', name: 'Uncle Penyet', specialty: 'Ayam Penyet' },
  { stall: '#02-21', name: 'Yi Ru Heng Economic Rice', specialty: 'Economical Rice' },
  { stall: '#02-15', name: 'Zi Jia Yong Tau Foo', specialty: 'Yong Tau Foo' },
];

function getCategory(specialty) {
  const s = specialty.toLowerCase();
  if (s.includes('korean')) return 'korean, food';
  if (s.includes('japanese') || s.includes('bento')) return 'japanese, food';
  if (s.includes('malay') || s.includes('nasi') || s.includes('padang') || s.includes('ayam')) return 'malay, food';
  if (s.includes('indian') || s.includes('prata') || s.includes('halal') || s.includes('punjabi')) return 'indian, food';
  if (s.includes('chinese') || s.includes('porridge') || s.includes('noodle') || s.includes('claypot') || s.includes('dim sum') || s.includes('mala')) return 'chinese, food';
  if (s.includes('dessert') || s.includes('tang yuan') || s.includes('pancake')) return 'desserts, food';
  if (s.includes('western') || s.includes('pizza')) return 'western, food';
  if (s.includes('soup') || s.includes('fish soup') || s.includes('tonic')) return 'chinese, food';
  return 'hawker, food';
}

function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-punggol-hc';
}

async function checkAndAddStalls() {
  console.log('=== ONE PUNGGOL HAWKER CENTRE STALLS ===\n');

  // First check if hawker centre exists as a mall
  const { data: mall } = await supabase
    .from('malls')
    .select('*')
    .eq('id', MALL_ID)
    .single();

  if (!mall) {
    console.log('Hawker centre not in malls table. Need to add it first.\n');
    console.log('Required mall details:');
    console.log('  - id: one-punggol-hawker-centre');
    console.log('  - name: One Punggol Hawker Centre');
    console.log('  - address: 1 Punggol Dr., Level 2, Singapore 828629');
    console.log('  - nearest_mrt: Punggol');
    console.log('  - latitude: 1.408');
    console.log('  - longitude: 103.905');
    console.log('  - website: https://onepunggolhc.sg/');
    console.log('\nDo you want me to add this mall first? (Check malls table structure)\n');

    // Check malls table structure
    const { data: sample } = await supabase.from('malls').select('*').limit(1);
    if (sample && sample[0]) {
      console.log('Malls table columns:', Object.keys(sample[0]));
    }
    return;
  }

  // Get existing outlets at the hawker centre
  const { data: existing } = await supabase
    .from('mall_outlets')
    .select('name')
    .eq('mall_id', MALL_ID);

  const existingNames = new Set((existing || []).map(e => e.name.toLowerCase()));
  console.log(`Existing outlets: ${existingNames.size}`);

  // Find missing stalls
  const missing = [];
  for (const stall of hawkerStalls) {
    const nameLower = stall.name.toLowerCase();
    let found = false;
    for (const existing of existingNames) {
      if (existing.includes(nameLower) || nameLower.includes(existing.split(' ')[0])) {
        found = true;
        break;
      }
    }
    if (!found) {
      missing.push(stall);
    }
  }

  console.log(`Missing stalls: ${missing.length}\n`);

  if (missing.length > 0) {
    console.log('Stalls to add:');
    missing.forEach(s => console.log(`  - ${s.stall} ${s.name} (${s.specialty})`));
  }
}

checkAndAddStalls();
