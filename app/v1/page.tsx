'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import FoodPanel from '@/components/FoodPanel';
import Image from 'next/image';

const MAP_CONSTRAINTS = {
  minZoom: 0.8,
  maxZoom: 4.0,
  defaultZoom: 1.0,
  zoomStep: 0.5,
};

export default function V1Page() {
  const transformRef = useRef<ReactZoomPanPinchRef>(null);
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [currentZoom, setCurrentZoom] = useState(MAP_CONSTRAINTS.defaultZoom);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleClosePanel = () => setSelectedStation(null);

  const handleZoomChange = useCallback((ref: ReactZoomPanPinchRef) => {
    setCurrentZoom(ref.state.scale);
  }, []);

  const isAtMinZoom = currentZoom <= MAP_CONSTRAINTS.minZoom;
  const isAtMaxZoom = currentZoom >= MAP_CONSTRAINTS.maxZoom;

  return (
    <main className="h-screen flex flex-col overflow-hidden">
      <div className="flex-1 flex relative overflow-hidden">
        <div className={`flex-1 h-full relative ${selectedStation && !isMobile ? 'mr-[350px]' : ''}`}>
          <div className="w-full h-full bg-white relative touch-none">
            <TransformWrapper
              ref={transformRef}
              initialScale={MAP_CONSTRAINTS.defaultZoom}
              minScale={MAP_CONSTRAINTS.minZoom}
              maxScale={MAP_CONSTRAINTS.maxZoom}
              centerOnInit={true}
              limitToBounds={false}
              onZoom={handleZoomChange}
            >
              {({ zoomIn, zoomOut, resetTransform }) => (
                <>
                  {/* Control Buttons */}
                  <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
                    <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-1.5 flex flex-col gap-1">
                      <button
                        onClick={() => zoomIn(MAP_CONSTRAINTS.zoomStep)}
                        disabled={isAtMaxZoom}
                        className={`w-11 h-11 flex items-center justify-center rounded-lg text-xl font-bold transition-all
                          ${isAtMaxZoom
                            ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                            : 'bg-white hover:bg-gray-100 text-gray-700 active:scale-95'
                          }`}
                        aria-label="Zoom in"
                      >
                        +
                      </button>
                      <button
                        onClick={() => zoomOut(MAP_CONSTRAINTS.zoomStep)}
                        disabled={isAtMinZoom}
                        className={`w-11 h-11 flex items-center justify-center rounded-lg text-xl font-bold transition-all
                          ${isAtMinZoom
                            ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                            : 'bg-white hover:bg-gray-100 text-gray-700 active:scale-95'
                          }`}
                        aria-label="Zoom out"
                      >
                        -
                      </button>
                      <div className="h-px bg-gray-200 mx-1" />
                      <button
                        onClick={() => resetTransform(300)}
                        className="w-11 h-11 flex items-center justify-center bg-white hover:bg-gray-100 rounded-lg text-gray-700 transition-all active:scale-95"
                        aria-label="Reset view"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <TransformComponent
                    wrapperClass="!w-full !h-full"
                    contentClass="!w-full !h-full flex items-center justify-center"
                    wrapperStyle={{ touchAction: 'none' }}
                  >
                    <div className="relative">
                      <Image
                        src="/mrt-system-map.svg"
                        alt="Singapore MRT System Map"
                        width={810}
                        height={810}
                        priority
                        className="max-w-none"
                        style={{ imageRendering: 'crisp-edges' }}
                      />
                    </div>
                  </TransformComponent>
                </>
              )}
            </TransformWrapper>
          </div>
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
