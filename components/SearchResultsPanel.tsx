'use client';

import { StationSearchResult } from '@/lib/api';

interface SearchResultsPanelProps {
  searchQuery: string;
  results: StationSearchResult[];
  onStationClick: (stationId: string) => void;
  onClose: () => void;
  stationNames: { [key: string]: string };
  onStationZoom?: (stationId: string) => void;
}

export default function SearchResultsPanel({
  searchQuery,
  results,
  onStationClick,
  onClose,
  stationNames,
  onStationZoom,
}: SearchResultsPanelProps) {
  if (!results || results.length === 0) return null;

  return (
    <div className="fixed top-20 left-4 z-40 w-20 md:w-80 max-h-[calc(100vh-160px)] bg-white rounded-xl shadow-2xl border-2 border-gray-200 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-3 md:px-4 py-2 md:py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white min-w-0 flex-1">
          <span className="text-xl md:text-2xl flex-shrink-0">🔍</span>
          <div className="min-w-0 flex-1">
            <p className="text-xs md:text-sm opacity-90">Results for</p>
            <p className="font-bold text-sm md:text-lg truncate">"{searchQuery}"</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-white hover:bg-white/20 rounded-full p-1 transition-colors flex-shrink-0"
          aria-label="Close results panel"
        >
          <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Results count */}
      <div className="px-3 md:px-4 py-1.5 md:py-2 bg-amber-50 border-b border-amber-200 flex-shrink-0">
        <p className="text-xs md:text-sm text-amber-900 font-medium">
          {results.length} {results.length === 1 ? 'station' : 'stations'}
        </p>
      </div>

      {/* Results list */}
      <div className="flex-1 overflow-y-auto">
        {results.map((result) => {
          const stationName = stationNames[result.stationId] || result.stationId;

          return (
            <button
              key={result.stationId}
              onClick={() => {
                if (onStationZoom) {
                  onStationZoom(result.stationId);
                }
                onStationClick(result.stationId);
              }}
              className="w-full px-3 md:px-4 py-2 md:py-3 border-b border-gray-100 hover:bg-amber-50 transition-colors text-left group cursor-pointer"
            >
              {/* Station name and count */}
              <div className="flex items-center justify-between mb-1 md:mb-2">
                <div className="flex items-center gap-1.5 md:gap-2 min-w-0 flex-1">
                  <span className="text-base md:text-lg flex-shrink-0">📍</span>
                  <h3 className="font-bold text-sm md:text-base text-gray-900 group-hover:text-orange-600 transition-colors truncate">
                    {stationName}
                  </h3>
                </div>
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 md:py-1 rounded-full flex-shrink-0 ml-2">
                  {result.count}
                </span>
              </div>

              {/* Outlet preview (show first 2 on mobile, 3 on desktop) */}
              <div className="text-xs text-gray-600 ml-5 md:ml-7 space-y-0.5">
                {result.outlets.slice(0, 2).map((outlet, idx) => (
                  <p key={idx} className="truncate">
                    {outlet.name}
                  </p>
                ))}
                {result.count > 2 && (
                  <p className="text-gray-400 italic text-xs">
                    +{result.count - 2} more...
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
