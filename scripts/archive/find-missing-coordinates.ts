import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function findMissingCoordinates() {
  // Get all station IDs from database
  const { data: dbStations } = await supabase
    .from('stations')
    .select('id, name')
    .order('name');

  // Read stationCoordinates from MRTMap.tsx
  const mapContent = fs.readFileSync('components/MRTMap.tsx', 'utf8');
  const coordsMatch = mapContent.match(/const stationCoordinates[^{]+\{([\s\S]+?)\n\};/);

  if (!coordsMatch) {
    console.error('Could not find stationCoordinates in MRTMap.tsx');
    return;
  }

  // Extract station IDs from stationCoordinates
  const coordStationIds = new Set<string>();
  const regex = /'([^']+)':\s*\{/g;
  let match;
  while ((match = regex.exec(coordsMatch[1])) !== null) {
    coordStationIds.add(match[1]);
  }

  console.log(`\n📊 ANALYSIS:`);
  console.log(`Database stations: ${dbStations?.length || 0}`);
  console.log(`Stations with coordinates in code: ${coordStationIds.size}`);

  // Find stations in DB but NOT in stationCoordinates
  const missingCoords = dbStations?.filter(s => !coordStationIds.has(s.id)) || [];

  console.log(`\n❌ Stations in DB but MISSING from stationCoordinates: ${missingCoords.length}`);
  if (missingCoords.length > 0) {
    console.log('\nThese stations won\'t be clickable on the map:');
    missingCoords.forEach((s, i) => {
      console.log(`  ${(i+1).toString().padStart(2)}. ${s.id.padEnd(25)} -> ${s.name}`);
    });
  }

  // Find stations in code but NOT in DB
  const dbStationIds = new Set(dbStations?.map(s => s.id) || []);
  const extraCoords: string[] = [];
  coordStationIds.forEach(id => {
    if (!dbStationIds.has(id)) {
      extraCoords.push(id);
    }
  });

  console.log(`\n⚠️  Stations with coordinates but NOT in DB: ${extraCoords.length}`);
  if (extraCoords.length > 0) {
    console.log('\nThese coordinates are unused (station doesn\'t exist in DB):');
    extraCoords.slice(0, 20).forEach((id, i) => {
      console.log(`  ${(i+1).toString().padStart(2)}. ${id}`);
    });
    if (extraCoords.length > 20) {
      console.log(`  ... and ${extraCoords.length - 20} more`);
    }
  }
}

findMissingCoordinates();
