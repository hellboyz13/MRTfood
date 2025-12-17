'use client';

import { useState, useRef, useEffect } from 'react';
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
  const [page, setPage] = useState(1);
  const mobilePanelRef = useRef<HTMLDivElement>(null);
  const desktopPanelRef = useRef<HTMLDivElement>(null);

  const ITEMS_PER_PAGE = 20;
  const hasResults = results && results.length > 0;
  const paginatedResults = results.slice(0, page * ITEMS_PER_PAGE);
  const hasMore = results.length > page * ITEMS_PER_PAGE;

  // Reset pagination when search query changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const handleToggle = () => {
    const newCollapsed = !isCollapsed;

    // Animate mobile panel
    if (mobilePanelRef.current) {
      mobilePanelRef.current.animate(
        newCollapsed
          ? [
              { transform: 'translateX(0) scale(1)', opacity: 1 },
              { transform: 'translateX(-20px) scale(0.95)', opacity: 0.8, offset: 0.3 },
              { transform: 'translateX(-140px) scale(0.9)', opacity: 0.6 },
            ]
          : [
              { transform: 'translateX(-140px) scale(0.9)', opacity: 0.6 },
              { transform: 'translateX(-20px) scale(0.95)', opacity: 0.8, offset: 0.7 },
              { transform: 'translateX(0) scale(1)', opacity: 1 },
            ],
        { duration: 350, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' }
      );
    }

    // Animate desktop panel
    if (desktopPanelRef.current) {
      const desktopOffset = 'calc(-24rem - 16px)';
      desktopPanelRef.current.animate(
        newCollapsed
          ? [
              { transform: 'translateX(0) scale(1)', opacity: 1 },
              { transform: `translateX(-50px) scale(0.98)`, opacity: 0.9, offset: 0.3 },
              { transform: `translateX(${desktopOffset}) scale(0.95)`, opacity: 0.7 },
            ]
          : [
              { transform: `translateX(${desktopOffset}) scale(0.95)`, opacity: 0.7 },
              { transform: `translateX(-50px) scale(0.98)`, opacity: 0.9, offset: 0.7 },
              { transform: 'translateX(0) scale(1)', opacity: 1 },
            ],
        { duration: 400, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' }
      );
    }

    setIsCollapsed(newCollapsed);
  };

  // No results message component - Coral theme
  const NoResultsMessage = () => (
    <div className="p-4 text-center bg-[#FFF0ED]">
      <p className="text-[#FF6B4A] text-sm font-medium">No food found for "{searchQuery}"</p>
      <p className="text-[#757575] text-xs mt-1">Try a different search term</p>
    </div>
  );

  return (
    <>
      {/* Mobile: Slide-able Panel - White background theme */}
      <div
        ref={mobilePanelRef}
        className="md:hidden fixed top-20 z-40 flex"
        style={{ left: 0 }}
      >
        {/* Panel content */}
        <div
          className="w-[200px] max-h-[calc(4*60px+44px)] bg-white/95 backdrop-blur-sm rounded-r-xl shadow-xl border-2 border-[#FF6B4A] border-l-0 overflow-hidden flex flex-col"
        >
            {/* Close button */}
            <button
              onClick={onClose}
              className="w-full py-2 bg-[#FF6B4A] text-white hover:bg-[#E55A3A] transition-colors flex items-center justify-center flex-shrink-0"
              aria-label="Close results"
            >
              <IconClose className="w-4 h-4" />
            </button>

            {/* Results list or no results message */}
            {hasResults ? (
              <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ WebkitOverflowScrolling: 'touch', maxHeight: 'calc(4 * 60px)' }}>
                {paginatedResults.map((result) => {
                  const stationName = stationNames[result.stationId] || result.stationId;
                  const firstMatch = result.matches[0];

                  return (
                    <button
                      key={result.stationId}
                      onClick={() => {
                        if (onStationZoom) {
                          onStationZoom(result.stationId);
                        }
                        onStationClick(result.stationId);
                      }}
                      className="w-full py-2 px-2.5 border-b border-[#E0DCD7] hover:bg-[#FFF0ED] active:bg-[#FFF0ED] transition-colors group cursor-pointer text-left min-h-[60px]"
                    >
                      {/* Station Name */}
                      <div className="text-xs font-semibold text-[#2D2D2D] group-hover:text-[#FF6B4A] transition-colors leading-tight truncate">
                        {stationName}
                      </div>
                      {/* First match with badge */}
                      {firstMatch && (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-[10px] text-[#757575] truncate flex-1">{firstMatch.name}</span>
                          {firstMatch.type === 'mall' && firstMatch.mallName ? (
                            <span className="text-[8px] px-1 py-0.5 bg-purple-100 text-purple-700 rounded whitespace-nowrap flex-shrink-0">
                              {firstMatch.mallName}
                            </span>
                          ) : firstMatch.type === 'curated' ? (
                            <span className="text-[8px] px-1 py-0.5 bg-orange-100 text-orange-700 rounded whitespace-nowrap flex-shrink-0">
                              Curated
                            </span>
                          ) : null}
                        </div>
                      )}
                      {result.matches.length > 1 && (
                        <div className="text-[9px] text-[#999] mt-0.5">+{result.matches.length - 1} more</div>
                      )}
                    </button>
                  );
                })}
                {/* Load More button */}
                {hasMore && (
                  <button
                    onClick={() => setPage(p => p + 1)}
                    className="w-full py-2 px-2.5 border-t border-[#E0DCD7] bg-[#FFF0ED] hover:bg-[#FFE0D8] text-[#FF6B4A] text-xs font-semibold transition-colors"
                  >
                    Load More ({results.length - paginatedResults.length} more)
                  </button>
                )}
              </div>
            ) : (
              <NoResultsMessage />
            )}

            {/* Scroll indicator when more than 4 results */}
            {hasResults && results.length > 4 && (
              <div className="py-1.5 bg-[#FFF0ED] border-t border-[#E0DCD7] flex items-center justify-center">
                <IconChevronDown className="w-4 h-4 text-[#FF6B4A] animate-bounce" />
                <span className="text-xs text-[#2D2D2D] ml-1">Scroll</span>
              </div>
            )}
          </div>

          {/* Toggle button - always visible */}
          <button
            onClick={handleToggle}
            className="self-start mt-4 w-6 h-12 bg-[#FF6B4A] hover:bg-[#E55A3A] text-white rounded-r-lg shadow-lg flex items-center justify-center transition-colors"
            aria-label={isCollapsed ? "Show search results" : "Hide search results"}
          >
            <IconChevronLeft className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
          </button>
      </div>


      {/* Desktop: Slide-able Full Panel - White background theme */}
      <div
        ref={desktopPanelRef}
        className="hidden md:flex fixed top-20 z-40"
        style={{ left: '16px' }}
      >
        {/* Panel content */}
        <div
          className="w-96 max-h-[calc(100vh-160px)] bg-white rounded-xl shadow-2xl border-2 border-[#FF6B4A] overflow-hidden flex flex-col"
        >
            {/* Header */}
            <div className="bg-[#FF6B4A] px-4 py-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2 text-white min-w-0 flex-1">
                <span className="text-2xl flex-shrink-0">🔍</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm opacity-80">Results for</p>
                  <p className="font-bold text-lg truncate">"{searchQuery}"</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:bg-white/20 rounded-full p-1 transition-colors flex-shrink-0"
                aria-label="Close results panel"
              >
                <IconClose className="w-6 h-6" />
              </button>
            </div>

            {/* Results count */}
            <div className="px-4 py-2 bg-[#FFF0ED] border-b border-[#E0DCD7] flex-shrink-0">
              <p className="text-sm text-[#2D2D2D] font-medium">
                {hasResults
                  ? `Showing ${Math.min(paginatedResults.length, results.length)} of ${results.length} ${results.length === 1 ? 'station' : 'stations'}`
                  : 'No results'}
              </p>
            </div>

            {/* Results list or no results message */}
            {hasResults ? (
              <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(4 * 90px)' }}>
                {paginatedResults.map((result) => {
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
                      className="w-full px-4 py-3 border-b border-[#E0DCD7] hover:bg-[#FFF0ED] transition-colors text-left group cursor-pointer"
                    >
                      {/* Station name */}
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg flex-shrink-0">📍</span>
                        <h3 className="font-bold text-base text-[#2D2D2D] group-hover:text-[#FF6B4A] transition-colors">
                          {stationName}
                        </h3>
                      </div>

                      {/* Matching restaurants preview */}
                      <div className="text-xs text-[#757575] ml-7 mt-2 space-y-1">
                        {result.matches.slice(0, 3).map((match, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <span className="font-medium text-[#2D2D2D] truncate flex-1">{match.name}</span>
                            {/* Source badge */}
                            {match.type === 'mall' && match.mallName ? (
                              <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full whitespace-nowrap flex-shrink-0">
                                {match.mallName}
                              </span>
                            ) : match.type === 'curated' ? (
                              <span className="text-[10px] px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-full whitespace-nowrap flex-shrink-0">
                                Curated
                              </span>
                            ) : match.type === 'chain' ? (
                              <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full whitespace-nowrap flex-shrink-0">
                                Chain
                              </span>
                            ) : null}
                            {match.matchedTags && match.matchedTags.length > 0 && (
                              <span className="text-[#FF6B4A]">• {match.matchedTags[0]}</span>
                            )}
                          </div>
                        ))}
                        {result.matches.length > 3 && (
                          <p className="text-[#757575] italic text-xs">
                            +{result.matches.length - 3} more...
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
                {/* Load More button */}
                {hasMore && (
                  <button
                    onClick={() => setPage(p => p + 1)}
                    className="w-full px-4 py-3 border-t border-[#E0DCD7] bg-[#FFF0ED] hover:bg-[#FFE0D8] text-[#FF6B4A] text-sm font-semibold transition-colors"
                  >
                    Load More ({results.length - paginatedResults.length} more stations)
                  </button>
                )}
              </div>
            ) : (
              <div className="p-6 text-center bg-[#FFF0ED]">
                <p className="text-[#FF6B4A] font-medium">No food found for "{searchQuery}"</p>
                <p className="text-[#757575] text-sm mt-2">Try a different search term</p>
              </div>
            )}

            {/* Scroll indicator when more than 4 results */}
            {hasResults && results.length > 4 && (
              <div className="py-2 bg-[#FFF0ED] border-t border-[#E0DCD7] flex items-center justify-center flex-shrink-0">
                <IconChevronDown className="w-5 h-5 text-[#FF6B4A] animate-bounce" />
                <span className="text-sm text-[#2D2D2D] ml-1 font-medium">Scroll for more</span>
              </div>
            )}
          </div>

        {/* Toggle button - always visible */}
        <button
          onClick={handleToggle}
          className="self-start mt-4 ml-2 w-8 h-16 bg-[#FF6B4A] hover:bg-[#E55A3A] text-white rounded-r-lg shadow-lg flex items-center justify-center transition-colors"
          aria-label={isCollapsed ? "Show search results" : "Hide search results"}
        >
          <IconChevronLeft className={`w-5 h-5 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>

    </>
  );
}
