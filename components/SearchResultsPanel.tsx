'use client';

import { StationSearchResult } from '@/lib/api';

interface SearchResultsPanelProps {
  searchQuery: string;
  results: StationSearchResult[];
  onStationClick: (stationId: string) => void;
  onClose: () => void;
  stationNames: { [key: string]: string };
}

export default function SearchResultsPanel({
  searchQuery,
  results,
  onStationClick,
  onClose,
  stationNames,
}: SearchResultsPanelProps) {
  if (!results || results.length === 0) return null;

  return (
    <div className="fixed top-20 left-4 z-40 w-80 max-h-[calc(100vh-160px)] bg-white rounded-xl shadow-2xl border-2 border-gray-200 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <span className="text-2xl">🔍</span>
          <div>
            <p className="text-sm opacity-90">Search results for</p>
            <p className="font-bold text-lg">"{searchQuery}"</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
          aria-label="Close results panel"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Results count */}
      <div className="px-4 py-2 bg-amber-50 border-b border-amber-200">
        <p className="text-sm text-amber-900 font-medium">
          {results.length} {results.length === 1 ? 'station' : 'stations'} found
        </p>
      </div>

      {/* Results list */}
      <div className="flex-1 overflow-y-auto">
        {results.map((result) => {
          const stationName = stationNames[result.stationId] || result.stationId;

          return (
            <button
              key={result.stationId}
              onClick={() => onStationClick(result.stationId)}
              className="w-full px-4 py-3 border-b border-gray-100 hover:bg-amber-50 transition-colors text-left group"
            >
              {/* Station name and count */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📍</span>
                  <h3 className="font-bold text-gray-900 group-hover:text-orange-600 transition-colors">
                    {stationName}
                  </h3>
                </div>
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {result.count}
                </span>
              </div>

              {/* Outlet preview (show first 3) */}
              <div className="text-xs text-gray-600 ml-7 space-y-0.5">
                {result.outlets.slice(0, 3).map((outlet, idx) => (
                  <p key={idx} className="truncate">
                    {outlet.name}
                  </p>
                ))}
                {result.count > 3 && (
                  <p className="text-gray-400 italic">
                    +{result.count - 3} more...
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
