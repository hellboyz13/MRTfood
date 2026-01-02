// Comprehensive audit - find ALL potential duplicates with loose matching
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function levenshtein(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
      }
    }
  }
  return matrix[b.length][a.length];
}

// More aggressive normalization
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[''\-`\.]/g, '') // Remove apostrophes, hyphens, dots
    .replace(/\s*[@\(\)].*/g, '') // Remove @ and everything after, remove parentheses content
    .replace(/\s*(singapore|sg|outlet|restaurant|cafe|bistro|kitchen|eatery|food|stall)$/gi, '') // Remove common suffixes
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getWords(name) {
  return normalizeName(name).split(' ').filter(w => w.length >= 2);
}

// Check if names could be the same restaurant
function isPotentialMatch(name1, name2) {
  const norm1 = normalizeName(name1);
  const norm2 = normalizeName(name2);

  // Exact match
  if (norm1 === norm2) {
    return { match: true, reason: 'EXACT', confidence: 'HIGH' };
  }

  // One contains the other (min 4 chars)
  if (norm1.length >= 4 && norm2.length >= 4) {
    if (norm1.includes(norm2) || norm2.includes(norm1)) {
      return { match: true, reason: 'CONTAINS', confidence: 'HIGH' };
    }
  }

  // Levenshtein distance
  const distance = levenshtein(norm1, norm2);
  if (distance <= 2 && Math.min(norm1.length, norm2.length) >= 4) {
    return { match: true, reason: `LEVENSHTEIN(${distance})`, confidence: 'HIGH' };
  }
  if (distance <= 3 && Math.min(norm1.length, norm2.length) >= 6) {
    return { match: true, reason: `LEVENSHTEIN(${distance})`, confidence: 'MEDIUM' };
  }

  // Word matching - 2+ significant words
  const words1 = getWords(name1);
  const words2 = getWords(name2);
  const commonWords = words1.filter(w => words2.some(w2 => w === w2 || levenshtein(w, w2) <= 1));

  // Filter out generic food words for word matching
  const genericWords = ['the', 'and', 'nasi', 'mee', 'rice', 'noodle', 'noodles', 'chicken', 'fish', 'soup',
    'fried', 'food', 'muslim', 'halal', 'chinese', 'thai', 'korean', 'japanese', 'western',
    'hawker', 'centre', 'center', 'market', 'stall', 'hainanese', 'teochew', 'hokkien',
    'street', 'road', 'hong', 'kong', 'singapore', 'carrot', 'cake', 'prawn', 'kway', 'teow',
    'bak', 'kut', 'teh', 'lemak', 'goreng', 'ayam', 'beef', 'pork', 'mutton', 'lamb',
    'dim', 'sum', 'tim', 'xiao', 'long', 'bao', 'dumpling', 'wonton', 'mian', 'ban'];

  const significantCommon = commonWords.filter(w => !genericWords.includes(w));

  if (significantCommon.length >= 2) {
    return { match: true, reason: `WORDS(${significantCommon.join(',')})`, confidence: 'MEDIUM' };
  }

  // Brand name matching - first word match (likely brand)
  if (words1.length > 0 && words2.length > 0) {
    const brand1 = words1[0];
    const brand2 = words2[0];
    if (brand1.length >= 3 && brand2.length >= 3) {
      if (brand1 === brand2 || levenshtein(brand1, brand2) <= 1) {
        return { match: true, reason: `BRAND(${brand1})`, confidence: 'MEDIUM' };
      }
    }
  }

  return { match: false };
}

async function audit() {
  console.log('='.repeat(80));
  console.log('COMPREHENSIVE DUPLICATE AUDIT');
  console.log('='.repeat(80));
  console.log();

  const { data: guides } = await supabase
    .from('food_listings')
    .select('id, name, station_id, source_id')
    .eq('is_active', true);

  const { data: outlets } = await supabase
    .from('mall_outlets')
    .select('id, name, mall_id, malls!inner(station_id, name)');

  const { data: stations } = await supabase
    .from('stations')
    .select('id, name');

  const stationMap = Object.fromEntries(stations.map(s => [s.id, s.name]));

  console.log(`Checking ${guides.length} guides against ${outlets.length} mall outlets...\n`);

  // Group by station
  const guidesByStation = {};
  for (const guide of guides) {
    if (!guide.station_id) continue;
    if (!guidesByStation[guide.station_id]) guidesByStation[guide.station_id] = [];
    guidesByStation[guide.station_id].push(guide);
  }

  const highConfidence = [];
  const mediumConfidence = [];

  for (const outlet of outlets) {
    const stationId = outlet.malls?.station_id;
    if (!stationId) continue;

    const stationGuides = guidesByStation[stationId] || [];

    for (const guide of stationGuides) {
      const result = isPotentialMatch(guide.name, outlet.name);
      if (result.match) {
        const dup = {
          station: stationMap[stationId],
          station_id: stationId,
          guide_name: guide.name,
          guide_id: guide.id,
          outlet_name: outlet.name,
          outlet_id: outlet.id,
          mall: outlet.malls?.name,
          reason: result.reason,
          confidence: result.confidence
        };

        if (result.confidence === 'HIGH') {
          highConfidence.push(dup);
        } else {
          mediumConfidence.push(dup);
        }
      }
    }
  }

  // Dedupe by outlet_id
  const seenOutlets = new Set();
  const uniqueHigh = highConfidence.filter(d => {
    if (seenOutlets.has(d.outlet_id)) return false;
    seenOutlets.add(d.outlet_id);
    return true;
  });

  const uniqueMedium = mediumConfidence.filter(d => {
    if (seenOutlets.has(d.outlet_id)) return false;
    seenOutlets.add(d.outlet_id);
    return true;
  });

  console.log('='.repeat(80));
  console.log(`🔴 HIGH CONFIDENCE: ${uniqueHigh.length} duplicates (REMOVE FROM MALL)`);
  console.log('='.repeat(80));
  console.log();

  for (const d of uniqueHigh.sort((a, b) => a.station.localeCompare(b.station))) {
    console.log(`${d.station}:`);
    console.log(`  Guide: "${d.guide_name}"`);
    console.log(`  Mall:  "${d.outlet_name}" @ ${d.mall}`);
    console.log(`  Reason: ${d.reason}`);
    console.log();
  }

  console.log('='.repeat(80));
  console.log(`🟡 MEDIUM CONFIDENCE: ${uniqueMedium.length} (REVIEW)`);
  console.log('='.repeat(80));
  console.log();

  for (const d of uniqueMedium.sort((a, b) => a.station.localeCompare(b.station))) {
    console.log(`${d.station}:`);
    console.log(`  Guide: "${d.guide_name}"`);
    console.log(`  Mall:  "${d.outlet_name}" @ ${d.mall}`);
    console.log(`  Reason: ${d.reason}`);
    console.log();
  }

  // Output IDs for deletion
  if (uniqueHigh.length > 0) {
    console.log('='.repeat(80));
    console.log('OUTLET IDs TO DELETE (HIGH CONFIDENCE):');
    console.log('='.repeat(80));
    console.log(uniqueHigh.map(d => d.outlet_id).join('\n'));
  }

  return { high: uniqueHigh, medium: uniqueMedium };
}

audit().catch(console.error);
