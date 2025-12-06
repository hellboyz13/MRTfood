import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local file
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugSearchResult() {
  console.log('🔍 Debugging search results for "chicha"...\n');

  // Replicate the search logic from lib/api.ts searchStationsByFoodWithCounts
  const searchQuery = 'chicha';

  // Get chain outlets matching "chicha"
  const { data: chainOutlets, error: outletsError } = await supabase
    .from('chain_outlets')
    .select('id, name, nearest_station_id, food_tags, address')
    .is('is_active', true);

  if (outletsError) {
    console.error('Error:', outletsError);
    return;
  }

  console.log(`Total active chain outlets: ${chainOutlets?.length || 0}\n`);

  // Filter matching outlets (same logic as lib/api.ts)
  const matchingOutlets = chainOutlets?.filter((outlet: any) => {
    // For longer queries (4+ chars), allow partial brand name matching
    if (searchQuery.length >= 4 && outlet.name?.toLowerCase().includes(searchQuery)) {
      return true;
    }

    // Check food tags
    if (outlet.food_tags && Array.isArray(outlet.food_tags)) {
      return outlet.food_tags.some((tag: string) => tag.toLowerCase().includes(searchQuery));
    }

    return false;
  });

  console.log(`Matching outlets for "${searchQuery}": ${matchingOutlets?.length || 0}\n`);

  // Group by station
  const stationGroups = new Map<string, any[]>();
  matchingOutlets?.forEach(outlet => {
    const stationId = outlet.nearest_station_id;
    if (!stationGroups.has(stationId)) {
      stationGroups.set(stationId, []);
    }
    stationGroups.get(stationId)!.push(outlet);
  });

  console.log('📍 Stations with matching outlets:');
  for (const [stationId, outlets] of stationGroups) {
    console.log(`\n  ${stationId}: ${outlets.length} outlets`);
    outlets.forEach(o => {
      console.log(`    - ${o.name}`);
      console.log(`      Address: ${o.address}`);
    });
  }

  // Get station names
  const stationIds = Array.from(stationGroups.keys());
  const { data: stations, error: stationsError } = await supabase
    .from('stations')
    .select('id, name')
    .in('id', stationIds);

  console.log('\n📍 Station ID to Name mapping:');
  stations?.forEach(s => {
    console.log(`  ${s.id} → ${s.name}`);
  });
}

debugSearchResult();
