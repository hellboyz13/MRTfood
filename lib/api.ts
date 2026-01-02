import { supabase } from './supabase';
import { adjacentStations, walkingTimes, lrtStations } from './adjacent-stations';
import {
  Station,
  FoodSource,
  FoodListing,
  SponsoredListing,
  FoodListingWithSources,
  StationFoodData,
  NearbyStationRedirect,
  ListingSourceWithDetails,
  ChainBrand,
  ChainOutlet,
  GroupedChainOutlets,
  StationSearchResult,
  SearchMatch,
  ListingPrice,
  Mall,
  MallOutlet,
  MallWithOutletCount,
} from '@/types/database';

// Import and re-export the new food search function and types
import { searchStationsByFoodWithCounts, DEFAULT_PAGE_SIZE } from './food-search';
export { searchStationsByFoodWithCounts, DEFAULT_PAGE_SIZE };
export type { SearchOptions, SearchResponse, RawSearchResponse } from './food-search';

// Re-export types used by other modules
export type { StationSearchResult, SearchMatch } from '@/types/database';

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
// LISTING LOOKUP
// ============================================
export async function getListingStation(listingId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('food_listings')
    .select('station_id')
    .eq('id', listingId)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    console.error('Error fetching listing station:', error);
    return null;
  }

  return (data as { station_id: string }).station_id;
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

  // Fetch prices for all listings
  const { data: listingPrices, error: pricesError } = await supabase
    .from('listing_prices')
    .select('listing_id, description')
    .in('listing_id', listingIds)
    .eq('item_name', 'Price Range');

  if (pricesError) {
    console.error('Error fetching listing prices:', pricesError);
  }

  // Map prices by listing_id
  const pricesByListing = new Map<string, string>();
  (listingPrices || []).forEach((lp: { listing_id: string; description: string | null }) => {
    if (lp.description) {
      pricesByListing.set(lp.listing_id, lp.description);
    }
  });

  // Helper to get base chain name (strips location suffix like "(Katong)")
  const getChainBaseName = (name: string): string => {
    return name.replace(/\s*\([^)]+\)\s*$/, '').trim();
  };

  // Build a map of chain base names to their prices (for price sharing)
  const pricesByChainName = new Map<string, string>();
  listings.forEach((listing: FoodListing) => {
    const price = pricesByListing.get(listing.id);
    if (price) {
      const baseName = getChainBaseName(listing.name);
      if (!pricesByChainName.has(baseName)) {
        pricesByChainName.set(baseName, price);
      }
    }
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
    // Get price: first try direct lookup, then try chain name lookup
    let price_range = pricesByListing.get(listing.id) || null;
    if (!price_range) {
      const baseName = getChainBaseName(listing.name);
      price_range = pricesByChainName.get(baseName) || null;
    }
    return {
      ...listing,
      sources,
      trust_score,
      price_range,
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
  const [station, sponsored, listings, currentMalls] = await Promise.all([
    getStation(stationId),
    getSponsoredListing(stationId),
    getFoodListingsByStation(stationId),
    getMallsByStation(stationId),
  ]);

  if (!station) {
    return null;
  }

  // If station has no listings AND no malls, check for nearby redirect
  if (listings.length === 0 && currentMalls.length === 0 && adjacentStations[stationId]) {
    const nearbyStationIds = adjacentStations[stationId];

    // Try each adjacent station in order until we find one with content
    for (const nearbyId of nearbyStationIds) {
      const [nearbyListings, nearbyMalls, nearbyStation] = await Promise.all([
        getFoodListingsByStation(nearbyId),
        getMallsByStation(nearbyId),
        getStation(nearbyId),
      ]);

      // If nearby station has listings OR malls, show redirect card
      if (nearbyListings.length > 0 || nearbyMalls.length > 0) {
        const walkingMinutes = walkingTimes[stationId]?.[nearbyId];
        const isLRTConnection = lrtStations.has(stationId);
        const mallNames = nearbyMalls.slice(0, 3).map(mall => mall.name); // Top 3 malls

        const nearbyRedirect: NearbyStationRedirect = {
          nearbyStationId: nearbyId,
          nearbyStationName: nearbyStation?.name || nearbyId,
          walkingMinutes,
          isLRTConnection,
          mallNames,
        };

        return {
          station,
          sponsored: null,
          listings: [], // Empty - show redirect card instead
          nearbyRedirect,
        };
      }
    }
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

// Filter response type with pagination
export interface FilterResponse {
  results: StationSearchResult[];
  hasMore: boolean;
  allStationIds?: string[]; // All matching station IDs for map pins (only on first page)
}

const FILTER_PAGE_SIZE = 10;

// Helper: Parse opening hours and check if open at given time
interface OpeningHours {
  periods?: Array<{ open: { day: number; time: string }; close: { day: number; time: string } }>;
  weekdayDescriptions?: string[];
}

function isOpenAtTime(openingHours: OpeningHours | string | null, currentHour: number): boolean | null {
  if (!openingHours) return null; // Unknown

  // Handle periods format (Google-style)
  if (typeof openingHours === 'object' && openingHours.periods) {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday

    for (const period of openingHours.periods) {
      if (period.open.day === dayOfWeek) {
        const openTime = parseInt(period.open.time.substring(0, 2));
        const closeTime = parseInt(period.close.time.substring(0, 2));

        // Handle overnight hours (e.g., 22:00 - 02:00)
        if (closeTime < openTime) {
          // Open if current hour >= open time OR current hour < close time
          if (currentHour >= openTime || currentHour < closeTime) return true;
        } else {
          if (currentHour >= openTime && currentHour < closeTime) return true;
        }
      }
    }
    return false;
  }

  // Handle weekdayDescriptions format
  if (typeof openingHours === 'object' && openingHours.weekdayDescriptions) {
    const desc = openingHours.weekdayDescriptions[0]?.toLowerCase() || '';

    // Check for 24h
    if (desc.includes('24') || desc.includes('open 24')) return true;

    // Parse patterns like "8am to 2am" or "10pm to 3am"
    const timePattern = /(\d{1,2})\s*(am|pm)\s*to\s*(\d{1,2})\s*(am|pm)/i;
    const match = desc.match(timePattern);
    if (match) {
      let openHour = parseInt(match[1]);
      const openPeriod = match[2].toLowerCase();
      let closeHour = parseInt(match[3]);
      const closePeriod = match[4].toLowerCase();

      // Convert to 24h
      if (openPeriod === 'pm' && openHour !== 12) openHour += 12;
      if (openPeriod === 'am' && openHour === 12) openHour = 0;
      if (closePeriod === 'pm' && closeHour !== 12) closeHour += 12;
      if (closePeriod === 'am' && closeHour === 12) closeHour = 0;

      // Handle overnight hours
      if (closeHour < openHour) {
        if (currentHour >= openHour || currentHour < closeHour) return true;
      } else {
        if (currentHour >= openHour && currentHour < closeHour) return true;
      }
      return false;
    }
  }

  // Handle string format (newline-separated days)
  if (typeof openingHours === 'string') {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[new Date().getDay()];
    const lines = openingHours.toLowerCase().split('\n');

    for (const line of lines) {
      if (line.includes(today)) {
        const timePattern = /(\d{1,2}):(\d{2})\s*(am|pm)\s*[–-]\s*(\d{1,2}):(\d{2})\s*(am|pm)/i;
        const match = line.match(timePattern);
        if (match) {
          let openHour = parseInt(match[1]);
          const openPeriod = match[3].toLowerCase();
          let closeHour = parseInt(match[4]);
          const closePeriod = match[6].toLowerCase();

          if (openPeriod === 'pm' && openHour !== 12) openHour += 12;
          if (openPeriod === 'am' && openHour === 12) openHour = 0;
          if (closePeriod === 'pm' && closeHour !== 12) closeHour += 12;
          if (closePeriod === 'am' && closeHour === 12) closeHour = 0;

          if (closeHour < openHour) {
            if (currentHour >= openHour || currentHour < closeHour) return true;
          } else {
            if (currentHour >= openHour && currentHour < closeHour) return true;
          }
          return false;
        }
      }
    }
  }

  return null; // Unknown
}

// Get supper spots sorted by what's open at current time
export async function getSupperSpotsByStation(options?: { limit?: number; offset?: number; currentHour?: number }): Promise<FilterResponse> {
  const limit = options?.limit ?? FILTER_PAGE_SIZE;
  const offset = options?.offset ?? 0;
  const currentHour = options?.currentHour ?? new Date().getHours();

  // Fetch listings that have "Supper" tag
  const { data: listings, error: listingsError } = await supabase
    .from('food_listings')
    .select('id, station_id, name, opening_hours')
    .eq('is_active', true)
    .not('station_id', 'is', null)
    .contains('tags', ['Supper']);

  // Fetch mall outlets open late (common late-night chains, 24h, etc.)
  const { data: mallOutlets, error: mallError } = await supabase
    .from('mall_outlets')
    .select(`
      id, name, mall_id, category, opening_hours,
      malls!inner (id, name, station_id)
    `)
    .or('category.ilike.%supper%,category.ilike.%24%,category.ilike.%late%night%');

  if (listingsError) console.error('Error fetching supper listings:', listingsError);
  if (mallError) console.error('Error fetching supper mall outlets:', mallError);

  // Track open status separately for sorting
  type MatchWithMeta = SearchMatch & { _isOpen?: boolean | null };

  // Group by station with open status
  const stationResultsMap = new Map<string, { stationId: string; matches: MatchWithMeta[]; openCount: number }>();

  // Add curated listings
  (listings || []).forEach((listing: { id: string; station_id: string | null; name: string; opening_hours?: OpeningHours | string | null }) => {
    if (!listing.station_id) return;

    const isOpen = isOpenAtTime(listing.opening_hours || null, currentHour);

    if (!stationResultsMap.has(listing.station_id)) {
      stationResultsMap.set(listing.station_id, {
        stationId: listing.station_id,
        matches: [],
        openCount: 0,
      });
    }

    const station = stationResultsMap.get(listing.station_id)!;
    station.matches.push({
      id: listing.id,
      name: listing.name || 'Unknown',
      type: 'curated',
      matchType: 'restaurant',
      _isOpen: isOpen,
    });
    if (isOpen === true) station.openCount++;
  });

  // Add mall outlets
  (mallOutlets || []).forEach((outlet: { id: string; name: string; mall_id: string; category: string | null; opening_hours?: OpeningHours | string | null; malls: { id: string; name: string; station_id: string } }) => {
    const stationId = outlet.malls?.station_id;
    if (!stationId) return;

    const isOpen = isOpenAtTime(outlet.opening_hours || null, currentHour);

    if (!stationResultsMap.has(stationId)) {
      stationResultsMap.set(stationId, {
        stationId: stationId,
        matches: [],
        openCount: 0,
      });
    }

    const station = stationResultsMap.get(stationId)!;
    station.matches.push({
      id: outlet.id,
      name: outlet.name || 'Unknown',
      type: 'mall',
      matchType: 'restaurant',
      mallName: outlet.malls?.name,
      mallId: outlet.mall_id,
      _isOpen: isOpen,
    });
    if (isOpen === true) station.openCount++;
  });

  // Convert to array
  const allResults = Array.from(stationResultsMap.values());

  // Sort stations: more open places first, then by total matches
  allResults.sort((a, b) => {
    if (b.openCount !== a.openCount) return b.openCount - a.openCount;
    return b.matches.length - a.matches.length;
  });

  // Sort matches within each station: open first, then closed, then unknown
  allResults.forEach(station => {
    station.matches.sort((a, b) => {
      if (a._isOpen === true && b._isOpen !== true) return -1;
      if (b._isOpen === true && a._isOpen !== true) return 1;
      if (a._isOpen === false && b._isOpen === null) return -1;
      if (b._isOpen === false && a._isOpen === null) return 1;
      return 0;
    });
  });

  // Convert to StationSearchResult format (strip internal metadata)
  const results: StationSearchResult[] = allResults.map(s => ({
    stationId: s.stationId,
    matches: s.matches.map(({ _isOpen, ...match }) => match),
  }));

  // Apply pagination
  const paginatedResults = results.slice(offset, offset + limit);
  const hasMore = offset + limit < results.length;

  // Include all station IDs on first page for map pins
  const allStationIds = offset === 0 ? results.map(r => r.stationId) : undefined;

  return { results: paginatedResults, hasMore, allStationIds };
}

// Helper: Get dessert priority score (higher = better dessert, lower = bakery/bread)
function getDessertPriority(category: string | null): number {
  if (!category) return 0;
  const cat = category.toLowerCase();

  // Priority 1: Actual dessert places (ice cream, gelato, desserts, patisserie)
  if (cat.includes('dessert') || cat.includes('ice cream') || cat.includes('gelato')) return 4;
  if (cat.includes('patisserie') || cat.includes('pastry')) return 3;

  // Priority 2: Bubble tea (sweet drinks)
  if (cat.includes('bubble tea') || cat.includes('bbt')) return 2;

  // Priority 3: Pure bakeries (mostly bread)
  if (cat.includes('bakery')) return 1;

  return 0;
}

// Get dessert spots - prioritize desserts/ice cream/cafes over bakeries
export async function getDessertSpotsByStation(options?: { limit?: number; offset?: number }): Promise<FilterResponse> {
  const limit = options?.limit ?? FILTER_PAGE_SIZE;
  const offset = options?.offset ?? 0;

  // Fetch listings that have "Dessert" tag
  const { data: listings, error: listingsError } = await supabase
    .from('food_listings')
    .select('id, station_id, name')
    .eq('is_active', true)
    .not('station_id', 'is', null)
    .contains('tags', ['Dessert']);

  // Fetch mall outlets with dessert-related categories (case-insensitive search)
  // Note: Excluding plain "cafe" to avoid coffee shops - only specific dessert/bakery categories
  const { data: mallOutlets, error: mallError } = await supabase
    .from('mall_outlets')
    .select(`
      id, name, mall_id, category,
      malls!inner (id, name, station_id)
    `)
    .or('category.ilike.%dessert%,category.ilike.%ice cream%,category.ilike.%gelato%,category.ilike.%bakery%,category.ilike.%bubble tea%,category.ilike.%bbt%,category.ilike.%patisserie%,category.ilike.%pastry%');

  if (listingsError) console.error('Error fetching dessert listings:', listingsError);
  if (mallError) console.error('Error fetching dessert mall outlets:', mallError);

  // Track priority separately for sorting
  type MatchWithMeta = SearchMatch & { _priority?: number };

  // Group by station with priority scores
  const stationResultsMap = new Map<string, { stationId: string; matches: MatchWithMeta[]; totalPriority: number }>();

  // Add curated listings (high priority - they're curated desserts)
  (listings || []).forEach((listing: { id: string; station_id: string | null; name: string }) => {
    if (!listing.station_id) return;

    if (!stationResultsMap.has(listing.station_id)) {
      stationResultsMap.set(listing.station_id, {
        stationId: listing.station_id,
        matches: [],
        totalPriority: 0,
      });
    }

    const station = stationResultsMap.get(listing.station_id)!;
    const priority = 5; // Curated desserts get highest priority
    station.matches.push({
      id: listing.id,
      name: listing.name || 'Unknown',
      type: 'curated',
      matchType: 'restaurant',
      _priority: priority,
    });
    station.totalPriority += priority;
  });

  // Add mall outlets with category-based priority
  (mallOutlets || []).forEach((outlet: { id: string; name: string; mall_id: string; category: string | null; malls: { id: string; name: string; station_id: string } }) => {
    const stationId = outlet.malls?.station_id;
    if (!stationId) return;

    const priority = getDessertPriority(outlet.category);

    if (!stationResultsMap.has(stationId)) {
      stationResultsMap.set(stationId, {
        stationId: stationId,
        matches: [],
        totalPriority: 0,
      });
    }

    const station = stationResultsMap.get(stationId)!;
    station.matches.push({
      id: outlet.id,
      name: outlet.name || 'Unknown',
      type: 'mall',
      matchType: 'restaurant',
      mallName: outlet.malls?.name,
      mallId: outlet.mall_id,
      _priority: priority,
    });
    station.totalPriority += priority;
  });

  // Convert to array
  const allResults = Array.from(stationResultsMap.values());

  // Sort stations by weighted priority (not just count)
  allResults.sort((a, b) => {
    // Primary: higher total priority
    if (b.totalPriority !== a.totalPriority) return b.totalPriority - a.totalPriority;
    // Secondary: more matches
    return b.matches.length - a.matches.length;
  });

  // Sort matches within each station by priority (desserts first, bakeries last)
  allResults.forEach(station => {
    station.matches.sort((a, b) => (b._priority || 0) - (a._priority || 0));
  });

  // Convert to StationSearchResult format (strip internal metadata)
  const results: StationSearchResult[] = allResults.map(s => ({
    stationId: s.stationId,
    matches: s.matches.map(({ _priority, ...match }) => match),
  }));

  // Apply pagination
  const paginatedResults = results.slice(offset, offset + limit);
  const hasMore = offset + limit < results.length;

  // Include all station IDs on first page for map pins
  const allStationIds = offset === 0 ? results.map(r => r.stationId) : undefined;

  return { results: paginatedResults, hasMore, allStationIds };
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

// ============================================
// MALLS & OUTLETS
// ============================================

// Get malls by station with outlet count
export async function getMallsByStation(
  stationId: string
): Promise<MallWithOutletCount[]> {
  // Get malls for this station
  const { data: malls, error: mallsError } = await supabase
    .from('malls')
    .select('*')
    .eq('station_id', stationId)
    .order('name');

  if (mallsError || !malls || malls.length === 0) {
    if (mallsError) console.error('Error fetching malls:', mallsError);
    return [];
  }

  // Get outlet counts for each mall
  const mallIds = malls.map((m: Mall) => m.id);
  const { data: outletCounts, error: countsError } = await supabase
    .from('mall_outlets')
    .select('mall_id')
    .in('mall_id', mallIds);

  if (countsError) {
    console.error('Error fetching outlet counts:', countsError);
  }

  // Count outlets per mall
  const countMap = new Map<string, number>();
  (outletCounts || []).forEach((o: { mall_id: string }) => {
    countMap.set(o.mall_id, (countMap.get(o.mall_id) || 0) + 1);
  });

  // Combine malls with outlet counts and sort by outlet count (most food options first)
  const result = malls.map((mall: Mall) => ({
    ...mall,
    outlet_count: countMap.get(mall.id) || 0,
  }));

  // Sort by outlet count descending (most food options first)
  result.sort((a, b) => b.outlet_count - a.outlet_count);

  return result;
}

// Get mall by ID
export async function getMall(mallId: string): Promise<Mall | null> {
  const { data, error } = await supabase
    .from('malls')
    .select('*')
    .eq('id', mallId)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('Error fetching mall:', mallId, error);
    }
    return null;
  }

  return data;
}

// Get outlets by mall
export async function getOutletsByMall(mallId: string): Promise<MallOutlet[]> {
  const { data, error } = await supabase
    .from('mall_outlets')
    .select('*')
    .eq('mall_id', mallId)
    .order('name');

  if (error) {
    console.error('Error fetching mall outlets:', error);
    return [];
  }

  return data || [];
}

// ============================================
// STATION CONTENT CHECK
// ============================================

// Get list of station IDs that have NO content (no listings and no malls)
export async function getStationsWithNoContent(): Promise<string[]> {
  // Get all stations with listings
  const { data: listingsStations } = await supabase
    .from('food_listings')
    .select('station_id')
    .eq('is_active', true)
    .not('station_id', 'is', null);

  // Get all stations with malls
  const { data: mallStations } = await supabase
    .from('malls')
    .select('station_id')
    .not('station_id', 'is', null);

  // Get all unique station IDs from all tables
  const { data: allStations } = await supabase
    .from('stations')
    .select('id');

  if (!allStations) return [];

  // Create set of stations with content
  const stationsWithContent = new Set<string>();
  (listingsStations || []).forEach((s: { station_id: string | null }) => {
    if (s.station_id) stationsWithContent.add(s.station_id);
  });
  (mallStations || []).forEach((m: { station_id: string | null }) => {
    if (m.station_id) stationsWithContent.add(m.station_id);
  });

  // Return stations that have NO content
  return allStations
    .map((s: { id: string }) => s.id)
    .filter(id => !stationsWithContent.has(id));
}
