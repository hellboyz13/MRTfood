// Remove ALL exact match mall outlet duplicates automatically
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[''`]/g, "'")
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s*@\s*.*/g, '')
    .replace(/[^\w\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function removeExactDuplicates() {
  console.log('Finding and removing ALL exact match duplicates...\n');

  const { data: guides } = await supabase
    .from('food_listings')
    .select('id, name, station_id')
    .eq('is_active', true);

  const { data: outlets } = await supabase
    .from('mall_outlets')
    .select(`id, name, malls!inner (station_id, name)`);

  const { data: stations } = await supabase
    .from('stations')
    .select('id, name');

  const stationMap = Object.fromEntries(stations.map(s => [s.id, s.name]));

  // Group by station
  const guidesByStation = {};
  for (const guide of guides) {
    if (!guide.station_id) continue;
    if (!guidesByStation[guide.station_id]) guidesByStation[guide.station_id] = [];
    guidesByStation[guide.station_id].push(guide);
  }

  const toDelete = [];

  for (const outlet of outlets) {
    const stationId = outlet.malls?.station_id;
    if (!stationId) continue;

    const stationGuides = guidesByStation[stationId] || [];
    const normalizedOutlet = normalizeName(outlet.name);

    for (const guide of stationGuides) {
      const normalizedGuide = normalizeName(guide.name);

      // Exact match after normalization
      if (normalizedOutlet === normalizedGuide) {
        toDelete.push({
          id: outlet.id,
          name: outlet.name,
          mall: outlet.malls?.name,
          guide_name: guide.name,
          station: stationMap[stationId]
        });
        break; // Only need one match
      }
    }
  }

  console.log(`Found ${toDelete.length} exact match duplicates:\n`);

  for (const item of toDelete.sort((a, b) => a.station.localeCompare(b.station))) {
    console.log(`${item.station}: "${item.name}" @ ${item.mall}`);
    console.log(`  (Guide: "${item.guide_name}")\n`);
  }

  if (toDelete.length > 0) {
    console.log(`Deleting ${toDelete.length} mall outlets...`);

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
    console.log('No exact duplicates found.');
  }
}

removeExactDuplicates().catch(console.error);
