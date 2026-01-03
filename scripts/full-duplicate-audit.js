// FULL COMPREHENSIVE DUPLICATE AUDIT
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
    .replace(/[''`\-\.@()®™]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractCoreName(name) {
  let core = normalize(name);
  // Remove location suffixes
  const locations = ['paragon', 'mbs', 'jewel', 'ion', 'tampines', 'jurong', 'orchard', 'paya lebar',
    'bedok', 'yishun', 'sengkang', 'punggol', 'bishan', 'serangoon', 'novena', 'chinatown',
    'bugis', 'city hall', 'raffles', 'somerset', 'clementi', 'harbourfront', 'bayfront',
    'dhoby ghaut', 'marina', 'square', 'mall', 'centre', 'center', 'hub', 'point'];
  for (const loc of locations) {
    core = core.replace(new RegExp('\\s*' + loc + '.*$', 'i'), '');
  }
  // Remove common suffixes
  core = core.replace(/\s*(singapore|sg|outlet|restaurant|cafe|bistro|kitchen|eatery|express|original|famous)$/gi, '');
  return core.trim();
}

function isSameRestaurant(guideName, outletName) {
  const gNorm = normalize(guideName);
  const oNorm = normalize(outletName);

  // Exact normalized match
  if (gNorm === oNorm) return 'EXACT';

  // Core name match
  const gCore = extractCoreName(guideName);
  const oCore = extractCoreName(outletName);
  if (gCore.length >= 4 && oCore.length >= 4) {
    if (gCore === oCore) return 'CORE_EXACT';
    // One contains the other
    if (gCore.includes(oCore) || oCore.includes(gCore)) return 'CONTAINS';
  }

  return null;
}

async function fullAudit() {
  console.log('FULL DUPLICATE AUDIT\n');

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
      const matchType = isSameRestaurant(guide.name, outlet.name);
      if (matchType) {
        duplicates.push({
          station_id: guide.station_id,
          station: stationMap[guide.station_id],
          guide_name: guide.name,
          guide_id: guide.id,
          outlet_name: outlet.name,
          outlet_id: outlet.id,
          mall: outlet.malls?.name,
          match_type: matchType
        });
      }
    }
  }

  // Dedupe by outlet_id
  const seen = new Set();
  const unique = duplicates.filter(d => {
    if (seen.has(d.outlet_id)) return false;
    seen.add(d.outlet_id);
    return true;
  });

  unique.sort((a, b) => a.station.localeCompare(b.station));

  console.log('='.repeat(80));
  console.log(`FOUND ${unique.length} DUPLICATES`);
  console.log('='.repeat(80) + '\n');

  for (const d of unique) {
    console.log(`${d.station} [${d.match_type}]`);
    console.log(`  Guide: "${d.guide_name}"`);
    console.log(`  Mall:  "${d.outlet_name}" @ ${d.mall}`);
    console.log();
  }

  // Export CSV
  const csv = ['Station,Match Type,Guide Name,Mall Outlet,Mall,Outlet ID'];
  unique.forEach(d => csv.push(`"${d.station}","${d.match_type}","${d.guide_name.replace(/"/g, '""')}","${d.outlet_name.replace(/"/g, '""')}","${d.mall}","${d.outlet_id}"`));
  fs.writeFileSync('full-audit-duplicates.csv', csv.join('\n'));
  console.log('Exported to full-audit-duplicates.csv');

  // Summary
  console.log('\n' + '='.repeat(80));
  const byType = {};
  unique.forEach(d => byType[d.match_type] = (byType[d.match_type] || 0) + 1);
  console.log('BY TYPE:', byType);

  const byStn = {};
  unique.forEach(d => byStn[d.station] = (byStn[d.station] || 0) + 1);
  console.log('BY STATION:', Object.entries(byStn).sort((a,b) => b[1]-a[1]).slice(0, 10).map(([k,v]) => `${k}(${v})`).join(', '));
}

fullAudit().catch(console.error);
