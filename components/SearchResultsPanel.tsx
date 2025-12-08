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

// Extract station code from station ID (e.g., "ns1-jurong-east" -> "NS1")
function getStationCode(stationId: string): string {
  const parts = stationId.split('-');
  if (parts.length > 0) {
    const code = parts[0];
    // Convert to uppercase with station number (e.g., "ns1" -> "NS1")
    return code.replace(/([a-z]+)(\d+)/i, (_, letters, numbers) =>
      `${letters.toUpperCase()}${numbers}`
    );
  }
  return stationId.toUpperCase();
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
    <>
      {/* Mobile: Compact Strip */}
      <div className="md:hidden fixed top-20 left-0 z-40 w-[clamp(60px,18vw,80px)] max-h-[calc(100dvh-160px)] max-h-[calc(100vh-160px)] bg-white/95 backdrop-blur-sm rounded-r-xl shadow-xl border-2 border-gray-200 border-l-0 overflow-hidden flex flex-col">
        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 transition-colors flex items-center justify-center flex-shrink-0"
          aria-label="Close results"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Results list - Show 7 initially, scroll for more */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative" style={{ WebkitOverflowScrolling: 'touch', maxHeight: 'calc(7 * 56px)' }}>
          {results.map((result) => {
            const stationCode = getStationCode(result.stationId);

            return (
              <button
                key={result.stationId}
                onClick={() => {
                  if (onStationZoom) {
                    onStationZoom(result.stationId);
                  }
                  onStationClick(result.stationId);
                }}
                className="w-full py-3 px-1 border-b border-gray-200 hover:bg-amber-50 active:bg-amber-100 transition-colors group cursor-pointer flex flex-col items-center justify-center min-h-[44px]"
              >
                {/* Station Code - truncated if too long */}
                <div className="text-[clamp(10px,2.5vw,12px)] font-bold text-gray-900 group-hover:text-orange-600 transition-colors leading-tight text-center max-w-full overflow-hidden text-ellipsis whitespace-nowrap px-1">
                  {stationCode}
                </div>
              </button>
            );
          })}
        </div>

        {/* Bouncing arrow when more than 7 results */}
        {results.length > 7 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none animate-bounce">
            <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>

      {/* Desktop: Full Panel */}
      <div className="hidden md:block fixed top-20 left-4 z-40 w-80 max-h-[calc(100vh-160px)] bg-white rounded-xl shadow-2xl border-2 border-gray-200 overflow-hidden flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white min-w-0 flex-1">
            <span className="text-2xl flex-shrink-0">🔍</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm opacity-90">Results for</p>
              <p className="font-bold text-lg truncate">"{searchQuery}"</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-1 transition-colors flex-shrink-0"
            aria-label="Close results panel"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Results count */}
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 flex-shrink-0">
          <p className="text-sm text-amber-900 font-medium">
            {results.length} {results.length === 1 ? 'station' : 'stations'}
          </p>
        </div>

        {/* Results list - Show 7 initially, scroll for more */}
        <div className="flex-1 overflow-y-auto relative" style={{ maxHeight: 'calc(7 * 120px)' }}>
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
                className="w-full px-4 py-3 border-b border-gray-100 hover:bg-amber-50 transition-colors text-left group cursor-pointer"
              >
                {/* Station name */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg flex-shrink-0">📍</span>
                  <h3 className="font-bold text-base text-gray-900 group-hover:text-orange-600 transition-colors truncate">
                    {stationName}
                  </h3>
                </div>

                {/* Matching restaurants preview */}
                <div className="text-xs text-gray-600 ml-7 mt-2 space-y-0.5">
                  {result.matches.slice(0, 3).map((match, idx) => (
                    <p key={idx} className="truncate">
                      <span className="font-medium">{match.name}</span>
                      {match.matchedTags && match.matchedTags.length > 0 && (
                        <span className="text-success ml-1">• {match.matchedTags[0]}</span>
                      )}
                    </p>
                  ))}
                  {result.matches.length > 3 && (
                    <p className="text-gray-400 italic text-xs">
                      +{result.matches.length - 3} more...
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Bouncing arrow when more than 7 results */}
        {results.length > 7 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none animate-bounce z-10">
            <svg className="w-6 h-6 text-orange-500 drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
    </>
  );
}
