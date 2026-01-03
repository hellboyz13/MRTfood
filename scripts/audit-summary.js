// AUDIT SUMMARY - No auto-delete, full pagination
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function norm(n) {
  return n.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function coreMatch(a, b) {
  const na = norm(a);
  const nb = norm(b);
  if (na === nb) return 'EXACT';

  // Strip suffix words
  const words = ['paragon', 'mbs', 'jewel', 'singapore', 'sg', 'outlet', 'restaurant',
    'cafe', 'mall', 'centre', 'center', 'hub', 'point', 'signatures', 'express'];
  let sa = na, sb = nb;
  for (const w of words) {
    sa = sa.replace(new RegExp('\\s+' + w + '(\\s|$)', 'gi'), ' ').trim();
    sb = sb.replace(new RegExp('\\s+' + w + '(\\s|$)', 'gi'), ' ').trim();
  }

  if (sa === sb && sa.length >= 4) return 'CORE';
  if (sa.length >= 5 && sb.length >= 5) {
    if (sa.includes(sb) || sb.includes(sa)) return 'CONTAINS';
  }
  return null;
}

async function fetchAllOutlets() {
  let all = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    const { data } = await supabase
      .from('mall_outlets')
      .select('id, name, malls!inner(station_id, name)')
      .range(offset, offset + limit - 1);
    if (!data || data.length === 0) break;
    all = all.concat(data);
    offset += limit;
    if (data.length < limit) break;
  }
  return all;
}

async function fetchAllGuides() {
  let all = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    const { data } = await supabase
      .from('food_listings')
      .select('name, station_id')
      .eq('is_active', true)
      .range(offset, offset + limit - 1);
    if (!data || data.length === 0) break;
    all = all.concat(data);
    offset += limit;
    if (data.length < limit) break;
  }
  return all;
}

async function audit() {
  console.log('FETCHING ALL DATA (with pagination)...\n');

  const [guides, outlets, stationsRes] = await Promise.all([
    fetchAllGuides(),
    fetchAllOutlets(),
    supabase.from('stations').select('id, name')
  ]);

  const stationMap = Object.fromEntries(stationsRes.data.map(s => [s.id, s.name]));

  console.log('Guides:', guides.length, '| Outlets:', outlets.length);

  // Build guide lookup by station
  const guidesByStation = {};
  for (const g of guides) {
    if (!g.station_id) continue;
    if (!guidesByStation[g.station_id]) guidesByStation[g.station_id] = [];
    guidesByStation[g.station_id].push(g.name);
  }

  const duplicates = [];

  for (const o of outlets) {
    const sid = o.malls?.station_id;
    if (!sid) continue;

    const stationGuides = guidesByStation[sid];
    if (!stationGuides) continue;

    for (const gName of stationGuides) {
      const match = coreMatch(gName, o.name);
      if (match) {
        duplicates.push({
          station: stationMap[sid] || sid,
          guide: gName,
          outlet: o.name,
          mall: o.malls.name,
          outlet_id: o.id,
          match
        });
        break;
      }
    }
  }

  duplicates.sort((a, b) => a.station.localeCompare(b.station));

  console.log('\n' + '='.repeat(70));
  console.log('DUPLICATES FOUND:', duplicates.length);
  console.log('(Remove from MALL side, keep GUIDE side)');
  console.log('='.repeat(70) + '\n');

  for (const d of duplicates) {
    console.log(`${d.station} [${d.match}]`);
    console.log(`  Guide: "${d.guide}"`);
    console.log(`  Mall:  "${d.outlet}" @ ${d.mall}`);
    console.log();
  }

  // CSV
  const csv = ['Station,Match,Guide,Mall Outlet,Mall,Outlet ID'];
  duplicates.forEach(d => csv.push(`"${d.station}","${d.match}","${d.guide.replace(/"/g, '""')}","${d.outlet.replace(/"/g, '""')}","${d.mall}","${d.outlet_id}"`));
  fs.writeFileSync('duplicates-for-review.csv', csv.join('\n'));

  console.log('Exported to: duplicates-for-review.csv\n');

  const byType = {};
  duplicates.forEach(d => byType[d.match] = (byType[d.match] || 0) + 1);
  console.log('By Type:', byType);

  const byStn = {};
  duplicates.forEach(d => byStn[d.station] = (byStn[d.station] || 0) + 1);
  console.log('\nTop stations:', Object.entries(byStn).sort((a,b) => b[1]-a[1]).slice(0,10).map(([k,v]) => `${k}(${v})`).join(', '));
}

audit().catch(console.error);
