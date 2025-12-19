/**
 * Check empty malls and estimate API costs
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  // Get all malls
  const { data: malls } = await supabase.from('malls').select('id, name');

  // Get outlet counts per mall
  const { data: outlets } = await supabase.from('mall_outlets').select('mall_id');

  const counts = {};
  outlets.forEach(o => {
    counts[o.mall_id] = (counts[o.mall_id] || 0) + 1;
  });

  // Find empty malls
  const emptyMalls = malls.filter(m => !counts[m.id]);

  console.log(`\nEmpty malls (${emptyMalls.length}):`);
  emptyMalls.forEach(m => console.log(`  - ${m.name}`));

  // Estimate API costs
  console.log('\n========================================');
  console.log('ESTIMATED API COSTS');
  console.log('========================================');

  // Assumptions based on previous fetch results:
  // - Average 15-25 outlets per mall found via text search
  // - Each mall needs ~4 text searches = $0.128/mall
  // - Each outlet needs 1 place details call = $0.017/outlet

  const avgOutletsPerMall = 20;
  const textSearchCostPerMall = 4 * 0.032; // 4 searches per mall
  const detailsCostPerOutlet = 0.017;

  const totalMalls = emptyMalls.length;
  const estimatedOutlets = totalMalls * avgOutletsPerMall;

  const textSearchTotal = totalMalls * textSearchCostPerMall;
  const detailsTotal = estimatedOutlets * detailsCostPerOutlet;
  const totalCost = textSearchTotal + detailsTotal;

  console.log(`\nMalls to fetch: ${totalMalls}`);
  console.log(`Estimated outlets: ~${estimatedOutlets} (avg ${avgOutletsPerMall}/mall)`);
  console.log('');
  console.log('Cost breakdown:');
  console.log(`  Text Search (${totalMalls} malls x 4 searches): $${textSearchTotal.toFixed(2)}`);
  console.log(`  Place Details (~${estimatedOutlets} outlets): $${detailsTotal.toFixed(2)}`);
  console.log(`  ----------------------------------------`);
  console.log(`  TOTAL: $${totalCost.toFixed(2)}`);
  console.log('');
  console.log('Note: Actual cost may vary based on number of outlets found.');
  console.log('Storage cost: FREE (Supabase includes 1GB, images are ~50KB each)');
}

main().catch(console.error);
