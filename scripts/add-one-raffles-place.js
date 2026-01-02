const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const outlets = [
  { name: 'ammākase', unit: '#04-48' },
  { name: 'AO3 By Avenue On 3', unit: '#B1-27' },
  { name: 'Cha Re Re', unit: '#B1-19' },
  { name: 'CHAGEE', unit: '#01-01/14/15' },
  { name: 'Chuan Tai Zi Mala Tang', unit: '#B1-04/05' },
  { name: 'City Hot Pot Shabu Shabu', unit: '#04-26 to 28' },
  { name: 'Compose Coffee', unit: '#01-02' },
  { name: 'Fun Toast', unit: '#B1-02' },
  { name: 'Gin Khao', unit: '#04-29/30' },
  { name: 'Gochi-so Shokudo & Tun Xiang Hokkien Delights', unit: '#B1-30/32' },
  { name: 'GreenDot', unit: '#03-23/24/25' },
  { name: 'Healthy Soba IKI', unit: '#04-47' },
  { name: 'JoAh Korean Restaurant', unit: '#03-21/22' },
  { name: 'Namino Hana', unit: '#B1-23' },
  { name: 'Nasi Lemak Ayam Taliwang', unit: '#B1-20' },
  { name: 'Pasta Express', unit: '#B1-18' },
  { name: 'Patrons', unit: '#B1-17' },
  { name: 'Polar Café', unit: '#B1-01' },
  { name: 'Qin Ji Rougamo', unit: '#B1-28/29' },
  { name: 'Souperstar', unit: '#B1-11' },
  { name: 'Steam by Local Coffee People', unit: '#02-27' },
  { name: 'Subway', unit: '#02-24' },
  { name: 'Taylor Adam', unit: '#01-03' },
  { name: 'The Daily Cut', unit: '#B1-31' },
  { name: 'Tim Hortons', unit: '#01-11/12' },
  { name: 'Umisushi', unit: '#B1-24/25' },
  { name: 'Upshot Coffee', unit: '#04-31' },
  { name: 'Urban Mix', unit: '#B1-01A' },
  { name: 'Vibe', unit: '#01-04/5/6' },
  { name: 'Xin Yuan Ji', unit: '#B1-16' },
  { name: 'Y Cafe', unit: '#02-28' },
  { name: 'Ya Kun Kaya Toast', unit: '#B1-13' },
];

async function main() {
  console.log('=== ADDING ONE RAFFLES PLACE OUTLETS ===\n');

  // Check existing
  const { data: existing } = await supabase
    .from('mall_outlets')
    .select('name')
    .eq('mall_id', 'one-raffles-place');

  const existingNames = new Set(existing?.map(e => e.name.toLowerCase()) || []);
  const toInsert = outlets.filter(o => !existingNames.has(o.name.toLowerCase()));

  console.log(`Existing: ${existingNames.size}, To insert: ${toInsert.length}\n`);

  if (toInsert.length === 0) {
    console.log('All outlets already exist!');
    return;
  }

  const records = toInsert.map(o => ({
    name: o.name,
    mall_id: 'one-raffles-place',
    level: o.unit
  }));

  const { data, error } = await supabase
    .from('mall_outlets')
    .insert(records)
    .select('id, name');

  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log(`Inserted ${data.length} outlets:`);
    data.forEach(d => console.log(`  + ${d.name}`));
  }
}

main().catch(console.error);
