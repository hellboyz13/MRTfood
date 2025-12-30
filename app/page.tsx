'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import MRTMap from '@/components/MRTMap';
import FoodPanelV2 from '@/components/FoodPanelV2';
import SearchBar from '@/components/SearchBar';
import SearchResultsPanel from '@/components/SearchResultsPanel';
import Footer from '@/components/Footer';
import Onboarding, { OnboardingRef } from '@/components/Onboarding';
import { searchStationsByFoodWithCounts, StationSearchResult, getStations, getStationsWithNoContent, getListingStation, DEFAULT_PAGE_SIZE, FilterResponse } from '@/lib/api';

// Cached API endpoints for filters (fallback: set DISABLE_FILTER_CACHE=true)
async function fetchSupperSpots(offset: number, currentHour: number): Promise<FilterResponse> {
  const res = await fetch(`/api/filters/supper?offset=${offset}&hour=${currentHour}`);
  if (!res.ok) throw new Error('Failed to fetch supper spots');
  return res.json();
}

async function fetchDessertSpots(offset: number): Promise<FilterResponse> {
  const res = await fetch(`/api/filters/dessert?offset=${offset}`);
  if (!res.ok) throw new Error('Failed to fetch dessert spots');
  return res.json();
}

// Component that handles deep link logic
function DeepLinkHandler({
  onStationSelect,
  onListingSelect,
  mapZoomHandler
}: {
  onStationSelect: (stationId: string) => void;
  onListingSelect: (listingId: string | null) => void;
  mapZoomHandler: React.RefObject<((stationId: string) => void) | null>;
}) {
  const searchParams = useSearchParams();
  const hasHandledDeepLink = useRef(false);

  useEffect(() => {
    const listingId = searchParams.get('listing');
    if (listingId && !hasHandledDeepLink.current) {
      hasHandledDeepLink.current = true;
      getListingStation(listingId).then(stationId => {
        if (stationId) {
          onStationSelect(stationId);
          onListingSelect(listingId); // Pass listing ID to highlight
          // Also zoom to the station if map is ready
          if (mapZoomHandler.current) {
            mapZoomHandler.current(stationId);
          }
        }
      });
    }
  }, [searchParams, onStationSelect, onListingSelect, mapZoomHandler]);

  return null;
}

// Normalize a string for station name matching (lowercase, remove spaces)
function normalizeForMatch(str: string): string {
  return str.toLowerCase().replace(/\s+/g, '');
}

// Find a station ID by matching the query against station names
// Supports both "Dhoby Ghaut" and "DhobyGhaut" formats
function findStationByName(
  query: string,
  stationNames: { [key: string]: string }
): string | null {
  const normalizedQuery = normalizeForMatch(query);

  for (const [stationId, stationName] of Object.entries(stationNames)) {
    const normalizedStationName = normalizeForMatch(stationName);
    if (normalizedQuery === normalizedStationName) {
      return stationId;
    }
  }
  return null;
}

