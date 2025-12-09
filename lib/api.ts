import { supabase } from './supabase';
import {
  Station,
  FoodSource,
  FoodListing,
  SponsoredListing,
  FoodListingWithSources,
  StationFoodData,
  ListingSourceWithDetails,
  ChainBrand,
  ChainOutlet,
  ChainOutletWithBrand,
  GroupedChainOutlets,
} from '@/types/database';
import { getChainTagWeights, calculateTagMatchScore } from './tag-weights';

// ============================================
// STATIONS
// ============================================
export async function getStations(): Promise<Station[]> {
  const { data, error } = await supabase
    .from('stations')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching stations:', error);
    return [];
  }

  return data || [];
}

export async function getStation(stationId: string): Promise<Station | null> {
  if (!stationId) {
    console.warn('getStation called with empty stationId');
    return null;
  }

  const { data, error } = await supabase
    .from('stations')
    .select('*')
    .eq('id', stationId)
    .single();

  if (error) {
    // PGRST116 = no rows returned, which is normal for stations without data
    if (error.code !== 'PGRST116') {
      console.error('Error fetching station:', stationId, error);
    }
    return null;
  }

  return data;
}

// ============================================
// FOOD SOURCES
// ============================================
export async function getFoodSources(): Promise<FoodSource[]> {
  const { data, error } = await supabase
    .from('food_sources')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching food sources:', error);
    return [];
  }

  return data || [];
}

// ============================================
// SPONSORED LISTINGS
// ============================================
export async function getSponsoredListing(
  stationId: string
): Promise<SponsoredListing | null> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('sponsored_listings')
    .select('*')
    .eq('station_id', stationId)
    .eq('is_active', true)
    .lte('start_date', today)
    .gte('end_date', today)
    .limit(1);

  if (error) {
    console.error('Error fetching sponsored listing:', error);
    return null;
  }

  return data && data.length > 0 ? data[0] : null;
}

// ============================================
// FOOD LISTINGS (Multi-source via junction table)
// ============================================

// Source IDs to exclude from listings (Michelin 1-3 stars)
const EXCLUDED_SOURCE_IDS = ['michelin-1-star', 'michelin-2-star', 'michelin-3-star'];

// Get listings with all their sources via junction table
export async function getFoodListingsByStation(
  stationId: string
): Promise<FoodListingWithSources[]> {
  // First get all listings for this station
  const { data: listings, error: listingsError } = await supabase
    .from('food_listings')
    .select('*')
    .eq('station_id', stationId)
    .eq('is_active', true);

  if (listingsError || !listings || listings.length === 0) {
    if (listingsError) console.error('Error fetching food listings:', listingsError);
    return [];
  }

  // Get all listing_sources for these listings with joined food_sources
  const listingIds = listings.map((l: FoodListing) => l.id);
  const { data: listingSources, error: sourcesError } = await supabase
    .from('listing_sources')
    .select(`
      listing_id,
      source_url,
      is_primary,
      food_sources (*)
    `)
    .in('listing_id', listingIds);

  if (sourcesError) {
    console.error('Error fetching listing sources:', sourcesError);
  }

  // Group sources by listing_id
  const sourcesByListing = new Map<string, ListingSourceWithDetails[]>();
  (listingSources || []).forEach((ls: { listing_id: string; source_url: string; is_primary: boolean; food_sources: FoodSource | null }) => {
    if (!ls.food_sources) return;
    const sources = sourcesByListing.get(ls.listing_id) || [];
    sources.push({
      source: ls.food_sources,
      source_url: ls.source_url || '',
      is_primary: ls.is_primary,
    });
    sourcesByListing.set(ls.listing_id, sources);
  });

  // Combine listings with their sources and compute trust score
  const result: FoodListingWithSources[] = listings.map((listing: FoodListing) => {
    const sources = sourcesByListing.get(listing.id) || [];
    // Sort sources: primary first, then by weight descending
    sources.sort((a, b) => {
      if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
      return (b.source.weight || 1) - (a.source.weight || 1);
    });
    const trust_score = sources.reduce((sum, s) => sum + (s.source.weight || 1), 0);
    return {
      ...listing,
      sources,
      trust_score,
    };
  });

  // Filter out listings that ONLY have excluded sources (Michelin 1-3 stars)
  const filteredResult = result.filter(listing => {
    // Get all source IDs for this listing
    const sourceIds = listing.sources.map(s => s.source.id);
    // Check if listing has at least one non-excluded source
    const hasValidSource = sourceIds.some(id => !EXCLUDED_SOURCE_IDS.includes(id));
    return hasValidSource || sourceIds.length === 0;
  });

  // Sort by trust score descending
  filteredResult.sort((a, b) => (b.trust_score || 0) - (a.trust_score || 0));

  return filteredResult;
}

