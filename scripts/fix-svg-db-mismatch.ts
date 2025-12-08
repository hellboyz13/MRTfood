import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Use service_role key to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4'
);

interface OneMapResult {
  SEARCHVAL: string;
  LATITUDE: string;
  LONGITUDE: string;
}

interface OneMapResponse {
  found: number;
  results: OneMapResult[];
}

async function fetchOneMapCoordinates(stationName: string): Promise<{ lat: number; lng: number } | null> {
  const searchQuery = encodeURIComponent(`${stationName} MRT`);
  const url = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${searchQuery}&returnGeom=Y&getAddrDetails=N`;

  try {
    const response = await fetch(url);
    const data: OneMapResponse = await response.json();

    if (data.found > 0 && data.results.length > 0) {
      const result = data.results[0];
      return {
        lat: parseFloat(result.LATITUDE),
        lng: parseFloat(result.LONGITUDE),
      };
    }
    return null;
  } catch (error) {
    console.error(`Error fetching coordinates for ${stationName}:`, error);
    return null;
  }
}

async function fixMismatches() {
  console.log('🔧 FIXING SVG/DB MISMATCHES\n');
  console.log('='.repeat(60));

  // Stations that are in SVG but not in DB - need to add to DB
  const stationsToAdd = [
    { id: 'punggol-coast', name: 'Punggol Coast' },
    { id: 'hume', name: 'Hume' },
    // Note: bukit-batok-alt is intentionally an alternate position, skip it
  ];

  console.log('\n📥 Adding missing stations to database...\n');

  for (const station of stationsToAdd) {
    console.log(`Processing: ${station.name}...`);

    // Get coordinates from OneMap
    const coords = await fetchOneMapCoordinates(station.name);

    if (coords) {
      console.log(`  ✓ Found coordinates: ${coords.lat}, ${coords.lng}`);

      const { error } = await supabase
        .from('stations')
        .insert({
          id: station.id,
          name: station.name,
          lat: coords.lat,
          lng: coords.lng,
        });

      if (error) {
        if (error.code === '23505') {
          console.log(`  ⚠️  Station already exists, skipping`);
        } else {
          console.log(`  ❌ Error inserting: ${error.message}`);
        }
      } else {
        console.log(`  ✅ Added to database`);
      }
    } else {
      console.log(`  ⚠️  Could not find coordinates, adding without lat/lng`);

      const { error } = await supabase
        .from('stations')
        .insert({
          id: station.id,
          name: station.name,
        });

      if (error) {
        if (error.code === '23505') {
          console.log(`  ⚠️  Station already exists, skipping`);
        } else {
          console.log(`  ❌ Error inserting: ${error.message}`);
        }
      } else {
        console.log(`  ✅ Added to database (without coordinates)`);
      }
    }

    // Small delay for API rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Mount Pleasant - need to find its SVG position
  console.log('\n='.repeat(60));
  console.log('\n📍 MOUNT PLEASANT STATION:\n');
  console.log('This station exists in DB but has no clickable circle on the map.');
  console.log('Mount Pleasant is on the Thomson-East Coast Line (TEL).\n');

  // Get coordinates for Mount Pleasant
  const mpCoords = await fetchOneMapCoordinates('Mount Pleasant');
  if (mpCoords) {
    console.log(`OneMap coordinates: ${mpCoords.lat}, ${mpCoords.lng}`);
    console.log('\nTo add to stationCoordinates in MRTMap.tsx:');
    console.log(`  'mount-pleasant': { cx: ???, cy: ???, name: 'Mount Pleasant' },`);
    console.log('\nYou need to find the correct cx, cy pixel position on the SVG.');
  }

  // Final verification
  console.log('\n='.repeat(60));
  console.log('\n📊 FINAL VERIFICATION:\n');

  const { data: stations } = await supabase
    .from('stations')
    .select('id, name, lat, lng')
    .order('name');

  console.log(`Total stations in DB: ${stations?.length || 0}`);

  const withCoords = stations?.filter(s => s.lat && s.lng) || [];
  console.log(`With coordinates: ${withCoords.length}`);

  console.log('\n✅ Database fixes complete!');
  console.log('\n⚠️  NOTE: You still need to manually add Mount Pleasant');
  console.log('   to stationCoordinates in MRTMap.tsx to make it clickable.\n');
}

fixMismatches();
