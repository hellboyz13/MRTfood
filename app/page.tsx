'use client';

import { useState, useEffect } from 'react';
import MRTMap from '@/components/MRTMap';
import FoodPanelV2 from '@/components/FoodPanelV2';

export default function Home() {
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

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

      {/* Main Content */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* MRT Map */}
        <div className={`flex-1 h-full relative ${selectedStation && !isMobile ? 'mr-[350px]' : ''}`}>
          <MRTMap
            selectedStation={selectedStation}
            onStationClick={handleStationClick}
          />
        </div>

        {/* Food Panel - Desktop */}
        {selectedStation && !isMobile && (
          <div className="absolute top-0 right-0 h-full">
            <FoodPanelV2
              stationId={selectedStation}
              onClose={handleClosePanel}
              isMobile={false}
            />
          </div>
        )}

        {/* Food Panel - Mobile Drawer (includes overlay) */}
        {selectedStation && isMobile && (
          <FoodPanelV2
            stationId={selectedStation}
            onClose={handleClosePanel}
            isMobile={true}
          />
        )}
      </div>
    </main>
  );
}