// ============================================
// COMBINED STATION FOOD DATA
// ============================================
export async function getStationFoodData(
  stationId: string
): Promise<StationFoodData | null> {
  const [station, sponsored, listings] = await Promise.all([
    getStation(stationId),
    getSponsoredListing(stationId),
    getFoodListingsByStation(stationId),
  ]);

  if (!station) {
    return null;
  }

  return {
    station,
    sponsored,
    listings,
  };
}

// ============================================
// SEARCH
// ============================================
export async function searchFoodListings(
  query: string
): Promise<FoodListingWithSources[]> {
  // First get matching listings
  const { data: listings, error: listingsError } = await supabase
    .from('food_listings')
    .select('*')
    .eq('is_active', true)
    .or(`name.ilike.%${query}%,description.ilike.%${query}%,tags.cs.{${query}}`)
    .order('rating', { ascending: false })
    .limit(20);

  if (listingsError || !listings || listings.length === 0) {
    if (listingsError) console.error('Error searching food listings:', listingsError);
    return [];
  }

  // Get sources for these listings
  const listingIds = listings.map((l: FoodListing) => l.id);
  const { data: listingSources, error: sourcesError } = await supabase
    .from('listing_sources')
    .select(`
      listing_id,
      source_url,
      is_primary,
      food_sources (*)
    `)
    .in('listing_id', listingIds);

  if (sourcesError) {
    console.error('Error fetching listing sources:', sourcesError);
  }

  // Group sources by listing_id
  const sourcesByListing = new Map<string, ListingSourceWithDetails[]>();
  (listingSources || []).forEach((ls: { listing_id: string; source_url: string; is_primary: boolean; food_sources: FoodSource | null }) => {
    if (!ls.food_sources) return;
    const sources = sourcesByListing.get(ls.listing_id) || [];
    sources.push({
      source: ls.food_sources,
      source_url: ls.source_url || '',
      is_primary: ls.is_primary,
    });
    sourcesByListing.set(ls.listing_id, sources);
  });

  // Combine listings with their sources
  const result = listings.map((listing: FoodListing) => {
    const sources = sourcesByListing.get(listing.id) || [];
    sources.sort((a, b) => {
      if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
      return (b.source.weight || 1) - (a.source.weight || 1);
    });
    const trust_score = sources.reduce((sum, s) => sum + (s.source.weight || 1), 0);
    return {
      ...listing,
      sources,
      trust_score,
    };
  });

  // Filter out listings that ONLY have excluded sources (Michelin 1-3 stars)
  return result.filter(listing => {
    const sourceIds = listing.sources.map(s => s.source.id);
    const hasValidSource = sourceIds.some(id => !EXCLUDED_SOURCE_IDS.includes(id));
    return hasValidSource || sourceIds.length === 0;
  });
}

// ============================================
// STATIONS BY SOURCE FILTER
// ============================================

