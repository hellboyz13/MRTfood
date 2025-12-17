import { supabase } from './supabase';
import { StationSearchResult, SearchMatch } from '@/types/database';
import { VALID_SHORT_QUERIES } from './food-taxonomy';

// ============================================
// SEARCH RESULT FROM RPC
// ============================================
interface SearchFoodResult {
  id: string;
  name: string;
  source_type: 'listing' | 'outlet';
  source_name: string; // station_id for listings, mall name for outlets
  rating: number | null;
  relevance_score: number;
}

// ============================================
// SEARCH OPTIONS
// ============================================
export interface SearchOptions {
  includeListings?: boolean;
  includeOutlets?: boolean;
  limit?: number;
}

// ============================================
// MAIN SEARCH FUNCTION - Uses search_food() RPC
// ============================================
export async function searchStationsByFood(
  query: string,
  options: SearchOptions = {}
): Promise<StationSearchResult[]> {
  if (!query || query.trim().length < 2) return [];

  const searchQuery = query.trim();
  const queryLower = searchQuery.toLowerCase();

  console.log(`🔍 Search: "${searchQuery}"`);

  // Validate short queries
  if (searchQuery.length < 3 && !VALID_SHORT_QUERIES.has(queryLower)) {
    console.log('⚠️ Query too short, skipping');
    return [];
  }

  const {
    includeListings = true,
    includeOutlets = true,
    limit = 100,
  } = options;

  // Call the search_food() RPC function
  const { data, error } = await (supabase.rpc as any)('search_food', {
    search_query: searchQuery,
    result_limit: limit,
    include_listings: includeListings,
    include_outlets: includeOutlets,
  });

  if (error) {
    console.error('Search RPC error:', error);
    return [];
  }

  if (!data || data.length === 0) {
    console.log('No results found');
    return [];
  }

  console.log(`📊 RPC returned ${data.length} results`);

  const searchResults = data as SearchFoodResult[];

  // For outlets, we need to look up station_id from mall name
  // Get unique mall names from outlet results
  const mallNames = [...new Set(
    searchResults
      .filter(r => r.source_type === 'outlet')
      .map(r => r.source_name)
  )];

  // Fetch mall -> station mappings if we have outlet results
  let mallStationMap = new Map<string, string>();
  if (mallNames.length > 0) {
    const { data: malls } = await supabase
      .from('malls')
      .select('name, station_id')
      .in('name', mallNames);

    if (malls) {
      malls.forEach((mall: { name: string; station_id: string }) => {
        mallStationMap.set(mall.name, mall.station_id);
      });
    }
  }

  // Group results by station
  const stationResultsMap = new Map<string, StationSearchResult>();

  searchResults.forEach((result) => {
    // Determine station ID based on source type
    let stationId: string | null = null;

    if (result.source_type === 'listing') {
      // For listings, source_name IS the station_id
      stationId = result.source_name;
    } else {
      // For outlets, look up station from mall name
      stationId = mallStationMap.get(result.source_name) || null;
    }

    if (!stationId) return;

    if (!stationResultsMap.has(stationId)) {
      stationResultsMap.set(stationId, {
        stationId,
        matches: [],
      });
    }

    const match: SearchMatch = {
      id: result.id,
      name: result.name,
      type: result.source_type === 'listing' ? 'curated' : 'mall',
      matchType: 'food', // Default to food, can be enhanced later
      score: result.relevance_score,
    };

    // Add mall info for outlet results
    if (result.source_type === 'outlet') {
      match.mallName = result.source_name;
    }

    stationResultsMap.get(stationId)!.matches.push(match);
  });

  // Convert to array and sort by best match score
  const results = Array.from(stationResultsMap.values());

  // Sort stations by: number of matches, then by best match score
  results.sort((a, b) => {
    // More matches = higher priority
    if (b.matches.length !== a.matches.length) {
      return b.matches.length - a.matches.length;
    }
    // Better score = higher priority (lower score is better)
    const aScore = Math.min(...a.matches.map((m) => m.score || 1));
    const bScore = Math.min(...b.matches.map((m) => m.score || 1));
    return aScore - bScore;
  });

  // Sort matches within each station by score
  results.forEach((r) => {
    r.matches.sort((a, b) => (a.score || 1) - (b.score || 1));
  });

  console.log(`✅ Found ${results.length} stations with matches`);
  return results;
}

// ============================================
// RAW SEARCH - Returns flat list without grouping
// ============================================
export async function searchFoodRaw(
  query: string,
  options: SearchOptions = {}
): Promise<SearchFoodResult[]> {
  if (!query || query.trim().length < 2) return [];

  const searchQuery = query.trim();
  const queryLower = searchQuery.toLowerCase();

  // Validate short queries
  if (searchQuery.length < 3 && !VALID_SHORT_QUERIES.has(queryLower)) {
    return [];
  }

  const {
    includeListings = true,
    includeOutlets = true,
    limit = 100,
  } = options;

  const { data, error } = await (supabase.rpc as any)('search_food', {
    search_query: searchQuery,
    result_limit: limit,
    include_listings: includeListings,
    include_outlets: includeOutlets,
  });

  if (error) {
    console.error('Search RPC error:', error);
    return [];
  }

  return (data as SearchFoodResult[]) || [];
}

// ============================================
// EXPORT FOR API COMPATIBILITY
// ============================================
export { searchStationsByFood as searchStationsByFoodWithCounts };
