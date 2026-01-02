// FULL COMPREHENSIVE DUPLICATE AUDIT
// Compares ALL guides against ALL mall outlets at same station
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function normalize(name) {
  return name
    .toLowerCase()
    .replace(/[''\-`\.\@\(\)]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractCoreName(name) {
  // Remove common suffixes and location info
  return normalize(name)
    .replace(/\s*(singapore|sg|outlet|restaurant|cafe|bistro|kitchen|eatery|express|original|famous)$/gi, '')
    .replace(/\s*(paragon|mbs|jewel|ion|tampines|jurong|orchard|paya lebar|bedok|yishun|sengkang|punggol|bishan|serangoon|novena|chinatown|bugis|city hall|raffles|somerset|clementi|harbourfront|bayfront|dhoby ghaut).*$/gi, '')
    .trim();
}

function isSameRestaurant(guideName, outletName) {
  const g = normalize(guideName);
  const o = normalize(outletName);

  // Exact match
  if (g === o) return { match: true, confidence: 'EXACT' };

  // Core name match
  const gCore = extractCoreName(guideName);
  const oCore = extractCoreName(outletName);
  if (gCore === oCore && gCore.length >= 4) return { match: true, confidence: 'CORE_MATCH' };

  // One contains the other (for longer names only)
  if (gCore.length >= 5 && oCore.length >= 5) {
    if (gCore.includes(oCore) || oCore.includes(gCore)) {
      return { match: true, confidence: 'CONTAINS' };
    }
  }

  return { match: false };
}

async function fullAudit() {
  console.log('FULL DUPLICATE AUDIT - Scanning all guides vs all mall outlets...\n');

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

  console.log(`Guides: ${guides.length} | Mall Outlets: ${outlets.length}\n`);

  // Group outlets by station
  const outletsByStation = {};
  for (const o of outlets) {
    const sid = o.malls?.station_id;
    if (!sid) continue;
    if (!outletsByStation[sid]) outletsByStation[sid] = [];
    outletsByStation[sid].push(o);
  }

  const duplicates = [];

  for (const guide of guides) {
    if (!guide.station_id) continue;
    const stationOutlets = outletsByStation[guide.station_id] || [];

    for (const outlet of stationOutlets) {
      const result = isSameRestaurant(guide.name, outlet.name);
      if (result.match) {
        duplicates.push({
          station_id: guide.station_id,
          station: stationMap[guide.station_id],
          guide_name: guide.name,
          guide_id: guide.id,
          outlet_name: outlet.name,
          outlet_id: outlet.id,
          mall: outlet.malls?.name,
          confidence: result.confidence
        });
      }
    }
  }

  // Dedupe by outlet_id (keep first match)
  const seen = new Set();
  const unique = duplicates.filter(d => {
    if (seen.has(d.outlet_id)) return false;
    seen.add(d.outlet_id);
    return true;
  });

  // Sort by station then confidence
  unique.sort((a, b) => {
    if (a.station !== b.station) return a.station.localeCompare(b.station);
    return a.confidence.localeCompare(b.confidence);
  });

  console.log('=' .repeat(80));
  console.log(`FOUND ${unique.length} DUPLICATES TO REMOVE FROM MALL SIDE`);
  console.log('='.repeat(80));
  console.log();

  for (const d of unique) {
    console.log(`${d.station} [${d.confidence}]`);
    console.log(`  Guide: "${d.guide_name}"`);
    console.log(`  Mall:  "${d.outlet_name}" @ ${d.mall}`);
    console.log();
  }

  // Export to CSV
  const csv = ['Station,Confidence,Guide Name,Mall Outlet,Mall,Outlet ID'];
  for (const d of unique) {
    csv.push(`"${d.station}","${d.confidence}","${d.guide_name.replace(/"/g, '""')}","${d.outlet_name.replace(/"/g, '""')}","${d.mall}","${d.outlet_id}"`);
  }
  fs.writeFileSync('full-audit-duplicates.csv', csv.join('\n'));
  console.log('\nExported to full-audit-duplicates.csv');

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY BY CONFIDENCE:');
  const byConf = {};
  unique.forEach(d => byConf[d.confidence] = (byConf[d.confidence] || 0) + 1);
  Object.entries(byConf).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

  console.log('\nSUMMARY BY STATION:');
  const byStn = {};
  unique.forEach(d => byStn[d.station] = (byStn[d.station] || 0) + 1);
  Object.entries(byStn).sort((a,b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

  return unique;
}

fullAudit().catch(console.error);
