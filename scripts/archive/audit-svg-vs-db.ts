import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function auditSvgVsDb() {
  console.log('🔍 AUDIT: SVG MAP vs DATABASE STATIONS\n');
  console.log('='.repeat(80));

  // STEP 1: Extract station coordinates from MRTMap.tsx (these are the clickable stations)
  console.log('\n📍 STEP 1: Extracting clickable stations from MRTMap.tsx...\n');

  const mapContent = fs.readFileSync('components/MRTMap.tsx', 'utf8');

  // Find the stationCoordinates object
  const coordsMatch = mapContent.match(/const stationCoordinates[^=]*=\s*\{([\s\S]*?)\n\};/);

  if (!coordsMatch) {
    console.error('Could not find stationCoordinates in MRTMap.tsx');
    return;
  }

  // Extract station IDs from stationCoordinates
  const svgStationIds = new Set<string>();
  const svgStationNames: Record<string, string> = {};

  const regex = /'([^']+)':\s*\{\s*cx:\s*[\d.]+,\s*cy:\s*[\d.]+,\s*name:\s*'([^']+)'/g;
  let match;
  while ((match = regex.exec(coordsMatch[1])) !== null) {
    svgStationIds.add(match[1]);
    svgStationNames[match[1]] = match[2];
  }

  console.log(`Found ${svgStationIds.size} clickable stations in SVG map\n`);

  // STEP 2: Get all stations from database
  console.log('📊 STEP 2: Fetching stations from database...\n');

  const { data: dbStations, error } = await supabase
    .from('stations')
    .select('id, name')
    .order('name');

  if (error) {
    console.error('Error fetching stations:', error);
    return;
  }

  const dbStationIds = new Set(dbStations?.map(s => s.id) || []);
  const dbStationNames: Record<string, string> = {};
  dbStations?.forEach(s => {
    dbStationNames[s.id] = s.name;
  });

  console.log(`Found ${dbStationIds.size} stations in database\n`);

  // STEP 3: Compare and report
  console.log('='.repeat(80));
  console.log('\n📋 STEP 3: COMPARISON REPORT\n');

  // Stations in DB but NOT in SVG (can't click on map)
  const inDbNotSvg: string[] = [];
  dbStationIds.forEach(id => {
    if (!svgStationIds.has(id)) {
      inDbNotSvg.push(id);
    }
  });

  // Stations in SVG but NOT in DB (orphaned circles)
  const inSvgNotDb: string[] = [];
  svgStationIds.forEach(id => {
    if (!dbStationIds.has(id)) {
      inSvgNotDb.push(id);
    }
  });

  // Find potential ID mismatches (similar names but different IDs)
  const potentialMismatches: Array<{ svgId: string; svgName: string; dbId: string; dbName: string }> = [];

  inSvgNotDb.forEach(svgId => {
    const svgName = svgStationNames[svgId]?.toLowerCase() || '';
    // Look for similar names in DB
    dbStations?.forEach(dbStation => {
      const dbNameLower = dbStation.name.toLowerCase();
      // Check if names are similar (contain each other or similar ID pattern)
      if (
        svgName.includes(dbNameLower) ||
        dbNameLower.includes(svgName) ||
        svgId.replace(/-/g, '').includes(dbStation.id.replace(/-/g, '')) ||
        dbStation.id.replace(/-/g, '').includes(svgId.replace(/-/g, ''))
      ) {
        if (!svgStationIds.has(dbStation.id) && !dbStationIds.has(svgId)) {
          potentialMismatches.push({
            svgId,
            svgName: svgStationNames[svgId],
            dbId: dbStation.id,
            dbName: dbStation.name,
          });
        }
      }
    });
  });

  // Print report
  console.log('❌ STATIONS IN DATABASE BUT NOT CLICKABLE ON MAP:');
  console.log('   (These stations exist in DB but have no circle on the SVG)\n');

  if (inDbNotSvg.length === 0) {
    console.log('   ✅ None! All DB stations are clickable on map.\n');
  } else {
    inDbNotSvg.forEach((id, i) => {
      console.log(`   ${(i + 1).toString().padStart(2)}. ${dbStationNames[id]} (${id})`);
    });
    console.log(`\n   Total: ${inDbNotSvg.length} stations\n`);
  }

  console.log('='.repeat(80));
  console.log('\n⚠️  STATIONS IN SVG BUT NOT IN DATABASE:');
  console.log('   (These are clickable but have no food data)\n');

  if (inSvgNotDb.length === 0) {
    console.log('   ✅ None! All SVG stations exist in DB.\n');
  } else {
    inSvgNotDb.forEach((id, i) => {
      console.log(`   ${(i + 1).toString().padStart(2)}. ${svgStationNames[id]} (${id})`);
    });
    console.log(`\n   Total: ${inSvgNotDb.length} stations\n`);
  }

  if (potentialMismatches.length > 0) {
    console.log('='.repeat(80));
    console.log('\n🔄 POTENTIAL ID MISMATCHES (may need investigation):');
    console.log('   (Similar names but different IDs)\n');

    potentialMismatches.forEach((m, i) => {
      console.log(`   ${(i + 1).toString().padStart(2)}. SVG: "${m.svgName}" (${m.svgId})`);
      console.log(`       DB:  "${m.dbName}" (${m.dbId})\n`);
    });
  }

  // Summary
  console.log('='.repeat(80));
  console.log('\n📊 SUMMARY:\n');
  console.log(`   SVG Map Stations:     ${svgStationIds.size}`);
  console.log(`   Database Stations:    ${dbStationIds.size}`);
  console.log(`   In DB, not on map:    ${inDbNotSvg.length}`);
  console.log(`   On map, not in DB:    ${inSvgNotDb.length}`);
  console.log(`   Potential mismatches: ${potentialMismatches.length}`);

  // STEP 4: Recommendations
  if (inDbNotSvg.length > 0 || inSvgNotDb.length > 0) {
    console.log('\n='.repeat(80));
    console.log('\n💡 RECOMMENDED FIXES:\n');

    if (inDbNotSvg.length > 0) {
      console.log('   TO ADD TO SVG (stationCoordinates in MRTMap.tsx):');
      console.log('   Need to find the correct cx, cy positions for these stations.\n');
      inDbNotSvg.forEach(id => {
        console.log(`   '${id}': { cx: ???, cy: ???, name: '${dbStationNames[id]}' },`);
      });
    }

    if (inSvgNotDb.length > 0) {
      console.log('\n   TO ADD TO DATABASE:');
      console.log('   Run SQL to add these stations.\n');
      inSvgNotDb.forEach(id => {
        console.log(`   INSERT INTO stations (id, name) VALUES ('${id}', '${svgStationNames[id]}');`);
      });
    }
  } else {
    console.log('\n✅ No fixes needed! SVG map and database are in sync.\n');
  }

  console.log('='.repeat(80));
}

auditSvgVsDb();
