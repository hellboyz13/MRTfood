'use client';

import { useState, useEffect } from 'react';
import MRTMap from '@/components/MRTMap';
import FoodPanel from '@/components/FoodPanel';

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
            <FoodPanel
              stationId={selectedStation}
              onClose={handleClosePanel}
              isMobile={false}
            />
          </div>
        )}

        {/* Food Panel - Mobile Drawer */}
        {selectedStation && isMobile && (
          <>
            {/* Overlay */}
            <div
              className="fixed inset-0 z-40 drawer-overlay"
              onClick={handleClosePanel}
            />
            <FoodPanel
              stationId={selectedStation}
              onClose={handleClosePanel}
              isMobile={true}
            />
          </>
        )}
      </div>
    </main>
  );
}
