'use client';

import { useState, useEffect, useMemo } from 'react';
import { StationFoodData, FoodListingWithSources } from '@/types/database';
import { getStationFoodData } from '@/lib/api';

// Source IDs for categorization
const MICHELIN_SOURCE_IDS = ['michelin-3-star', 'michelin-2-star', 'michelin-1-star', 'michelin-hawker'];
const RECOMMENDED_SOURCE_IDS = [...MICHELIN_SOURCE_IDS, 'ieatishootipost', 'editors-choice', 'eatbook', 'get-fed'];
const POPULAR_SOURCE_ID = 'popular';
const FOOD_KING_SOURCE_ID = 'food-king';

// Helper to check if listing has any of the specified source IDs
function hasSource(listing: FoodListingWithSources, sourceIds: string[]): boolean {
  return listing.sources.some(s => sourceIds.includes(s.source.id));
}

// Helper to check if listing ONLY has Food King (no recommended sources)
function isOnlyFoodKing(listing: FoodListingWithSources): boolean {
  const sourceIds = listing.sources.map(s => s.source.id);
  return sourceIds.includes(FOOD_KING_SOURCE_ID) &&
         !sourceIds.some(id => RECOMMENDED_SOURCE_IDS.includes(id));
}

export interface SeparatedListings {
  recommended: FoodListingWithSources[];
  popular: FoodListingWithSources[]; // Popular source + chain outlets
  foodKingOnly: FoodListingWithSources[];
  other: FoodListingWithSources[]; // Listings that don't fit other categories
}

interface UseStationFoodResult {
  data: StationFoodData | null;
  separatedListings: SeparatedListings;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useStationFood(stationId: string | null): UseStationFoodResult {
  const [data, setData] = useState<StationFoodData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    if (!stationId) {
      setData(null);
      return;
    }

    console.log('🎣 useStationFood: Fetching data for station:', stationId);
    setLoading(true);
    setError(null);

    try {
      const result = await getStationFoodData(stationId);
      console.log('✅ useStationFood: Got result:', {
        hasStation: !!result?.station,
        hasSponsored: !!result?.sponsored,
        listingsCount: result?.listings?.length || 0
      });
      setData(result);
    } catch (err) {
      console.error('❌ useStationFood: Error:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch data'));
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [stationId]);

  // Separate listings into recommended, popular, food-king-only, and other sections
  const separatedListings = useMemo((): SeparatedListings => {
    if (!data?.listings) {
      return { recommended: [], popular: [], foodKingOnly: [], other: [] };
    }

    const recommended = data.listings.filter(listing =>
      hasSource(listing, RECOMMENDED_SOURCE_IDS)
    );

    const popular = data.listings.filter(listing =>
      hasSource(listing, [POPULAR_SOURCE_ID])
    );

    const foodKingOnly = data.listings.filter(listing =>
      isOnlyFoodKing(listing)
    );

    // Get listings that aren't in any category
    const other = data.listings.filter(listing =>
      !hasSource(listing, RECOMMENDED_SOURCE_IDS) &&
      !hasSource(listing, [POPULAR_SOURCE_ID]) &&
      !isOnlyFoodKing(listing)
    );

    return { recommended, popular, foodKingOnly, other };
  }, [data?.listings]);

  return {
    data,
    separatedListings,
    loading,
    error,
    refetch: fetchData,
  };
}
