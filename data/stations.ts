import { StationFood, StationFoodBySource } from '@/types';
import { foodSources, getSourceById } from './sources';
import { getListingsByStation } from './listings';
import { stationNames } from './mock-data';

// Get curated food data for a station, grouped by source
export const getStationFood = (stationId: string): StationFood | null => {
  const listings = getListingsByStation(stationId);

  if (listings.length === 0) {
    return null;
  }

  // Group listings by source
  const listingsBySource = new Map<string, typeof listings>();

  listings.forEach(listing => {
    const existing = listingsBySource.get(listing.sourceId) || [];
    existing.push(listing);
    listingsBySource.set(listing.sourceId, existing);
  });

  // Build the grouped structure
  const foodBySource: StationFoodBySource[] = [];

  // Maintain source order from foodSources array
  foodSources.forEach(source => {
    const sourceListings = listingsBySource.get(source.id);
    if (sourceListings && sourceListings.length > 0) {
      foodBySource.push({
        source,
        listings: sourceListings,
      });
    }
  });

  return {
    stationId,
    stationName: stationNames[stationId] || stationId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    foodBySource,
  };
};

// Get all stations that have curated food data
export const getStationsWithFood = (): string[] => {
  const stationsSet = new Set<string>();

  // This could be optimized with a pre-computed list
  const allStations = Object.keys(stationNames);

  allStations.forEach(stationId => {
    const listings = getListingsByStation(stationId);
    if (listings.length > 0) {
      stationsSet.add(stationId);
    }
  });

  return Array.from(stationsSet);
};
