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
  ADDRESS?: string;
}

interface OneMapResponse {
  found: number;
  totalNumPages: number;
  pageNum: number;
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

    // Try without "MRT" suffix if first search fails
    const fallbackQuery = encodeURIComponent(stationName);
    const fallbackUrl = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${fallbackQuery}&returnGeom=Y&getAddrDetails=N`;

    const fallbackResponse = await fetch(fallbackUrl);
    const fallbackData: OneMapResponse = await fallbackResponse.json();

    if (fallbackData.found > 0 && fallbackData.results.length > 0) {
      // Filter results to find MRT station
      const mrtResult = fallbackData.results.find(r =>
        r.SEARCHVAL.toUpperCase().includes('MRT') ||
        r.SEARCHVAL.toUpperCase().includes('STATION')
      );

      if (mrtResult) {
        return {
          lat: parseFloat(mrtResult.LATITUDE),
          lng: parseFloat(mrtResult.LONGITUDE),
        };
      }
    }

    return null;
  } catch (error) {
    console.error(`Error fetching coordinates for ${stationName}:`, error);
    return null;
  }
}

async function updateMissingCoordinates() {
  console.log('🗺️  Fetching stations with missing coordinates...\n');

  // Get all stations without coordinates
  const { data: stations, error } = await supabase
    .from('stations')
    .select('id, name, lat, lng')
    .or('lat.is.null,lng.is.null')
    .order('name');

  if (error) {
    console.error('Error fetching stations:', error);
    return;
  }

  if (!stations || stations.length === 0) {
    console.log('✅ All stations already have coordinates!');
    return;
  }

  console.log(`Found ${stations.length} stations missing coordinates:\n`);
  stations.forEach((s, i) => {
    console.log(`  ${(i + 1).toString().padStart(2)}. ${s.name}`);
  });

  console.log('\n🔄 Fetching coordinates from OneMap API...\n');

  let successCount = 0;
  let failCount = 0;

  for (const station of stations) {
    console.log(`\n📍 Processing: ${station.name}`);

    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));

    const coords = await fetchOneMapCoordinates(station.name);

    if (coords) {
      console.log(`   ✓ Found: ${coords.lat}, ${coords.lng}`);

      // Update database
      const { error: updateError } = await supabase
        .from('stations')
        .update({
          lat: coords.lat,
          lng: coords.lng,
        })
        .eq('id', station.id);

      if (updateError) {
        console.log(`   ❌ Failed to update database:`, updateError.message);
        failCount++;
      } else {
        console.log(`   ✅ Updated in database`);
        successCount++;
      }
    } else {
      console.log(`   ❌ Could not find coordinates`);
      failCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 SUMMARY:`);
  console.log(`   ✅ Successfully updated: ${successCount} stations`);
  console.log(`   ❌ Failed: ${failCount} stations`);

  // Final verification
  console.log('\n🔍 Verifying all stations...\n');

  const { data: allStations } = await supabase
    .from('stations')
    .select('id, name, lat, lng')
    .order('name');

  const withCoords = allStations?.filter(s => s.lat && s.lng) || [];
  const withoutCoords = allStations?.filter(s => !s.lat || !s.lng) || [];

  console.log(`Total stations: ${allStations?.length || 0}`);
  console.log(`With coordinates: ${withCoords.length}`);
  console.log(`Still missing: ${withoutCoords.length}`);

  if (withoutCoords.length > 0) {
    console.log('\n⚠️  Stations still missing coordinates:');
    withoutCoords.forEach((s, i) => {
      console.log(`  ${(i + 1).toString().padStart(2)}. ${s.name} (${s.id})`);
    });
  } else {
    console.log('\n🎉 All stations now have coordinates!');
  }
}

updateMissingCoordinates();
