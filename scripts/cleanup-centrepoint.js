const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Non-food outlets to delete
const nonFoodOutlets = [
  'Absolute Boutique Fitness Studio',
  'Accessity',
  'Amazing Speech Therapy / Recess Psychology and Coaching Centre / Headstart for Life',
  'AMB Aquatic Hub',
  'Angelique Boutique',
  'Asian Artistry',
  'Avante Gym & Yoga',
  'BBounce Studio',
  'BE U Hair Design',
  'Beautique',
  'Belle Watch',
  'Best Imprezzione',
  'Bioskin',
  'Bratpack',
  'Cardboard Collectible',
  'Carousell Luxury',
  'Cellini',
  'Chrysalis Spa',
  'Clariti - Hearing Care Professionals',
  'Clearlab',
  'Coslab',
  'Customer Service Counter (The Centrepoint)',
  'Decathlon',
  'Diamond Ateliers',
  'DLUSH.SG',
  'DrScalp',
  'Eclado',
  'Elements Wellness',
  'Flower Matters',
  'FREE Skin & Body Perfect',
  'GEOX',
  'Guardian',
  'Guo Tai TCM Rehab & Wellness Centre',
  'HAACH',
  'Healing Touch Spa',
  'Healthway Japanese Medical',
  'Healthway Screening @ Centrepoint',
  'House of Cars',
  'Hush Puppies',
  'iClaw Taiwan',
  'Imago Aesthetic',
  'Map',
  'Amazing Speech Therapy Recess Psychology And Coaching Centre Headstart For Life',
  'Avante Gym And Yoga',
  'Bottles And Bottles',
  'Clariti Hearing Care Professionals',
  'Customer Service Counter The Centrepoint',
  'Dlush Sg',
  'Headstart For Life',
  'Guo Tai Tcm Rehab   Wellness Centre',
  'A minimalist',
  'A',
];

async function main() {
  console.log('=== CLEANING UP NON-FOOD OUTLETS FROM THE CENTREPOINT ===\n');

  // Get all Centrepoint outlets
  const { data: outlets } = await supabase
    .from('mall_outlets')
    .select('id, name')
    .eq('mall_id', 'the-centrepoint');

  console.log(`Total outlets in DB: ${outlets?.length || 0}`);

  // Find non-food outlets to delete
  const toDelete = outlets?.filter(o =>
    nonFoodOutlets.some(nf =>
      o.name.toLowerCase() === nf.toLowerCase() ||
      o.name.toLowerCase().includes('fitness') ||
      o.name.toLowerCase().includes('spa') ||
      o.name.toLowerCase().includes('therapy') ||
      o.name.toLowerCase().includes('screening') ||
      o.name.toLowerCase().includes('medical') ||
      o.name.toLowerCase().includes('wellness') ||
      o.name.toLowerCase().includes('aesthetic')
    )
  ) || [];

  console.log(`\nNon-food outlets to delete: ${toDelete.length}`);
  toDelete.forEach(o => console.log(`  - ${o.name}`));

  if (toDelete.length > 0) {
    const ids = toDelete.map(o => o.id);
    const { error } = await supabase
      .from('mall_outlets')
      .delete()
      .in('id', ids);

    if (error) {
      console.log('\nError:', error.message);
    } else {
      console.log(`\nDeleted ${toDelete.length} non-food outlets`);
    }
  }

  // Show remaining outlets
  const { data: remaining } = await supabase
    .from('mall_outlets')
    .select('name, level')
    .eq('mall_id', 'the-centrepoint')
    .order('name');

  console.log(`\n=== REMAINING F&B OUTLETS: ${remaining?.length || 0} ===`);
  remaining?.forEach(o => console.log(`  - ${o.name} ${o.level ? '(' + o.level + ')' : ''}`));
}

main().catch(console.error);
