// Find HIGH-CONFIDENCE duplicate restaurants (strict matching)
// Only exact matches or Levenshtein < 3

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

// Normalize name for comparison (strip location suffixes and special chars)
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[''`]/g, "'")
    // Remove common location suffixes
    .replace(/\s*\([^)]*\)\s*/g, ' ') // Remove (Paragon), (Jurong), etc.
    .replace(/\s*@\s*.*/g, '') // Remove @ location
    .replace(/\s*-\s*itadakimasu.*/gi, '') // Remove - Itadakimasu by PARCO
    .replace(/[^\w\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Strict matching: only exact or near-exact matches
function isStrictMatch(name1, name2) {
  const norm1 = normalizeName(name1);
  const norm2 = normalizeName(name2);

  // Skip very short names (prone to false positives)
  if (norm1.length < 4 || norm2.length < 4) {
    return { match: false, reason: 'name too short' };
  }

  // Exact match after normalization
  if (norm1 === norm2) {
    return { match: true, reason: 'exact match', confidence: 'HIGH' };
  }

  // Levenshtein distance < 3 (for minor typos)
  const distance = levenshtein(norm1, norm2);
  if (distance < 3 && Math.max(norm1.length, norm2.length) > 6) {
    return { match: true, reason: `Levenshtein: ${distance}`, confidence: 'HIGH' };
  }

  // One is complete substring of other (but both must be >8 chars)
  if (norm1.length >= 8 && norm2.length >= 8) {
    if (norm1.includes(norm2) || norm2.includes(norm1)) {
      const shorter = norm1.length < norm2.length ? norm1 : norm2;
      // Only count if the shorter name is substantial
      if (shorter.length >= 8) {
        return { match: true, reason: 'substring (long name)', confidence: 'MEDIUM' };
      }
    }
  }

  return { match: false, reason: null };
}

async function findDuplicates() {
  console.log('='.repeat(80));
  console.log('HIGH-CONFIDENCE DUPLICATES: Guides vs Mall Outlets (Strict Matching)');
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

  // Fetch mall_outlets with mall info
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

  // Find duplicates with strict matching
  const duplicates = [];

  for (const stationId of Object.keys(guidesByStation)) {
    const stationGuides = guidesByStation[stationId] || [];
    const stationOutlets = outletsByStation[stationId] || [];

    for (const guide of stationGuides) {
      for (const outlet of stationOutlets) {
        const matchResult = isStrictMatch(guide.name, outlet.name);
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
            match_reason: matchResult.reason,
            confidence: matchResult.confidence
          });
        }
      }
    }
  }

  // Group by confidence
  const highConfidence = duplicates.filter(d => d.confidence === 'HIGH');
  const mediumConfidence = duplicates.filter(d => d.confidence === 'MEDIUM');

  console.log(`Found ${highConfidence.length} HIGH confidence duplicates`);
  console.log(`Found ${mediumConfidence.length} MEDIUM confidence duplicates`);
  console.log();

  // Output HIGH confidence duplicates
  console.log('='.repeat(80));
  console.log('🔴 HIGH CONFIDENCE - SAFE TO REMOVE FROM GUIDES');
  console.log('='.repeat(80));
  console.log();

  highConfidence.sort((a, b) => a.station_name.localeCompare(b.station_name));

  const uniqueHighGuideIds = new Set();
  for (const dup of highConfidence) {
    console.log(`${dup.station_name}:`);
    console.log(`  📚 Guide: "${dup.guide_name}"`);
    console.log(`  🏬 Mall:  "${dup.outlet_name}" @ ${dup.mall_name}`);
    console.log(`  ✓ ${dup.match_reason}`);
    console.log();
    uniqueHighGuideIds.add(dup.guide_id);
  }

  // Output MEDIUM confidence duplicates
  if (mediumConfidence.length > 0) {
    console.log();
    console.log('='.repeat(80));
    console.log('🟡 MEDIUM CONFIDENCE - REVIEW BEFORE REMOVING');
    console.log('='.repeat(80));
    console.log();

    mediumConfidence.sort((a, b) => a.station_name.localeCompare(b.station_name));
    for (const dup of mediumConfidence) {
      console.log(`${dup.station_name}:`);
      console.log(`  📚 Guide: "${dup.guide_name}"`);
      console.log(`  🏬 Mall:  "${dup.outlet_name}" @ ${dup.mall_name}`);
      console.log(`  ? ${dup.match_reason}`);
      console.log();
    }
  }

  // SQL for HIGH confidence removals
  const highGuideIds = [...uniqueHighGuideIds];

  console.log();
  console.log('='.repeat(80));
  console.log('SQL TO REMOVE HIGH-CONFIDENCE DUPLICATES');
  console.log('='.repeat(80));
  console.log();
  console.log('-- Deactivate Guide listings that already exist in Mall outlets:');
  console.log(`UPDATE food_listings SET is_active = false WHERE id IN (`);
  console.log(`  '${highGuideIds.join("',\n  '")}'`);
  console.log(`);`);
  console.log();
  console.log(`-- This will remove ${highGuideIds.length} Guide listings`);

  // Summary by station
  console.log();
  console.log('='.repeat(80));
  console.log('SUMMARY BY STATION (HIGH CONFIDENCE ONLY)');
  console.log('='.repeat(80));
  console.log();

  const countByStation = {};
  for (const dup of highConfidence) {
    countByStation[dup.station_name] = (countByStation[dup.station_name] || 0) + 1;
  }

  Object.entries(countByStation)
    .sort((a, b) => b[1] - a[1])
    .forEach(([station, count]) => {
      console.log(`  ${station}: ${count}`);
    });
}

findDuplicates().catch(console.error);