// Get station IDs that have listings from specific source(s)
export async function getStationsBySource(
  sourceIds: string[]
): Promise<string[]> {
  if (sourceIds.length === 0) return [];

  // Query listing_sources to find all listings with these sources
  const { data: listingSources, error: sourcesError } = await supabase
    .from('listing_sources')
    .select('listing_id')
    .in('source_id', sourceIds);

  if (sourcesError || !listingSources || listingSources.length === 0) {
    if (sourcesError) console.error('Error fetching listing sources:', sourcesError);
    return [];
  }

  // Get unique listing IDs
  const listingIds = [...new Set((listingSources as { listing_id: string }[]).map(ls => ls.listing_id))];

  // Get station IDs for these listings
  const { data: listings, error: listingsError } = await supabase
    .from('food_listings')
    .select('station_id')
    .in('id', listingIds)
    .eq('is_active', true);

  if (listingsError || !listings) {
    if (listingsError) console.error('Error fetching listings:', listingsError);
    return [];
  }

  // Return unique station IDs
  return [...new Set((listings as { station_id: string | null }[]).map(l => l.station_id).filter(Boolean))] as string[];
}

// Get station IDs that have 24/7 listings
export async function getStationsWith24h(): Promise<string[]> {
  const { data: listings, error } = await supabase
    .from('food_listings')
    .select('station_id')
    .eq('is_active', true)
    .eq('is_24h', true)
    .not('station_id', 'is', null);

  if (error || !listings) {
    if (error) console.error('Error fetching 24h listings:', error);
    return [];
  }

  // Return unique station IDs
  return [...new Set((listings as { station_id: string | null }[]).map(l => l.station_id).filter(Boolean))] as string[];
}

// ============================================
// UNIFIED SEARCH - Food & Restaurant
// ============================================

export interface SearchMatch {
  id: string;           // listing ID or outlet ID
  name: string;         // restaurant/outlet name
  type: 'curated' | 'chain';
  matchType: 'food' | 'restaurant';
  matchedTags?: string[];  // What tags matched (for food search)
}

export interface StationSearchResult {
  stationId: string;
  matches: SearchMatch[];
}

// Determine if query is searching for food or restaurant name
function detectSearchType(query: string): 'food' | 'restaurant' {
  // Heuristics to detect restaurant name search:
  // 1. Contains common chain indicators (brand names often have these)
  // 2. Multiple capital letters (e.g., "DTF", "KFC")
  // 3. Length > 8 chars with mixed case suggests brand name

  // Simple heuristic: if query has 2+ consecutive capitals or specific brand patterns, it's likely a restaurant
  const hasMultipleCaps = /[A-Z]{2,}/.test(query);
  const hasNumber = /\d/.test(query);

  // Known restaurant patterns
  const restaurantPatterns = [
    /koi/i, /gong cha/i, /din tai/i, /tim ho/i, /chicha/i, /tiger sugar/i,
    /mcdonald/i, /kfc/i, /subway/i, /xiang xiang/i, /haidilao/i,
    /genki/i, /sushi/i, /pepper lunch/i, /crystal jade/i
  ];

  const matchesRestaurantPattern = restaurantPatterns.some(pattern => pattern.test(query));

  // If it looks like a brand name, treat as restaurant search
  if (hasMultipleCaps || hasNumber || (matchesRestaurantPattern && query.length >= 3)) {
    return 'restaurant';
  }

  // Otherwise, treat as food search
  return 'food';
}

// Check if food tags match the search query (whole word matching only)
function matchesFoodTags(searchQuery: string, tags: string[]): { matches: boolean; matchedTags: string[] } {
  if (!tags || tags.length === 0) return { matches: false, matchedTags: [] };

  const queryLower = searchQuery.toLowerCase().trim();
  const matchedTags: string[] = [];

  for (const tag of tags) {
    const tagLower = tag.toLowerCase().trim();

    // Exact match
    if (tagLower === queryLower) {
      matchedTags.push(tag);
      continue;
    }

    // Check if query is a whole word within the tag
    // e.g., "chicken" matches "fried chicken" but NOT "chicha"
    const tagWords = tagLower.split(/\s+/);
    const queryWords = queryLower.split(/\s+/);

    // All query words must be present as complete words in the tag
    const allWordsMatch = queryWords.every(qw =>
      tagWords.some(tw => tw === qw)
    );

    if (allWordsMatch) {
      matchedTags.push(tag);
    }
  }

  return { matches: matchedTags.length > 0, matchedTags };
}

