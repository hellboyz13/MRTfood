// Remove MEDIUM confidence mall outlet duplicates
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Medium confidence duplicates (Guide name -> Mall outlet to remove)
const mediumConfidencePairs = [
  { guide: 'Haidilao', mall: 'Haidilao Hot Pot', station: 'bayfront' },
  { guide: 'Danji Korean BBQ', mall: 'Danji Korean BBQ Buffet (Chinatown Point)', station: 'chinatown' },
  { guide: 'Aziz Jaffar Muslim Food', mall: 'Muslim Food @ People\'s Park', station: 'chinatown' },
  { guide: 'Homm Dessert', mall: 'Homm Dessert at Heart', station: 'city-hall' },
  { guide: 'The Glasshouse', mall: 'Glasshouse', station: 'city-hall' },
  { guide: 'Co Chung Vietnamese', mall: 'Co Chung', station: 'dhoby-ghaut' },
  { guide: 'Spicy Wife', mall: 'Spicy Wife Nasi Lemak', station: 'maxwell' },
  { guide: 'Hum Jin Pang', mall: 'China Street Hum Jin Pang', station: 'maxwell' },
  { guide: 'Heng Carrot Cake', mall: 'Heng Carrot Cake & Oyster Omelette', station: 'newton' },
  { guide: 'Kwee Heng', mall: 'Kwee Heng Duck Noodle', station: 'newton' },
  { guide: 'Yakiniku Gyubei', mall: 'Yakiniku Gyubei – Itadakimasu by PARCO', station: 'tanjong-pagar' },
  { guide: 'The Public Izakaya', mall: 'The Public Izakaya by Hachi', station: 'tanjong-pagar' },
  { guide: 'Ramen Keisuke Tori King', mall: 'Ramen Keisuke Tori King – Itadakimasu by PARCO', station: 'tanjong-pagar' },
];

async function removeMediumDuplicates() {
  console.log('Removing 13 MEDIUM confidence mall outlet duplicates...\n');

  // Get all mall outlets with their station info
  const { data: outlets } = await supabase
    .from('mall_outlets')
    .select(`id, name, malls!inner (station_id)`);

  const toDelete = [];

  for (const pair of mediumConfidencePairs) {
    const match = outlets.find(o =>
      o.name === pair.mall &&
      o.malls?.station_id === pair.station
    );

    if (match) {
      toDelete.push({ id: match.id, name: match.name, guide: pair.guide });
      console.log(`✓ Found: "${match.name}" (keeping Guide: "${pair.guide}")`);
    } else {
      console.log(`✗ Not found: "${pair.mall}" at ${pair.station}`);
    }
  }

  if (toDelete.length > 0) {
    console.log(`\nDeleting ${toDelete.length} mall outlets...`);

    const { error } = await supabase
      .from('mall_outlets')
      .delete()
      .in('id', toDelete.map(d => d.id));

    if (error) {
      console.error('Error:', error);
    } else {
      console.log(`✅ Successfully deleted ${toDelete.length} medium confidence duplicates`);
    }
  }
}

removeMediumDuplicates().catch(console.error);
