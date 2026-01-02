// Find duplicate restaurants appearing in BOTH food_listings (Guides) AND mall_outlets
// for the same MRT station

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
    .replace(/[^\w\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Get words from name (for 2+ word match)
function getWords(name) {
  return normalizeName(name)
    .split(' ')
    .filter(w => w.length > 1); // Filter out single characters
}

// Check if names match (2+ word match OR Levenshtein < 3)
function isNameMatch(name1, name2) {
  const norm1 = normalizeName(name1);
  const norm2 = normalizeName(name2);

  // Exact match after normalization
  if (norm1 === norm2) {
    return { match: true, reason: 'exact match' };
  }

  // Levenshtein distance < 3
  const distance = levenshtein(norm1, norm2);
  if (distance < 3) {
    return { match: true, reason: `Levenshtein distance: ${distance}` };
  }

  // 2+ word match
  const words1 = getWords(name1);
  const words2 = getWords(name2);
  const commonWords = words1.filter(w => words2.includes(w));

  if (commonWords.length >= 2) {
    return { match: true, reason: `${commonWords.length} common words: "${commonWords.join('", "')}"` };
  }

  // Also check if one name contains the other (for cases like "Din Tai Fung" vs "Din Tai Fung (Paragon)")
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    return { match: true, reason: 'substring match' };
  }

  return { match: false, reason: null };
}

async function findDuplicates() {
  console.log('='.repeat(80));
  console.log('FINDING DUPLICATES: Guides (food_listings) vs Malls (mall_outlets)');
  console.log('='.repeat(80));
  console.log();

  // Fetch food_listings (Guides)
  const { data: guides, error: guidesError } = await supabase
    .from('food_listings')
    .select('id, name, station_id, source_id, is_active')
    .eq('is_active', true);

  if (guidesError) {
    console.error('Error fetching guides:', guidesError);
    return;
  }

  // Fetch mall_outlets with mall info (to get station_id)
  const { data: outlets, error: outletsError } = await supabase
    .from('mall_outlets')
    .select(`
      id,
      name,
      mall_id,
      level,
      malls!inner (
        id,
        name,
        station_id
      )
    `);

  if (outletsError) {
    console.error('Error fetching outlets:', outletsError);
    return;
  }

  // Fetch stations for name lookup
  const { data: stations, error: stationsError } = await supabase
    .from('stations')
    .select('id, name');

  if (stationsError) {
    console.error('Error fetching stations:', stationsError);
    return;
  }

  const stationMap = Object.fromEntries(stations.map(s => [s.id, s.name]));

  console.log(`Found ${guides.length} active guide listings`);
  console.log(`Found ${outlets.length} mall outlets`);
  console.log();

  // Group guides by station
  const guidesByStation = {};
  for (const guide of guides) {
    if (!guide.station_id) continue;
    if (!guidesByStation[guide.station_id]) {
      guidesByStation[guide.station_id] = [];
    }
    guidesByStation[guide.station_id].push(guide);
  }

  // Group outlets by station
  const outletsByStation = {};
  for (const outlet of outlets) {
    const stationId = outlet.malls?.station_id;
    if (!stationId) continue;
    if (!outletsByStation[stationId]) {
      outletsByStation[stationId] = [];
    }
    outletsByStation[stationId].push({
      ...outlet,
      station_id: stationId,
      mall_name: outlet.malls?.name
    });
  }

  // Find duplicates
  const duplicates = [];
  const stationDuplicateCounts = {};

  for (const stationId of Object.keys(guidesByStation)) {
    const stationGuides = guidesByStation[stationId] || [];
    const stationOutlets = outletsByStation[stationId] || [];

    for (const guide of stationGuides) {
      for (const outlet of stationOutlets) {
        const matchResult = isNameMatch(guide.name, outlet.name);
        if (matchResult.match) {
          duplicates.push({
            station_id: stationId,
            station_name: stationMap[stationId] || stationId,
            guide_id: guide.id,
            guide_name: guide.name,
            guide_source: guide.source_id,
            outlet_id: outlet.id,
            outlet_name: outlet.name,
            mall_name: outlet.mall_name,
            mall_level: outlet.level,
            match_reason: matchResult.reason
          });

          stationDuplicateCounts[stationId] = (stationDuplicateCounts[stationId] || 0) + 1;
        }
      }
    }
  }

  // Output results
  if (duplicates.length === 0) {
    console.log('✅ No duplicates found!');
    return;
  }

  console.log(`⚠️  Found ${duplicates.length} duplicate(s) across ${Object.keys(stationDuplicateCounts).length} station(s)`);
  console.log();
  console.log('='.repeat(80));
  console.log('DUPLICATE LISTINGS');
  console.log('='.repeat(80));
  console.log();

  // Sort by station
  duplicates.sort((a, b) => a.station_name.localeCompare(b.station_name));

  for (const dup of duplicates) {
    console.log(`Station: ${dup.station_name} (${dup.station_id})`);
    console.log(`  📚 Guide: "${dup.guide_name}" (source: ${dup.guide_source})`);
    console.log(`  🏬 Mall:  "${dup.outlet_name}" @ ${dup.mall_name} ${dup.mall_level || ''}`);
    console.log(`  🔍 Match: ${dup.match_reason}`);
    console.log();
  }

  console.log('='.repeat(80));
  console.log('COUNT PER STATION');
  console.log('='.repeat(80));
  console.log();

  for (const [stationId, count] of Object.entries(stationDuplicateCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${stationMap[stationId] || stationId}: ${count} duplicate(s)`);
  }

  console.log();
  console.log('='.repeat(80));
  console.log('RECOMMENDATIONS');
  console.log('='.repeat(80));
  console.log();
  console.log('The following Guide listings should be REMOVED (they already exist in Mall outlets):');
  console.log();

  // SQL to delete duplicates
  const guideIdsToRemove = [...new Set(duplicates.map(d => d.guide_id))];

  for (const dup of duplicates) {
    console.log(`-- Remove "${dup.guide_name}" from Guides (already in ${dup.mall_name})`);
    console.log(`-- UPDATE food_listings SET is_active = false WHERE id = '${dup.guide_id}';`);
    console.log();
  }

  console.log();
  console.log('-- Or bulk deactivate all duplicates:');
  console.log(`UPDATE food_listings SET is_active = false WHERE id IN (`);
  console.log(`  '${guideIdsToRemove.join("',\n  '")}'`);
  console.log(`);`);
  console.log();

  // Also output as JSON for reference
  console.log('='.repeat(80));
  console.log('JSON OUTPUT (for programmatic use)');
  console.log('='.repeat(80));
  console.log();
  console.log(JSON.stringify({
    total_duplicates: duplicates.length,
    stations_affected: Object.keys(stationDuplicateCounts).length,
    duplicates: duplicates,
    guide_ids_to_remove: guideIdsToRemove
  }, null, 2));
}

findDuplicates().catch(console.error);