// NEW: Unified search that handles both food and restaurant searches
export async function searchStationsByFoodWithCounts(query: string): Promise<StationSearchResult[]> {
  if (!query || query.trim().length === 0) return [];

  const searchQuery = query.trim();
  const searchType = detectSearchType(searchQuery);
  const queryLower = searchQuery.toLowerCase();

  console.log(`🔍 Search type: ${searchType}, query: "${searchQuery}"`);

  const stationResultsMap = new Map<string, StationSearchResult>();

  // ===== SEARCH CURATED LISTINGS (Michelin/Eatbook) =====
  const { data: listings, error: listingsError } = await supabase
    .from('food_listings')
    .select('id, station_id, name, description, tags')
    .eq('is_active', true)
    .not('station_id', 'is', null);

  // Get sources for all listings to filter out Michelin 1-3 star only listings
  let listingSourceMap = new Map<string, string[]>();
  if (listings && listings.length > 0) {
    const listingIds = listings.map((l: FoodListing) => l.id);
    const { data: listingSources } = await supabase
      .from('listing_sources')
      .select('listing_id, source_id')
      .in('listing_id', listingIds);

    if (listingSources) {
      listingSources.forEach((ls: { listing_id: string; source_id: string }) => {
        const sources = listingSourceMap.get(ls.listing_id) || [];
        sources.push(ls.source_id);
        listingSourceMap.set(ls.listing_id, sources);
      });
    }
  }

  if (!listingsError && listings) {
    listings.forEach((listing: FoodListing) => {
      // Filter out listings that ONLY have Michelin 1-3 star sources
      const sourceIds = listingSourceMap.get(listing.id) || [];
      const hasValidSource = sourceIds.some(id => !EXCLUDED_SOURCE_IDS.includes(id));
      if (sourceIds.length > 0 && !hasValidSource) return; // Skip this listing
      if (!listing.station_id) return;

      let matched = false;
      let matchType: 'food' | 'restaurant' = 'food';
      let matchedTags: string[] = [];

      if (searchType === 'restaurant') {
        // Restaurant name search: partial match on name
        if (listing.name?.toLowerCase().includes(queryLower)) {
          matched = true;
          matchType = 'restaurant';
        }
      } else {
        // Food search: match against tags (whole word only)
        if (listing.tags && Array.isArray(listing.tags)) {
          const tagMatch = matchesFoodTags(searchQuery, listing.tags);
          if (tagMatch.matches) {
            matched = true;
            matchType = 'food';
            matchedTags = tagMatch.matchedTags;
          }
        }

        // Also check description for food keywords (whole word)
        if (!matched && listing.description) {
          const descWords = listing.description.toLowerCase().split(/\s+/);
          const queryWords = queryLower.split(/\s+/);
          const allWordsMatch = queryWords.every(qw => descWords.includes(qw));
          if (allWordsMatch) {
            matched = true;
            matchType = 'food';
          }
        }
      }

      if (matched) {
        if (!stationResultsMap.has(listing.station_id)) {
          stationResultsMap.set(listing.station_id, {
            stationId: listing.station_id,
            matches: [],
          });
        }

        stationResultsMap.get(listing.station_id)!.matches.push({
          id: listing.id,
          name: listing.name || 'Unknown',
          type: 'curated',
          matchType,
          matchedTags: matchedTags.length > 0 ? matchedTags : undefined,
        });
      }
    });
  }

  // ===== SEARCH CHAIN OUTLETS =====
  const { data: chainOutlets, error: outletsError } = await supabase
    .from('chain_outlets')
    .select('id, nearest_station_id, name, brand_id')
    .eq('is_active', true)
    .not('nearest_station_id', 'is', null);

  if (!outletsError && chainOutlets) {
    chainOutlets.forEach((outlet: any) => {
      if (!outlet.nearest_station_id) return;

      let matched = false;
      let matchType: 'food' | 'restaurant' = 'food';
      let matchedTags: string[] = [];

      if (searchType === 'restaurant') {
        // Restaurant name search: partial match on outlet/brand name
        if (outlet.name?.toLowerCase().includes(queryLower)) {
          matched = true;
          matchType = 'restaurant';
        }
      } else {
        // Food search: match against weighted tags
        const tagWeights = getChainTagWeights(outlet.brand_id);

        // Check primary tags first (exact or whole-word match)
        const primaryMatch = matchesFoodTags(searchQuery, tagWeights.primary);
        if (primaryMatch.matches) {
          matched = true;
          matchType = 'food';
          matchedTags = primaryMatch.matchedTags;
        }

        // If no primary match, check secondary tags (but only for longer queries to reduce noise)
        if (!matched && searchQuery.length >= 5) {
          const secondaryMatch = matchesFoodTags(searchQuery, tagWeights.secondary);
          if (secondaryMatch.matches) {
            matched = true;
            matchType = 'food';
            matchedTags = secondaryMatch.matchedTags;
          }
        }
      }

      if (matched) {
        if (!stationResultsMap.has(outlet.nearest_station_id)) {
          stationResultsMap.set(outlet.nearest_station_id, {
            stationId: outlet.nearest_station_id,
            matches: [],
          });
        }

        stationResultsMap.get(outlet.nearest_station_id)!.matches.push({
          id: outlet.id,
          name: outlet.name,
          type: 'chain',
          matchType,
          matchedTags: matchedTags.length > 0 ? matchedTags : undefined,
        });
      }
    });
  }

  // Convert to array and sort by number of matches
  const results = Array.from(stationResultsMap.values());
  results.sort((a, b) => b.matches.length - a.matches.length);

  console.log(`✅ Found ${results.length} stations with matches`);

  return results;
}

