// Remove MALL OUTLET duplicates (keep Guide listings)
// High confidence matches only

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Levenshtein distance function
function levenshtein(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// Normalize name for comparison
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[''`]/g, "'")
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s*@\s*.*/g, '')
    .replace(/\s*-\s*itadakimasu.*/gi, '')
    .replace(/[^\w\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Strict matching
function isStrictMatch(name1, name2) {
  const norm1 = normalizeName(name1);
  const norm2 = normalizeName(name2);

  if (norm1.length < 4 || norm2.length < 4) {
    return { match: false };
  }

  if (norm1 === norm2) {
    return { match: true, reason: 'exact match', confidence: 'HIGH' };
  }

  const distance = levenshtein(norm1, norm2);
  if (distance < 3 && Math.max(norm1.length, norm2.length) > 6) {
    return { match: true, reason: `Levenshtein: ${distance}`, confidence: 'HIGH' };
  }

  return { match: false };
}

async function removeDuplicates() {
  console.log('Finding HIGH confidence duplicates to remove from mall_outlets...\n');

  const { data: guides } = await supabase
    .from('food_listings')
    .select('id, name, station_id')
    .eq('is_active', true);

  const { data: outlets } = await supabase
    .from('mall_outlets')
    .select(`id, name, mall_id, malls!inner (id, name, station_id)`);

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

  const outletsByStation = {};
  for (const outlet of outlets) {
    const stationId = outlet.malls?.station_id;
    if (!stationId) continue;
    if (!outletsByStation[stationId]) outletsByStation[stationId] = [];
    outletsByStation[stationId].push({
      ...outlet,
      station_id: stationId,
      mall_name: outlet.malls?.name
    });
  }

  // Find HIGH confidence duplicates
  const toRemove = [];

  for (const stationId of Object.keys(guidesByStation)) {
    const stationGuides = guidesByStation[stationId] || [];
    const stationOutlets = outletsByStation[stationId] || [];

    for (const guide of stationGuides) {
      for (const outlet of stationOutlets) {
        const matchResult = isStrictMatch(guide.name, outlet.name);
        if (matchResult.match && matchResult.confidence === 'HIGH') {
          toRemove.push({
            outlet_id: outlet.id,
            outlet_name: outlet.name,
            mall_name: outlet.mall_name,
            guide_name: guide.name,
            station_name: stationMap[stationId],
            reason: matchResult.reason
          });
        }
      }
    }
  }

  // Dedupe by outlet_id
  const uniqueOutletIds = [...new Set(toRemove.map(r => r.outlet_id))];
  const uniqueToRemove = uniqueOutletIds.map(id => toRemove.find(r => r.outlet_id === id));

  console.log(`Found ${uniqueToRemove.length} mall outlets to remove:\n`);

  for (const item of uniqueToRemove.sort((a, b) => a.station_name.localeCompare(b.station_name))) {
    console.log(`${item.station_name}: "${item.outlet_name}" (keeping Guide: "${item.guide_name}")`);
  }

  console.log(`\nDeleting ${uniqueToRemove.length} mall outlets...`);

  // Delete in batches
  const { error } = await supabase
    .from('mall_outlets')
    .delete()
    .in('id', uniqueOutletIds);

  if (error) {
    console.error('Error deleting:', error);
  } else {
    console.log(`✅ Successfully deleted ${uniqueOutletIds.length} duplicate mall outlets`);
  }
}

removeDuplicates().catch(console.error);