export default function Home() {
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [highlightedListingId, setHighlightedListingId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [searchResults, setSearchResults] = useState<StationSearchResult[]>([]);
  const [hasMoreSearchResults, setHasMoreSearchResults] = useState(false);
  const [searchPage, setSearchPage] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stationNames, setStationNames] = useState<{ [key: string]: string }>({});
  const [is24hActive, setIs24hActive] = useState(false);
  const [isDessertActive, setIsDessertActive] = useState(false);
  const [emptyStations, setEmptyStations] = useState<string[]>([]);
  const mapZoomHandlerRef = useRef<((stationId: string) => void) | null>(null);
  const onboardingRef = useRef<OnboardingRef>(null);

  // Load station names and empty stations
  useEffect(() => {
    getStations().then(stations => {
      const namesMap: { [key: string]: string } = {};
      stations.forEach(station => {
        namesMap[station.id] = station.name;
      });
      setStationNames(namesMap);
    });

    getStationsWithNoContent().then(stations => {
      setEmptyStations(stations);
    });
  }, []);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleStationClick = (stationId: string) => {
    setSelectedStation(stationId);
  };

  // Get search matches for the currently selected station
  const getSearchMatches = () => {
    if (!selectedStation || searchResults.length === 0) return [];
    const result = searchResults.find(r => r.stationId === selectedStation);
    return result?.matches || [];
  };

  const handleClosePanel = () => {
    setSelectedStation(null);
  };

  const handleSearch = async (query: string) => {
    setIsSearching(true);
    setSearchQuery(query);
    setSearchPage(0);
    setIs24hActive(false); // Turn off 24h filter when doing regular search
    setIsDessertActive(false); // Turn off dessert filter when doing regular search
    setSelectedStation(null); // Close any open panels when searching

    // Check if query matches an MRT station name exactly (case-insensitive, space-insensitive)
    const matchedStationId = findStationByName(query, stationNames);
    if (matchedStationId) {
      // Navigate directly to the matched station
      setSearchResults([]);
      setHasMoreSearchResults(false);
      setSearchQuery(''); // Clear search query since we're navigating directly
      setIsSearching(false);
      // Zoom to station and open panel
      if (mapZoomHandlerRef.current) {
        mapZoomHandlerRef.current(matchedStationId);
      }
      setSelectedStation(matchedStationId);
      return;
    }

    try {
      const { results, hasMore } = await searchStationsByFoodWithCounts(query, {
        limit: DEFAULT_PAGE_SIZE,
        offset: 0,
      });
      setSearchResults(results);
      setHasMoreSearchResults(hasMore);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      setHasMoreSearchResults(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLoadMoreSearch = async () => {
    if (!searchQuery || isLoadingMore) return;

    setIsLoadingMore(true);
    const nextPage = searchPage + 1;
    try {
      const { results, hasMore } = await searchStationsByFoodWithCounts(searchQuery, {
        limit: DEFAULT_PAGE_SIZE,
        offset: nextPage * DEFAULT_PAGE_SIZE,
      });
      // Merge results - append new stations, merge matches for existing stations
      setSearchResults(prev => {
        const merged = [...prev];
        results.forEach(newResult => {
          const existing = merged.find(r => r.stationId === newResult.stationId);
          if (existing) {
            // Merge matches, avoiding duplicates
            newResult.matches.forEach(match => {
              if (!existing.matches.some(m => m.id === match.id)) {
                existing.matches.push(match);
              }
            });
          } else {
            merged.push(newResult);
          }
        });
        return merged;
      });
      setHasMoreSearchResults(hasMore);
      setSearchPage(nextPage);
    } catch (error) {
      console.error('Load more error:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleClearSearch = () => {
    setSearchResults([]);
    setSearchQuery('');
    setSearchPage(0);
    setHasMoreSearchResults(false);
    setIs24hActive(false);
    setIsDessertActive(false);
  };

  const handleSupperClick = async () => {
    if (is24hActive) {
      // Toggle off
      setIs24hActive(false);
      setSearchResults([]);
      setSearchQuery('');
      setSearchPage(0);
      setHasMoreSearchResults(false);
    } else {
      // Toggle on - fetch supper spots sorted by current time (cached via API)
      setIsSearching(true);
      setIs24hActive(true);
      setIsDessertActive(false); // Turn off dessert filter
      setSearchQuery('Supper Spots');
      setSearchPage(0);
      try {
        const currentHour = new Date().getHours();
        const { results, hasMore } = await fetchSupperSpots(0, currentHour);
        setSearchResults(results);
        setHasMoreSearchResults(hasMore);
        if (results.length === 0) {
          setSelectedStation(null);
        }
      } catch (error) {
        console.error('Supper search error:', error);
        setSearchResults([]);
        setHasMoreSearchResults(false);
        setSelectedStation(null);
      } finally {
        setIsSearching(false);
      }
    }
  };

  const handleDessertClick = async () => {
    if (isDessertActive) {
      // Toggle off
      setIsDessertActive(false);
      setSearchResults([]);
      setSearchQuery('');
      setSearchPage(0);
      setHasMoreSearchResults(false);
    } else {
      // Toggle on - fetch dessert spots (cafes/desserts first, bakeries last) (cached via API)
      setIsSearching(true);
      setIsDessertActive(true);
      setIs24hActive(false); // Turn off supper filter
      setSearchQuery('Dessert Spots');
      setSearchPage(0);
      try {
        const { results, hasMore } = await fetchDessertSpots(0);
        setSearchResults(results);
        setHasMoreSearchResults(hasMore);
        if (results.length === 0) {
          setSelectedStation(null);
        }
      } catch (error) {
        console.error('Dessert search error:', error);
        setSearchResults([]);
        setHasMoreSearchResults(false);
        setSelectedStation(null);
      } finally {
        setIsSearching(false);
      }
    }
  };

  const handleLoadMoreFilter = async () => {
    if (isLoadingMore) return;

    setIsLoadingMore(true);
    const nextPage = searchPage + 1;
    const FILTER_PAGE_SIZE = 10;
    const offset = nextPage * FILTER_PAGE_SIZE;

    try {
      let response;
      if (is24hActive) {
        const currentHour = new Date().getHours();
        response = await fetchSupperSpots(offset, currentHour);
      } else if (isDessertActive) {
        response = await fetchDessertSpots(offset);
      } else {
        return;
      }

      setSearchResults(prev => [...prev, ...response.results]);
      setHasMoreSearchResults(response.hasMore);
      setSearchPage(nextPage);
    } catch (error) {
      console.error('Load more filter error:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleStationZoom = (stationId: string) => {
    if (mapZoomHandlerRef.current) {
      mapZoomHandlerRef.current(stationId);
    }
  };

  return (
    <main className="h-screen flex flex-col overflow-hidden">
      {/* Deep link handler - wrapped in Suspense for useSearchParams */}
      <Suspense fallback={null}>
        <DeepLinkHandler
          onStationSelect={setSelectedStation}
          onListingSelect={setHighlightedListingId}
          mapZoomHandler={mapZoomHandlerRef}
        />
      </Suspense>

      {/* Onboarding Tour */}
      <Onboarding ref={onboardingRef} />

      {/* Search Bar - Bottom Center */}
      <SearchBar
        onSearch={handleSearch}
        onClear={handleClearSearch}
        isSearching={isSearching}
        noResults={!isSearching && searchQuery.length > 0 && searchResults.length === 0}
        on24hClick={handleSupperClick}
        is24hActive={is24hActive}
        onDessertClick={handleDessertClick}
        isDessertActive={isDessertActive}
      />

      {/* Search Results Panel - only show if there are results */}
      {searchQuery && searchResults.length > 0 && (
        <SearchResultsPanel
          searchQuery={searchQuery}
          results={searchResults}
          onStationClick={handleStationClick}
          onClose={handleClearSearch}
          stationNames={stationNames}
          onStationZoom={handleStationZoom}
          hasMore={hasMoreSearchResults}
          onLoadMore={is24hActive || isDessertActive ? handleLoadMoreFilter : handleLoadMoreSearch}
          isLoadingMore={isLoadingMore}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* MRT Map */}
        <div data-tour="map" className={`flex-1 h-full relative ${selectedStation && !isMobile ? 'mr-[350px]' : ''}`}>
          <MRTMap
            selectedStation={selectedStation}
            onStationClick={handleStationClick}
            searchResults={searchResults}
            onZoomHandlerReady={(handler) => { mapZoomHandlerRef.current = handler; }}
            emptyStations={emptyStations}
          />
        </div>

        {/* Food Panel - Desktop */}
        {selectedStation && !isMobile && (
          <div className="absolute top-0 right-0 h-full">
            <FoodPanelV2
              stationId={selectedStation}
              onClose={handleClosePanel}
              onNavigateToStation={handleStationClick}
              isMobile={false}
              searchQuery={searchQuery}
              searchMatches={getSearchMatches()}
              highlightedListingId={highlightedListingId}
              onHighlightClear={() => setHighlightedListingId(null)}
            />
          </div>
        )}

        {/* Food Panel - Mobile Drawer (includes overlay) */}
        {selectedStation && isMobile && (
          <FoodPanelV2
            stationId={selectedStation}
            onClose={handleClosePanel}
            onNavigateToStation={handleStationClick}
            isMobile={true}
            searchQuery={searchQuery}
            searchMatches={getSearchMatches()}
            highlightedListingId={highlightedListingId}
            onHighlightClear={() => setHighlightedListingId(null)}
          />
        )}
      </div>

      {/* Footer with legal links */}
      <Footer onHowToUseClick={() => onboardingRef.current?.restart()} />
    </main>
  );
}