// ============================================
// CHAIN RESTAURANTS
// ============================================

// Get all chain brands
export async function getChainBrands(): Promise<ChainBrand[]> {
  const { data, error } = await supabase
    .from('chain_brands')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching chain brands:', error);
    return [];
  }

  return data || [];
}

// Get chain outlets by station - grouped by brand
export async function getChainOutletsByStation(
  stationId: string
): Promise<GroupedChainOutlets[]> {
  // Get all outlets for this station within 1km (reasonable walking distance)
  const { data: outlets, error: outletsError } = await supabase
    .from('chain_outlets')
    .select(`
      *,
      chain_brands (*)
    `)
    .eq('nearest_station_id', stationId)
    .eq('is_active', true)
    .lte('distance_to_station', 1000) // Max 1km (12-15 min walk)
    .order('distance_to_station', { ascending: true });

  if (outletsError || !outlets || outlets.length === 0) {
    if (outletsError) console.error('Error fetching chain outlets:', outletsError);
    return [];
  }

  // Group outlets by brand
  const brandMap = new Map<string, GroupedChainOutlets>();

  outlets.forEach((outlet: any) => {
    if (!outlet.chain_brands) return;

    const brand = outlet.chain_brands as ChainBrand;
    if (!brandMap.has(brand.id)) {
      brandMap.set(brand.id, {
        brand,
        outlets: [],
      });
    }

    // Remove the nested brand from outlet
    const { chain_brands, ...outletData } = outlet;
    brandMap.get(brand.id)!.outlets.push(outletData as ChainOutlet);
  });

  // Convert to array and sort by brand name
  const result = Array.from(brandMap.values());
  result.sort((a, b) => a.brand.name.localeCompare(b.brand.name));

  return result;
}
