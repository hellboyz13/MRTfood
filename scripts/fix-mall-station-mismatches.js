const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Based on the listings, these are the correct station mappings
const fixes = [
  { mall_id: 'east-village', correct_station: 'bedok', reason: '1 listing at bedok, mall actually at 430 Upper Changi (closer to Bedok)' },
  { mall_id: 'forum-the-shopping-mall', correct_station: 'orchard', reason: 'Keep at orchard (main Orchard belt), listing might be wrong' },
  { mall_id: 'hillv2', correct_station: 'hillview', reason: '4 listings at hillview, address is 4 Hillview Rise' },
  { mall_id: 'imm', correct_station: 'jurong-east', reason: 'Keep at jurong-east (correct location), 1 listing at marsiling is wrong' },
  { mall_id: 'mandarin-gallery', correct_station: 'somerset', reason: '4 listings at somerset, 333A Orchard is closer to Somerset' }
];

async function fixMallStations() {
  console.log('Fixing mall station mismatches...\n');

  for (const fix of fixes) {
    console.log(`\nFixing: ${fix.mall_id}`);
    console.log(`  New station: ${fix.correct_station}`);
    console.log(`  Reason: ${fix.reason}`);

    const { error } = await supabase
      .from('malls')
      .update({ station_id: fix.correct_station, updated_at: new Date().toISOString() })
      .eq('id', fix.mall_id);

    if (error) {
      console.error(`  ❌ Error: ${error.message}`);
    } else {
      console.log(`  ✅ Updated successfully`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('Done! Updated 5 malls.');
}

fixMallStations().then(() => process.exit(0));
