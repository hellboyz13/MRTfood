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
  ListingPrice,
  Mall,
  MallOutlet,
  MallWithOutletCount,
} from '@/types/database';

// Re-export the new food search function and types
export { searchStationsByFoodWithCounts, DEFAULT_PAGE_SIZE } from './food-search';
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

// Get supper spots (listings with "Supper" tag + mall outlets with supper category) grouped by station
export async function getSupperSpotsByStation(): Promise<StationSearchResult[]> {
  // Fetch listings that have "Supper" tag
  const { data: listings, error: listingsError } = await supabase
    .from('food_listings')
    .select('id, station_id, name')
    .eq('is_active', true)
    .not('station_id', 'is', null)
    .contains('tags', ['Supper']);

  // Fetch mall outlets with supper-related categories (case-insensitive search)
  const { data: mallOutlets, error: mallError } = await supabase
    .from('mall_outlets')
    .select(`
      id, name, mall_id, category,
      malls!inner (id, name, station_id)
    `)
    .or('category.ilike.%supper%,category.ilike.%24%,category.ilike.%late%night%');

  if (listingsError) console.error('Error fetching supper listings:', listingsError);
  if (mallError) console.error('Error fetching supper mall outlets:', mallError);

  // Group by station
  const stationResultsMap = new Map<string, StationSearchResult>();

  // Add curated listings
  (listings || []).forEach((listing: { id: string; station_id: string | null; name: string }) => {
    if (!listing.station_id) return;

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
      matchType: 'restaurant',
    });
  });

  // Add mall outlets
  (mallOutlets || []).forEach((outlet: { id: string; name: string; mall_id: string; category: string | null; malls: { id: string; name: string; station_id: string } }) => {
    const stationId = outlet.malls?.station_id;
    if (!stationId) return;

    if (!stationResultsMap.has(stationId)) {
      stationResultsMap.set(stationId, {
        stationId: stationId,
        matches: [],
      });
    }

    stationResultsMap.get(stationId)!.matches.push({
      id: outlet.id,
      name: outlet.name || 'Unknown',
      type: 'mall',
      matchType: 'restaurant',
      mallName: outlet.malls?.name,
      mallId: outlet.mall_id,
    });
  });

  // Convert to array and sort by number of matches
  const results = Array.from(stationResultsMap.values());
  results.sort((a, b) => b.matches.length - a.matches.length);

  return results;
}

// Get dessert spots (listings with "Dessert" tag + mall outlets with dessert category) grouped by station
export async function getDessertSpotsByStation(): Promise<StationSearchResult[]> {
  // Fetch listings that have "Dessert" tag
  const { data: listings, error: listingsError } = await supabase
    .from('food_listings')
    .select('id, station_id, name')
    .eq('is_active', true)
    .not('station_id', 'is', null)
    .contains('tags', ['Dessert']);

  // Fetch mall outlets with dessert-related categories (case-insensitive search)
  const { data: mallOutlets, error: mallError } = await supabase
    .from('mall_outlets')
    .select(`
      id, name, mall_id, category,
      malls!inner (id, name, station_id)
    `)
    .or('category.ilike.%dessert%,category.ilike.%ice cream%,category.ilike.%cafe%,category.ilike.%bakery%,category.ilike.%bubble tea%,category.ilike.%bbt%');

  if (listingsError) console.error('Error fetching dessert listings:', listingsError);
  if (mallError) console.error('Error fetching dessert mall outlets:', mallError);

  // Group by station
  const stationResultsMap = new Map<string, StationSearchResult>();

  // Add curated listings
  (listings || []).forEach((listing: { id: string; station_id: string | null; name: string }) => {
    if (!listing.station_id) return;

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
      matchType: 'restaurant',
    });
  });

  // Add mall outlets
  (mallOutlets || []).forEach((outlet: { id: string; name: string; mall_id: string; category: string | null; malls: { id: string; name: string; station_id: string } }) => {
    const stationId = outlet.malls?.station_id;
    if (!stationId) return;

    if (!stationResultsMap.has(stationId)) {
      stationResultsMap.set(stationId, {
        stationId: stationId,
        matches: [],
      });
    }

    stationResultsMap.get(stationId)!.matches.push({
      id: outlet.id,
      name: outlet.name || 'Unknown',
      type: 'mall',
      matchType: 'restaurant',
      mallName: outlet.malls?.name,
      mallId: outlet.mall_id,
    });
  });

  // Convert to array and sort by number of matches
  const results = Array.from(stationResultsMap.values());
  results.sort((a, b) => b.matches.length - a.matches.length);

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
