// Remove remaining TRUE duplicate mall outlets
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// True duplicates to remove (mall outlet names with station)
const trueDuplicates = [
  // City Hall
  { mall: 'Poulét ', station: 'city-hall' },  // Note: has trailing space in DB
  { mall: 'PUTIEN Restaurant', station: 'city-hall' },

  // Changi Airport
  { mall: 'Kantin', station: 'changi-airport' },

  // HarbourFront
  { mall: 'Farasha Muslim Food', station: 'harbourfront' },

  // Maxwell
  { mall: 'Ah Tai Hainanese Chicken Rice', station: 'maxwell' },
  { mall: 'Fu Shun Jin Ji Shao La Mian Jia', station: 'maxwell' },
  { mall: 'Han Kee Fish Soup', station: 'maxwell' },
  { mall: 'Lian He Ben Ji Claypot Rice', station: 'maxwell' },

  // Somerset
  { mall: '5:59', station: 'somerset' },

  // Upper Thomson
  { mall: 'Omoté', station: 'upper-thomson' },

  // Woodleigh
  { mall: 'Style Palate', station: 'woodleigh' },

  // Punggol Coast
  { mall: 'Hakka Leipopo', station: 'punggol-coast' },
  { mall: "Jade's Chicken", station: 'punggol-coast' },

  // Botanic Gardens
  { mall: "No. 1 Adam's Nasi Lemak", station: 'botanic-gardens' },
];

async function removeDuplicates() {
  console.log('Removing remaining TRUE duplicate mall outlets...\n');

  // Get all mall outlets with their station info
  const { data: outlets } = await supabase
    .from('mall_outlets')
    .select(`id, name, malls!inner (station_id, name)`);

  const toDelete = [];

  for (const dup of trueDuplicates) {
    const match = outlets.find(o =>
      o.name === dup.mall &&
      o.malls?.station_id === dup.station
    );

    if (match) {
      toDelete.push({ id: match.id, name: match.name, mall: match.malls?.name });
      console.log(`✓ Found: "${match.name}" @ ${match.malls?.name}`);
    } else {
      // Try partial match for names with trailing spaces
      const partialMatch = outlets.find(o =>
        o.name.trim() === dup.mall.trim() &&
        o.malls?.station_id === dup.station
      );
      if (partialMatch) {
        toDelete.push({ id: partialMatch.id, name: partialMatch.name, mall: partialMatch.malls?.name });
        console.log(`✓ Found (trimmed): "${partialMatch.name}" @ ${partialMatch.malls?.name}`);
      } else {
        console.log(`✗ Not found: "${dup.mall}" at ${dup.station}`);
      }
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
      console.log(`✅ Successfully deleted ${toDelete.length} duplicate mall outlets`);
    }
  } else {
    console.log('\nNo outlets to delete.');
  }
}

removeDuplicates().catch(console.error);
