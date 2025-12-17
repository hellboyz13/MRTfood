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
  offset?: number;
}

// ============================================
// SEARCH RESPONSE WITH PAGINATION
// ============================================
export interface SearchResponse {
  results: StationSearchResult[];
  hasMore: boolean;
  totalReturned: number;
}

export interface RawSearchResponse {
  results: SearchFoodResult[];
  hasMore: boolean;
  totalReturned: number;
}

export const DEFAULT_PAGE_SIZE = 20;

// ============================================
// MAIN SEARCH FUNCTION - Uses search_food() RPC
// ============================================
export async function searchStationsByFood(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResponse> {
  const emptyResponse: SearchResponse = { results: [], hasMore: false, totalReturned: 0 };

  if (!query || query.trim().length < 2) return emptyResponse;

  const searchQuery = query.trim();
  const queryLower = searchQuery.toLowerCase();

  console.log(`🔍 Search: "${searchQuery}"`);

  // Validate short queries
  if (searchQuery.length < 3 && !VALID_SHORT_QUERIES.has(queryLower)) {
    console.log('⚠️ Query too short, skipping');
    return emptyResponse;
  }

  const {
    includeListings = true,
    includeOutlets = true,
    limit = DEFAULT_PAGE_SIZE,
    offset = 0,
  } = options;

  // Request one extra to check if there are more results
  const requestLimit = limit + 1;

  // Call the search_food() RPC function
  const { data, error } = await (supabase.rpc as any)('search_food', {
    search_query: searchQuery,
    result_limit: requestLimit,
    result_offset: offset,
    include_listings: includeListings,
    include_outlets: includeOutlets,
  });

  if (error) {
    console.error('Search RPC error:', error);
    return emptyResponse;
  }

  if (!data || data.length === 0) {
    console.log('No results found');
    return emptyResponse;
  }

  // Check if there are more results
  const hasMore = data.length > limit;
  // Only use the requested limit, not the extra one
  const limitedData = hasMore ? data.slice(0, limit) : data;

  console.log(`📊 RPC returned ${limitedData.length} results (hasMore: ${hasMore})`);

  const searchResults = limitedData as SearchFoodResult[];

  // For outlets, we need to look up station_id and mall_id from mall name
  // Get unique mall names from outlet results
  const mallNames = [...new Set(
    searchResults
      .filter(r => r.source_type === 'outlet')
      .map(r => r.source_name)
  )];

  // Fetch mall -> station and mall -> id mappings if we have outlet results
  let mallStationMap = new Map<string, string>();
  let mallIdMap = new Map<string, string>();
  if (mallNames.length > 0) {
    const { data: malls } = await supabase
      .from('malls')
      .select('id, name, station_id')
      .in('name', mallNames);

    if (malls) {
      malls.forEach((mall: { id: string; name: string; station_id: string }) => {
        mallStationMap.set(mall.name, mall.station_id);
        mallIdMap.set(mall.name, mall.id);
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
      match.mallId = mallIdMap.get(result.source_name);
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
  return {
    results,
    hasMore,
    totalReturned: searchResults.length,
  };
}

// ============================================
// RAW SEARCH - Returns flat list without grouping
// ============================================
export async function searchFoodRaw(
  query: string,
  options: SearchOptions = {}
): Promise<RawSearchResponse> {
  const emptyResponse: RawSearchResponse = { results: [], hasMore: false, totalReturned: 0 };

  if (!query || query.trim().length < 2) return emptyResponse;

  const searchQuery = query.trim();
  const queryLower = searchQuery.toLowerCase();

  // Validate short queries
  if (searchQuery.length < 3 && !VALID_SHORT_QUERIES.has(queryLower)) {
    return emptyResponse;
  }

  const {
    includeListings = true,
    includeOutlets = true,
    limit = DEFAULT_PAGE_SIZE,
    offset = 0,
  } = options;

  // Request one extra to check if there are more results
  const requestLimit = limit + 1;

  const { data, error } = await (supabase.rpc as any)('search_food', {
    search_query: searchQuery,
    result_limit: requestLimit,
    result_offset: offset,
    include_listings: includeListings,
    include_outlets: includeOutlets,
  });

  if (error) {
    console.error('Search RPC error:', error);
    return emptyResponse;
  }

  if (!data || data.length === 0) {
    return emptyResponse;
  }

  // Check if there are more results
  const hasMore = data.length > limit;
  const limitedData = hasMore ? data.slice(0, limit) : data;

  return {
    results: limitedData as SearchFoodResult[],
    hasMore,
    totalReturned: limitedData.length,
  };
}

// ============================================
// EXPORT FOR API COMPATIBILITY
// ============================================
export { searchStationsByFood as searchStationsByFoodWithCounts };
