// Export remaining potential duplicates to CSV
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[''`]/g, "'")
    .replace(/[^\w\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getWords(name) {
  return normalizeName(name).split(' ').filter(w => w.length > 1);
}

function isNameMatch(name1, name2) {
  const norm1 = normalizeName(name1);
  const norm2 = normalizeName(name2);

  if (norm1 === norm2) return { match: true, reason: 'exact' };

  const words1 = getWords(name1);
  const words2 = getWords(name2);
  const commonWords = words1.filter(w => words2.includes(w));

  if (commonWords.length >= 2) {
    return { match: true, reason: `${commonWords.length} words: ${commonWords.join(', ')}` };
  }

  if (norm1.length >= 3 && norm2.length >= 3) {
    if (norm1.includes(norm2) || norm2.includes(norm1)) {
      return { match: true, reason: 'substring' };
    }
  }

  return { match: false };
}

async function exportDuplicates() {
  const { data: guides } = await supabase
    .from('food_listings')
    .select('id, name, station_id, source_id')
    .eq('is_active', true);

  const { data: outlets } = await supabase
    .from('mall_outlets')
    .select(`id, name, mall_id, level, malls!inner (id, name, station_id)`);

  const { data: stations } = await supabase
    .from('stations')
    .select('id, name');

  const stationMap = Object.fromEntries(stations.map(s => [s.id, s.name]));

  const guidesByStation = {};
  for (const guide of guides) {
    if (!guide.station_id) continue;
    if (!guidesByStation[guide.station_id]) guidesByStation[guide.station_id] = [];
    guidesByStation[guide.station_id].push(guide);
  }

  const duplicates = [];

  for (const outlet of outlets) {
    const stationId = outlet.malls?.station_id;
    if (!stationId) continue;

    const stationGuides = guidesByStation[stationId] || [];

    for (const guide of stationGuides) {
      const matchResult = isNameMatch(guide.name, outlet.name);
      if (matchResult.match) {
        duplicates.push({
          station: stationMap[stationId],
          guide_name: guide.name,
          guide_source: guide.source_id || '',
          mall_outlet_name: outlet.name,
          mall_name: outlet.malls?.name,
          match_reason: matchResult.reason
        });
      }
    }
  }

  // Sort by station
  duplicates.sort((a, b) => a.station.localeCompare(b.station));

  // Create CSV
  const header = 'Station,Guide Name,Guide Source,Mall Outlet Name,Mall,Match Reason';
  const rows = duplicates.map(d =>
    `"${d.station}","${d.guide_name.replace(/"/g, '""')}","${d.guide_source}","${d.mall_outlet_name.replace(/"/g, '""')}","${d.mall_name}","${d.match_reason}"`
  );

  const csv = [header, ...rows].join('\n');

  fs.writeFileSync('remaining-duplicates.csv', csv);
  console.log(`Exported ${duplicates.length} potential duplicates to remaining-duplicates.csv`);
}

exportDuplicates().catch(console.error);
