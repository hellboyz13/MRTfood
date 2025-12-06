import { supabase } from './supabase';
import {
  Station,
  FoodSource,
  FoodListing,
  SponsoredListing,
  FoodListingWithSources,
  StationFoodData,
  ListingSourceWithDetails,
} from '@/types/database';

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
  const { data, error } = await supabase
    .from('stations')
    .select('*')
    .eq('id', stationId)
    .single();

  if (error) {
    console.error('Error fetching station:', error);
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
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned, which is fine
    console.error('Error fetching sponsored listing:', error);
  }

  return data || null;
}

// ============================================
// FOOD LISTINGS (Multi-source via junction table)
// ============================================

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

  // Sort by trust score descending
  result.sort((a, b) => (b.trust_score || 0) - (a.trust_score || 0));

  return result;
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
  return listings.map((listing: FoodListing) => {
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

// ============================================
// SEARCH STATIONS BY FOOD
// ============================================

// Search for stations that have food matching the query
export async function searchStationsByFood(query: string): Promise<string[]> {
  if (!query || query.trim().length === 0) return [];

  const searchQuery = query.trim().toLowerCase();

  // Search for matching listings
  const { data: listings, error } = await supabase
    .from('food_listings')
    .select('station_id, name, description, tags')
    .eq('is_active', true)
    .not('station_id', 'is', null);

  if (error || !listings) {
    if (error) console.error('Error searching food listings:', error);
    return [];
  }

  // Filter listings that match the search query
  const matchingListings = listings.filter((listing: FoodListing) => {
    // Check name
    if (listing.name?.toLowerCase().includes(searchQuery)) return true;

    // Check description
    if (listing.description?.toLowerCase().includes(searchQuery)) return true;

    // Check tags
    if (listing.tags && Array.isArray(listing.tags)) {
      return listing.tags.some((tag: string) =>
        tag.toLowerCase().includes(searchQuery)
      );
    }

    return false;
  });

  // Extract unique station IDs
  const stationIds = [...new Set(
    matchingListings
      .map((l: FoodListing) => l.station_id)
      .filter(Boolean)
  )] as string[];

  return stationIds;
}
