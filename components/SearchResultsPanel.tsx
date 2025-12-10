'use client';

import { useState } from 'react';
import { StationSearchResult } from '@/lib/api';
import { IconClose, IconChevronLeft, IconChevronDown } from './Icons';

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
  const [isCollapsed, setIsCollapsed] = useState(false);

  const hasResults = results && results.length > 0;

  // No results message component - White background theme
  const NoResultsMessage = () => (
    <div className="p-4 text-center bg-white">
      <p className="text-[#1a1a1a] text-sm">No food found for "{searchQuery}"</p>
      <p className="text-[#1a1a1a]/60 text-xs mt-1">Try a different search term</p>
    </div>
  );

  return (
    <>
      {/* Mobile: Slide-able Panel - White background theme */}
      <div
        className={`md:hidden fixed top-20 z-40 flex transition-transform duration-300 ease-in-out ${
          isCollapsed ? '-translate-x-[140px]' : 'translate-x-0'
        }`}
        style={{ left: 0 }}
      >
        {/* Panel content */}
        <div
          className="w-[140px] max-h-[calc(4*44px+44px)] bg-white/95 backdrop-blur-sm rounded-r-xl shadow-xl border-2 border-[#E8B931] border-l-0 overflow-hidden flex flex-col"
        >
            {/* Close button */}
            <button
              onClick={onClose}
              className="w-full py-2 bg-[#E8B931] text-[#1a1a1a] hover:bg-[#F5D251] transition-colors flex items-center justify-center flex-shrink-0"
              aria-label="Close results"
            >
              <IconClose className="w-4 h-4" />
            </button>

            {/* Results list or no results message */}
            {hasResults ? (
              <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ WebkitOverflowScrolling: 'touch', maxHeight: 'calc(4 * 44px)' }}>
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
                      className="w-full py-2.5 px-2 border-b border-[#E8B931]/30 hover:bg-[#E8B931]/20 active:bg-[#E8B931]/30 transition-colors group cursor-pointer flex items-center justify-start min-h-[44px]"
                    >
                      {/* Station Name - full width */}
                      <div className="text-xs font-semibold text-[#1a1a1a] group-hover:text-[#E8B931] transition-colors leading-tight text-left truncate w-full">
                        {stationName}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <NoResultsMessage />
            )}

            {/* Scroll indicator when more than 4 results */}
            {hasResults && results.length > 4 && (
              <div className="py-1.5 bg-[#E8B931]/20 border-t border-[#E8B931]/30 flex items-center justify-center">
                <IconChevronDown className="w-4 h-4 text-[#1a1a1a] animate-bounce" />
                <span className="text-xs text-[#1a1a1a] ml-1">Scroll</span>
              </div>
            )}
          </div>

          {/* Toggle button - always visible */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="self-start mt-4 w-6 h-12 bg-[#E8B931] hover:bg-[#F5D251] text-[#1a1a1a] rounded-r-lg shadow-lg flex items-center justify-center transition-colors"
            aria-label={isCollapsed ? "Show search results" : "Hide search results"}
          >
            <IconChevronLeft className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
          </button>
      </div>


      {/* Desktop: Slide-able Full Panel - White background theme */}
      <div
        className={`hidden md:flex fixed top-20 z-40 transition-transform duration-300 ease-in-out ${
          isCollapsed ? '-translate-x-[calc(24rem+16px)]' : 'translate-x-0'
        }`}
        style={{ left: '16px' }}
      >
        {/* Panel content */}
        <div
          className="w-96 max-h-[calc(100vh-160px)] bg-white rounded-xl shadow-2xl border-2 border-[#E8B931] overflow-hidden flex flex-col"
        >
            {/* Header */}
            <div className="bg-[#E8B931] px-4 py-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2 text-[#1a1a1a] min-w-0 flex-1">
                <span className="text-2xl flex-shrink-0">🔍</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm opacity-80">Results for</p>
                  <p className="font-bold text-lg truncate">"{searchQuery}"</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-[#1a1a1a] hover:bg-[#1a1a1a]/20 rounded-full p-1 transition-colors flex-shrink-0"
                aria-label="Close results panel"
              >
                <IconClose className="w-6 h-6" />
              </button>
            </div>

            {/* Results count */}
            <div className="px-4 py-2 bg-[#E8B931]/20 border-b border-[#E8B931]/30 flex-shrink-0">
              <p className="text-sm text-[#1a1a1a] font-medium">
                {hasResults ? `${results.length} ${results.length === 1 ? 'station' : 'stations'}` : 'No results'}
              </p>
            </div>

            {/* Results list or no results message */}
            {hasResults ? (
              <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(4 * 90px)' }}>
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
                      className="w-full px-4 py-3 border-b border-[#E8B931]/20 hover:bg-[#E8B931]/10 transition-colors text-left group cursor-pointer"
                    >
                      {/* Station name */}
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg flex-shrink-0">📍</span>
                        <h3 className="font-bold text-base text-[#1a1a1a] group-hover:text-[#E8B931] transition-colors">
                          {stationName}
                        </h3>
                      </div>

                      {/* Matching restaurants preview */}
                      <div className="text-xs text-[#1a1a1a]/70 ml-7 mt-2 space-y-0.5">
                        {result.matches.slice(0, 3).map((match, idx) => (
                          <p key={idx} className="truncate">
                            <span className="font-medium text-[#1a1a1a]/90">{match.name}</span>
                            {match.matchedTags && match.matchedTags.length > 0 && (
                              <span className="text-[#E8B931] ml-1">• {match.matchedTags[0]}</span>
                            )}
                          </p>
                        ))}
                        {result.matches.length > 3 && (
                          <p className="text-[#1a1a1a]/50 italic text-xs">
                            +{result.matches.length - 3} more...
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center">
                <p className="text-[#1a1a1a]">No food found for "{searchQuery}"</p>
                <p className="text-[#1a1a1a]/60 text-sm mt-2">Try a different search term</p>
              </div>
            )}

            {/* Scroll indicator when more than 4 results */}
            {hasResults && results.length > 4 && (
              <div className="py-2 bg-[#E8B931]/20 border-t border-[#E8B931]/30 flex items-center justify-center flex-shrink-0">
                <IconChevronDown className="w-5 h-5 text-[#1a1a1a] animate-bounce" />
                <span className="text-sm text-[#1a1a1a] ml-1 font-medium">Scroll for more</span>
              </div>
            )}
          </div>

        {/* Toggle button - always visible */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="self-start mt-4 ml-2 w-8 h-16 bg-[#E8B931] hover:bg-[#F5D251] text-[#1a1a1a] rounded-r-lg shadow-lg flex items-center justify-center transition-colors"
          aria-label={isCollapsed ? "Show search results" : "Hide search results"}
        >
          <IconChevronLeft className={`w-5 h-5 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>

    </>
  );
}
