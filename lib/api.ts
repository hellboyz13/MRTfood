import { supabase } from './supabase';
import {
  Station,
  FoodSource,
  FoodListing,
  SponsoredListing,
  FoodListingWithSource,
  StationFoodData,
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
// FOOD LISTINGS
// ============================================
export async function getFoodListingsByStation(
  stationId: string
): Promise<FoodListingWithSource[]> {
  const { data, error } = await supabase
    .from('food_listings')
    .select(`
      *,
      food_sources (*)
    `)
    .eq('station_id', stationId)
    .eq('is_active', true)
    .order('rating', { ascending: false });

  if (error) {
    console.error('Error fetching food listings:', error);
    return [];
  }

  return (data as FoodListingWithSource[]) || [];
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
// COMBINED STATION FOOD DATA
// ============================================
export async function getStationFoodData(
  stationId: string
): Promise<StationFoodData | null> {
  // Fetch all data in parallel
  const [station, sponsored, listings, sources] = await Promise.all([
    getStation(stationId),
    getSponsoredListing(stationId),
    getFoodListingsByStation(stationId),
    getFoodSources(),
  ]);

  if (!station) {
    return null;
  }

  // Group listings by source
  const sourceMap = new Map<string, FoodListingWithSource[]>();

  listings.forEach((listing) => {
    if (listing.source_id) {
      const existing = sourceMap.get(listing.source_id) || [];
      existing.push(listing);
      sourceMap.set(listing.source_id, existing);
    }
  });

  // Build listingsBySource array, maintaining source order
  const listingsBySource = sources
    .filter((source) => sourceMap.has(source.id))
    .map((source) => ({
      source,
      listings: sourceMap.get(source.id) || [],
    }));

  return {
    station,
    sponsored,
    listings,
    listingsBySource,
  };
}

// ============================================
// SEARCH
// ============================================
export async function searchFoodListings(
  query: string
): Promise<FoodListingWithSource[]> {
  const { data, error } = await supabase
    .from('food_listings')
    .select(`
      *,
      food_sources (*)
    `)
    .eq('is_active', true)
    .or(`name.ilike.%${query}%,description.ilike.%${query}%,tags.cs.{${query}}`)
    .order('rating', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error searching food listings:', error);
    return [];
  }

  return (data as FoodListingWithSource[]) || [];
}
