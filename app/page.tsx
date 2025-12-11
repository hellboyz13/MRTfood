'use client';

import { useState, useEffect, useRef } from 'react';
import MRTMap from '@/components/MRTMap';
import FoodPanelV2 from '@/components/FoodPanelV2';
import SearchBar from '@/components/SearchBar';
import SearchResultsPanel from '@/components/SearchResultsPanel';
import Footer from '@/components/Footer';
import HowToUseCard from '@/components/HowToUseCard';
import { searchStationsByFoodWithCounts, StationSearchResult, getStations, getSupperSpotsByStation, getDessertSpotsByStation, SearchResultWithSuggestions } from '@/lib/api';

export default function Home() {
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [searchResults, setSearchResults] = useState<StationSearchResult[]>([]);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stationNames, setStationNames] = useState<{ [key: string]: string }>({});
  const [is24hActive, setIs24hActive] = useState(false);
  const [isDessertActive, setIsDessertActive] = useState(false);
  const mapZoomHandlerRef = useRef<((stationId: string) => void) | null>(null);

  // Load station names
  useEffect(() => {
    getStations().then(stations => {
      const namesMap: { [key: string]: string } = {};
      stations.forEach(station => {
        namesMap[station.id] = station.name;
      });
      setStationNames(namesMap);
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
    setIs24hActive(false); // Turn off 24h filter when doing regular search
    setIsDessertActive(false); // Turn off dessert filter when doing regular search
    setSearchSuggestions([]); // Clear previous suggestions
    try {
      const { results, suggestions } = await searchStationsByFoodWithCounts(query);
      setSearchResults(results);
      setSearchSuggestions(suggestions || []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      setSearchSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchResults([]);
    setSearchQuery('');
    setSearchSuggestions([]);
    setIs24hActive(false);
    setIsDessertActive(false);
  };

  const handleSupperClick = async () => {
    if (is24hActive) {
      // Toggle off
      setIs24hActive(false);
      setSearchResults([]);
      setSearchQuery('');
    } else {
      // Toggle on - fetch supper spots
      setIsSearching(true);
      setIs24hActive(true);
      setIsDessertActive(false); // Turn off dessert filter
      setSearchQuery('Supper Spots');
      try {
        const results = await getSupperSpotsByStation();
        setSearchResults(results);
      } catch (error) {
        console.error('Supper search error:', error);
        setSearchResults([]);
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
    } else {
      // Toggle on - fetch dessert spots
      setIsSearching(true);
      setIsDessertActive(true);
      setIs24hActive(false); // Turn off supper filter
      setSearchQuery('Dessert Spots');
      try {
        const results = await getDessertSpotsByStation();
        setSearchResults(results);
      } catch (error) {
        console.error('Dessert search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }
  };

  const handleStationZoom = (stationId: string) => {
    if (mapZoomHandlerRef.current) {
      mapZoomHandlerRef.current(stationId);
    }
  };

  return (
    <main className="h-screen flex flex-col overflow-hidden">
      {/* Logo - Top Left */}
      <div className="absolute top-3 left-3 z-50">
        <img
          src="/logo.jpg"
          alt="MRT Food Logo"
          className="w-12 h-12 md:w-16 md:h-16 rounded-full shadow-lg border-2 border-white"
        />
      </div>

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

      {/* Search Results Panel - show if there are results OR suggestions */}
      {searchQuery && (searchResults.length > 0 || searchSuggestions.length > 0) && (
        <SearchResultsPanel
          searchQuery={searchQuery}
          results={searchResults}
          onStationClick={handleStationClick}
          onClose={handleClearSearch}
          stationNames={stationNames}
          onStationZoom={handleStationZoom}
          suggestions={searchSuggestions}
          onSuggestionClick={handleSearch}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* MRT Map */}
        <div className={`flex-1 h-full relative ${selectedStation && !isMobile ? 'mr-[350px]' : ''}`}>
          <MRTMap
            selectedStation={selectedStation}
            onStationClick={handleStationClick}
            searchResults={searchResults}
            onZoomHandlerReady={(handler) => { mapZoomHandlerRef.current = handler; }}
          />
        </div>

        {/* Food Panel - Desktop */}
        {selectedStation && !isMobile && (
          <div className="absolute top-0 right-0 h-full">
            <FoodPanelV2
              stationId={selectedStation}
              onClose={handleClosePanel}
              isMobile={false}
              searchQuery={searchQuery}
              searchMatches={getSearchMatches()}
            />
          </div>
        )}

        {/* Food Panel - Mobile Drawer (includes overlay) */}
        {selectedStation && isMobile && (
          <FoodPanelV2
            stationId={selectedStation}
            onClose={handleClosePanel}
            isMobile={true}
            searchQuery={searchQuery}
            searchMatches={getSearchMatches()}
          />
        )}
      </div>

      {/* Footer with legal links */}
      <Footer />

      {/* How to Use Card - Shows on first visit */}
      <HowToUseCard />
    </main>
  );
}
