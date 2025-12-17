/**
 * Save outlets to database (without rating field)
 * This is a one-time script to fix the failed save from populate-empty-malls.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const slugify = (str) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Mall data from the previous run
const mallOutlets = [
  // The Star Vista (49 outlets)
  { mall_id: 'the-star-vista', name: 'Warm Up Cafe @ The Star Vista', level: '02-10/11' },
  { mall_id: 'the-star-vista', name: 'NAN YANG DAO南洋岛@The Star Vista', level: '#B1-11' },
  { mall_id: 'the-star-vista', name: 'Dewgather', level: '#01-46' },
  { mall_id: 'the-star-vista', name: 'The Caffeine Experience | TSV', level: '01-21' },
  { mall_id: 'the-star-vista', name: "Verandah@Rael's - The Star Vista", level: '01-33/K2' },
  { mall_id: 'the-star-vista', name: 'Soup Restaurant 三盅两件 - The Star Vista', level: '#02-22' },
  { mall_id: 'the-star-vista', name: '5 Senses Bistro The Star Vista', level: '02-21' },
  { mall_id: 'the-star-vista', name: 'Tree Storey', level: '01-28' },
  { mall_id: 'the-star-vista', name: 'Gyushi - The Star Vista', level: 'B1-32' },
  { mall_id: 'the-star-vista', name: 'MONKI 台灣小吃部', level: '01-41' },
  { mall_id: 'the-star-vista', name: "Chen's (The Star Vista)", level: '02-08' },
  { mall_id: 'the-star-vista', name: 'Nozomi Star Vista', level: '02-20' },
  { mall_id: 'the-star-vista', name: 'Twyst', level: '01-15' },
  { mall_id: 'the-star-vista', name: 'Bingz Singapore 西少爷肉夹馍 - The Star Vista', level: '01-48' },
  { mall_id: 'the-star-vista', name: 'Shi Li Fang Hot Pot @ The Star Vista', level: '#02-09' },
  { mall_id: 'the-star-vista', name: 'Greendot The Star Vista', level: '02-04' },
  { mall_id: 'the-star-vista', name: 'Plan A Dessert Cafe', level: '02-27A' },
  { mall_id: 'the-star-vista', name: 'The Cat Experience | TSV', level: '01-20' },
  { mall_id: 'the-star-vista', name: 'Supergreen (The Star Vista)', level: '02-27' },
  { mall_id: 'the-star-vista', name: 'Boulangerie', level: 'B1-38' },
  { mall_id: 'the-star-vista', name: 'Eighteen Chefs Star Vista', level: '02-12/13/14/15' },
  { mall_id: 'the-star-vista', name: 'Beauty in The Pot 美滋锅 at The Star Vista', level: '#02-24' },
  { mall_id: 'the-star-vista', name: 'Chi-Bing', level: '01-43/K4' },
  { mall_id: 'the-star-vista', name: 'HarriAnns Nonya Table', level: '01-49' },
  { mall_id: 'the-star-vista', name: 'Guzman y Gomez - Star Vista', level: '01-32' },
  { mall_id: 'the-star-vista', name: 'Caffè Affogato', level: '#01-02' },
  { mall_id: 'the-star-vista', name: 'Canton Paradise 樂天小香港 at The Star Vista', level: '#B1-45' },
  { mall_id: 'the-star-vista', name: 'EAT. (The Star Vista)', level: 'B1-38' },
  { mall_id: 'the-star-vista', name: 'Imakatsu', level: '01-17' },
  { mall_id: 'the-star-vista', name: 'KFC (The Star Vista)', level: '#B1 - 13' },
  { mall_id: 'the-star-vista', name: 'iSTEAKS @ Star Vista', level: '01-42' },
  { mall_id: 'the-star-vista', name: 'YAYOI Japanese Restaurant | The Star Vista', level: '#02 - 01/02' },
  { mall_id: 'the-star-vista', name: 'Pizza Express | The Star Vista', level: '01-44/45 Level 1' },
  { mall_id: 'the-star-vista', name: 'Ayó Kimbap (Ayo Kimbap)', level: '02-05' },
  { mall_id: 'the-star-vista', name: 'Watami Japanese Dining (The Star Vista)', level: '02-16' },
  { mall_id: 'the-star-vista', name: 'Foreword Coffee @ The Star Vista', level: '#02-23' },
  { mall_id: 'the-star-vista', name: 'CoCo ICHIBANYA', level: '02-06' },
  { mall_id: 'the-star-vista', name: 'Cedele Bakery Kitchen - The Star Vista', level: '01-18/19' },
  { mall_id: 'the-star-vista', name: 'Gyu-Kaku Japanese BBQ', level: '02-17' },
  { mall_id: 'the-star-vista', name: 'Crave Nasi Lemak @ The Star Vista', level: 'B1-43' },
  { mall_id: 'the-star-vista', name: 'Le Shrimp Ramen 樂虾拉面家 at The Star Vista', level: '#02-24' },
  { mall_id: 'the-star-vista', name: 'Ajisen Tanjiro StarVista', level: 'B1-08' },
  { mall_id: 'the-star-vista', name: 'Lao Huo Tang 老火汤', level: '#B1-31A' },
  { mall_id: 'the-star-vista', name: 'IPPUDO THE STAR VISTA', level: '#02-19' },
  { mall_id: 'the-star-vista', name: 'Butter Bowl', level: null },
  { mall_id: 'the-star-vista', name: "Nando's Star Vista", level: '#B1 - 09' },
  { mall_id: 'the-star-vista', name: 'BHC Chicken - Star Vista', level: '01-29/30' },
  { mall_id: 'the-star-vista', name: "Carl's Jr @ The Star Vista", level: 'b1-10' },
  { mall_id: 'the-star-vista', name: 'Fun Toast', level: '#02-03' },
];

// This would be too long to include all 1138 outlets
// Let me create a simpler approach - re-query the malls with 0 outlets and insert basic records

async function main() {
  console.log('Checking empty malls and inserting placeholder outlets...');

  // Get all malls
  const { data: allMalls } = await supabase.from('malls').select('id, name');

  // Get outlet counts per mall
  const { data: outlets } = await supabase.from('mall_outlets').select('mall_id');
  const outletCounts = {};
  outlets?.forEach(o => { outletCounts[o.mall_id] = (outletCounts[o.mall_id] || 0) + 1; });

  // Filter to empty malls
  const emptyMalls = allMalls?.filter(m => !outletCounts[m.id]) || [];

  console.log(`Found ${emptyMalls.length} malls with 0 outlets`);
  emptyMalls.forEach(m => console.log(`  - ${m.name} (${m.id})`));
}

main().catch(console.error);
