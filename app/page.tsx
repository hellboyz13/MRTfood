'use client';

import { useState, useEffect, useRef } from 'react';
import MRTMap from '@/components/MRTMap';
import FoodPanelV2 from '@/components/FoodPanelV2';
import SearchBar from '@/components/SearchBar';
import SearchResultsPanel from '@/components/SearchResultsPanel';
import { searchStationsByFoodWithCounts, StationSearchResult, getStations } from '@/lib/api';

export default function Home() {
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [searchResults, setSearchResults] = useState<StationSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stationNames, setStationNames] = useState<{ [key: string]: string }>({});
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

  const handleClosePanel = () => {
    setSelectedStation(null);
  };

  const handleSearch = async (query: string) => {
    setIsSearching(true);
    setSearchQuery(query);
    try {
      const results = await searchStationsByFoodWithCounts(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchResults([]);
    setSearchQuery('');
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
      />

      {/* Search Results Panel */}
      {searchResults.length > 0 && (
        <SearchResultsPanel
          searchQuery={searchQuery}
          results={searchResults}
          onStationClick={handleStationClick}
          onClose={handleClearSearch}
          stationNames={stationNames}
          onStationZoom={handleStationZoom}
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
          />
        )}
      </div>
    </main>
  );
}
