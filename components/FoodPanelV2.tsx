'use client';

import { useRef, useState, useCallback, useEffect, RefObject } from 'react';
import { SponsoredListing as DbSponsoredListing, FoodListingWithSources } from '@/types/database';
import { stationNames } from '@/data/mock-data';
import { useStationFood } from '@/hooks/useStationFood';
import { useMallsByStation, useMallOutlets } from '@/hooks/useMalls';
import { SearchMatch } from '@/lib/api';
import { SpinSelectionProvider, useSpinSelection } from '@/contexts/SpinSelectionContext';
import FoodListingCardV2 from './FoodListingCardV2';
import RestaurantGridCard from './RestaurantGridCard';
import SlotMachine from './SlotMachine';
import OutletSlotMachine from './OutletSlotMachine';
import MenuPreview from './MenuPreview';
import ModeToggle, { PanelMode } from './ModeToggle';
import MallList from './MallList';
import OutletList from './OutletList';
import EmptyStationRedirect from './EmptyStationRedirect';
import { IconClose } from './Icons';

// Scroll to top button component
function ScrollToTopButton({
  containerRef,
  threshold = 300,
  isMobile = false
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  threshold?: number;
  isMobile?: boolean;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setIsVisible(container.scrollTop > threshold);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [containerRef, threshold]);

  const scrollToTop = () => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      className={`w-10 h-10 bg-[#FF6B4A] hover:bg-[#E55A3A] text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 ${
        isMobile ? 'fixed z-40' : ''
      }`}
      style={isMobile ? { bottom: 'calc(env(safe-area-inset-bottom) + 16px)', right: '16px' } : {}}
      aria-label="Scroll to top"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M18 15l-6-6-6 6" />
      </svg>
    </button>
  );
}

interface FoodPanelV2Props {
  stationId: string | null;
  onClose: () => void;
  onNavigateToStation?: (stationId: string) => void;
  isMobile?: boolean;
  searchQuery?: string;
  searchMatches?: SearchMatch[];
  highlightedListingId?: string | null;
  onHighlightClear?: () => void;
}

// Sponsored listing card for Supabase data
function SponsoredCardDb({ listing }: { listing: DbSponsoredListing }) {
  return (
    <div className="bg-amber-50/60 border border-amber-100 rounded-lg overflow-hidden">
      <div className="px-3 py-1.5">
        <span className="text-xs font-medium text-amber-700">Advertisement</span>
      </div>
      <div className="px-3 pb-3">
        <div className="flex gap-3">
          <div className="w-16 h-16 bg-gray-200 rounded-md flex-shrink-0 flex items-center justify-center">
            <span className="text-2xl">🍽️</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm">{listing.restaurant_name}</h3>
            {listing.restaurant_rating && (
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-amber-500 text-xs">★</span>
                <span className="text-xs text-gray-600">{listing.restaurant_rating}</span>
              </div>
            )}
            {listing.promotion && (
              <p className="text-xs text-amber-700 font-medium mt-1">
                {listing.promotion}
              </p>
            )}
          </div>
        </div>
        {listing.link && (
          <a
            href={listing.link}
            className="mt-3 block w-full text-center py-2 px-3 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-medium rounded-md transition-colors"
          >
            View Offer
          </a>
        )}
      </div>
    </div>
  );
}

// Spin button with selection counter badge
function SpinButtonWithBadge({
  show,
  onClick,
  type
}: {
  show: boolean;
  onClick: () => void;
  type: 'listing' | 'outlet';
}) {
  const { listingCount, outletCount, clearListings, clearOutlets, MAX_ITEMS } = useSpinSelection();
  const count = type === 'listing' ? listingCount : outletCount;
  const clearFn = type === 'listing' ? clearListings : clearOutlets;

  if (!show) return null;

  const hasSelection = count > 0;

  return (
    <div className="mb-1.5">
      {/* Info text when no selection */}
      {!hasSelection && (
        <p className="text-xs text-gray-500 text-center mb-1">
          💡 Tap "Add to Spin" on items below, then spin!
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={onClick}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-sm font-semibold rounded-lg transition-all ${
            hasSelection
              ? 'bg-[#FF6B4A] text-white hover:bg-[#E55A3A] shadow-lg'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <span>🎰</span>
          <span>
            {hasSelection
              ? `Spin (${count})`
              : "Spin All"
            }
          </span>
        </button>

        {/* Clear button - only show when items are selected */}
        {hasSelection && (
          <button
            onClick={clearFn}
            className="px-2 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors text-xs font-medium"
            aria-label="Clear selection"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-8">
      <div className="text-4xl mb-3">🍜</div>
      <p className="text-gray-500 text-sm">
        No food places added yet for this station.
      </p>
      <p className="text-gray-400 text-xs mt-1">
        Check back soon!
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-gray-100 rounded-lg p-4 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}

const isSupabaseConfigured = () => {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
};

export default function FoodPanelV2({ stationId, onClose, onNavigateToStation, isMobile = false, searchQuery = '', searchMatches = [], highlightedListingId, onHighlightClear }: FoodPanelV2Props) {
  const [selectedMenuListing, setSelectedMenuListing] = useState<FoodListingWithSources | null>(null);
  const [mode, setMode] = useState<PanelMode>('popular');
  const [selectedMallId, setSelectedMallId] = useState<string | null>(null);
  const [autoSwitchedForQuery, setAutoSwitchedForQuery] = useState<string | null>(null);
  const [listingsPage, setListingsPage] = useState(1);
  const [sortBy, setSortBy] = useState<'distance' | 'rating'>('distance');
  const [showSpinWheel, setShowSpinWheel] = useState(false);
  const [showOutletSpinWheel, setShowOutletSpinWheel] = useState(false);
  const desktopScrollRef = useRef<HTMLDivElement>(null);
  const highlightedRef = useRef<HTMLDivElement>(null);

  const LISTINGS_PER_PAGE = 20;

  // Reset selected menu listing, mall, and pagination when station changes
  useEffect(() => {
    setSelectedMenuListing(null);
    setSelectedMallId(null);
    setListingsPage(1);
  }, [stationId]);

  // Reset pagination when mode or sort changes
  useEffect(() => {
    setListingsPage(1);
  }, [mode, sortBy]);

  const { data, separatedListings, loading, error } = useStationFood(
    isSupabaseConfigured() ? stationId : null
  );

  // Fetch malls for current station
  const { malls, loading: mallsLoading } = useMallsByStation(
    isSupabaseConfigured() ? stationId : null
  );

  // Fetch outlets for selected mall
  const { mall: selectedMall, outlets, loading: outletsLoading } = useMallOutlets(
    selectedMallId
  );

  // Scroll to highlighted listing when it's set (from deep link)
  // This effect also expands pagination if needed to show the highlighted listing
  useEffect(() => {
    if (!highlightedListingId || loading) return;

    // Check which tab contains the highlighted listing
    const inPopular = separatedListings.popular.some(l => l.id === highlightedListingId);
    const inCurated = separatedListings.recommended.some(l => l.id === highlightedListingId) ||
                      separatedListings.foodKingOnly.some(l => l.id === highlightedListingId);

    // Determine which listings to check based on current mode or auto-switch
    let targetListings: FoodListingWithSources[] = [];
    let targetMode: PanelMode | null = null;

    if (inPopular) {
      targetListings = separatedListings.popular;
      targetMode = 'popular';
    } else if (inCurated) {
      targetListings = [...separatedListings.recommended, ...separatedListings.foodKingOnly];
      targetMode = 'curated';
    }

    // Auto-switch to the correct tab if not already there
    if (targetMode && mode !== targetMode) {
      setMode(targetMode);
      return; // Re-run after mode changes
    }

    // Sort by the current sort order (same logic as renderListings)
    const sortedListings = [...targetListings].sort((a, b) => {
      if (sortBy === 'rating') {
        const ratingA = a.rating ?? 0;
        const ratingB = b.rating ?? 0;
        if (ratingB !== ratingA) return ratingB - ratingA;
        const distA = a.distance_to_station ?? a.walking_time ?? Infinity;
        const distB = b.distance_to_station ?? b.walking_time ?? Infinity;
        return distA - distB;
      }
      const distA = a.distance_to_station ?? a.walking_time ?? Infinity;
      const distB = b.distance_to_station ?? b.walking_time ?? Infinity;
      return distA - distB;
    });

    // Find the index in the sorted list
    const highlightedIndex = sortedListings.findIndex(l => l.id === highlightedListingId);

    if (highlightedIndex >= 0) {
      // Calculate which page this listing would be on
      const neededPage = Math.ceil((highlightedIndex + 1) / LISTINGS_PER_PAGE);

      // Expand pagination if needed
      if (neededPage > listingsPage) {
        setListingsPage(neededPage);
        return; // The effect will re-run after listingsPage updates
      }
    }

    // Now scroll to the element if it exists
    if (highlightedRef.current) {
      setTimeout(() => {
        highlightedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [highlightedListingId, loading, separatedListings, listingsPage, mode, sortBy]);

  if (!stationId) return null;

  const useSupabase = isSupabaseConfigured() && !error;

  const stationName = useSupabase && data?.station
    ? data.station.name
    : stationNames[stationId] || stationId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());


  // Helper function to check if listing matches search query
  // Check if a listing/outlet matches the current search
  const matchesSearch = (item: { id?: string; name?: string }) => {
    if (!searchQuery || searchMatches.length === 0) return false;

    // Check if this item's ID is in the search matches
    if (item.id) {
      return searchMatches.some(match => match.id === item.id);
    }

    // Fallback: check by name (for items without ID)
    if (item.name) {
      return searchMatches.some(match => match.name === item.name);
    }

    return false;
  };

  // Get mall outlet matches for this station
  const mallOutletMatches = searchMatches.filter(m => m.type === 'mall');
  const isSearchActive = searchQuery && searchMatches.length > 0;
  const hasMallMatches = mallOutletMatches.length > 0;

  // Get curated listing matches (type === 'curated' in search results)
  const curatedMatches = searchMatches.filter(m => m.type === 'curated');
  const hasCuratedMatches = curatedMatches.length > 0;

  // Determine which modes have content
  // Note: "other" (listings without sources) are no longer shown - only categorized listings
  // When search is active, only show tabs that have matching results
  const hasCuratedContent = separatedListings.recommended.length > 0 || separatedListings.foodKingOnly.length > 0;
  const hasPopularContent = separatedListings.popular.length > 0;
  const hasMallsContent = malls.length > 0;

  // Build array of available modes
  // When search is active, only show tabs that have search matches
  const availableModes: PanelMode[] = [];
  if (hasPopularContent && (!isSearchActive || separatedListings.popular.some(l => matchesSearch(l)))) {
    availableModes.push('popular');
  }
  if (hasCuratedContent && (!isSearchActive || hasCuratedMatches)) {
    availableModes.push('curated');
  }
  // Only show malls tab if: no search active, OR search has mall matches
  if (hasMallsContent && (!isSearchActive || hasMallMatches)) availableModes.push('malls');

  // Auto-switch to appropriate tab based on available content and search
  useEffect(() => {
    // Auto-switch to malls tab when search has mall matches (only once per search query)
    if (hasMallMatches && searchQuery && autoSwitchedForQuery !== searchQuery && availableModes.includes('malls')) {
      setMode('malls');
      setAutoSwitchedForQuery(searchQuery);
      // Auto-select the mall if there's only one mall with matches
      const matchingMallIds = [...new Set(mallOutletMatches.map(m => m.mallId).filter(Boolean))];
      if (matchingMallIds.length === 1 && matchingMallIds[0]) {
        setSelectedMallId(matchingMallIds[0]);
      }
    }
    // Reset the flag when search is cleared
    if (!searchQuery && autoSwitchedForQuery) {
      setAutoSwitchedForQuery(null);
    }
  }, [hasMallMatches, searchQuery, autoSwitchedForQuery, mallOutletMatches, availableModes]);

  // Auto-switch mode if current mode is not available
  useEffect(() => {
    if (availableModes.length > 0 && !availableModes.includes(mode)) {
      setMode(availableModes[0]);
    }
  }, [availableModes, mode]);

  const renderListings = () => {
    if (loading) {
      return <LoadingState />;
    }

    if (!data) {
      return <EmptyState />;
    }

    // Get listings based on mode
    // Popular: popular source only (no longer including "other" - listings without sources)
    // Curated: recommended + food king
    // Note: Listings without sources are hidden - they should have sources assigned
    const modeListings = mode === 'popular'
      ? [...separatedListings.popular]
      : [...separatedListings.recommended, ...separatedListings.foodKingOnly];

    const hasContent = data.sponsored || modeListings.length > 0;

    if (!hasContent) {
      return <EmptyState />;
    }

    // Filter listings based on search matches (if search is active)
    const filteredListings = isSearchActive
      ? modeListings.filter(listing => matchesSearch(listing))
      : modeListings;

    // Sort filtered listings based on selected sort option
    const sortedListings = [...filteredListings].sort((a, b) => {
      if (sortBy === 'rating') {
        // Sort by rating (highest first), then by distance as tiebreaker
        const ratingA = a.rating ?? 0;
        const ratingB = b.rating ?? 0;
        if (ratingB !== ratingA) return ratingB - ratingA;
        // Tiebreaker: distance
        const distA = a.distance_to_station ?? a.walking_time ?? Infinity;
        const distB = b.distance_to_station ?? b.walking_time ?? Infinity;
        return distA - distB;
      }
      // Default: sort by distance (closest first)
      const distA = a.distance_to_station ?? a.walking_time ?? Infinity;
      const distB = b.distance_to_station ?? b.walking_time ?? Infinity;
      return distA - distB;
    });

    // Apply pagination
    const paginatedListings = sortedListings.slice(0, listingsPage * LISTINGS_PER_PAGE);
    const hasMoreListings = sortedListings.length > listingsPage * LISTINGS_PER_PAGE;

    // If search is active but no matches at this station, show empty state
    if (isSearchActive && paginatedListings.length === 0) {
      return (
        <div className="text-center py-8 bg-[#F5F3F0] rounded-lg mx-2 border border-[#E0DCD7]">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-[#2D2D2D] text-sm font-medium">
            No "{searchQuery}" found at this station.
          </p>
          <p className="text-[#757575] text-xs mt-1">
            Try a different station or search term.
          </p>
        </div>
      );
    }

    // If no listings in this mode
    if (paginatedListings.length === 0) {
      return (
        <div className="text-center py-8 bg-[#F5F3F0] rounded-lg border border-[#E0DCD7]">
          <div className="text-4xl mb-3">{mode === 'popular' ? '🧭' : '⭐'}</div>
          <p className="text-[#2D2D2D] text-sm font-medium">
            No {mode === 'popular' ? 'places to explore' : 'featured places'} yet.
          </p>
          <p className="text-[#757575] text-xs mt-1">
            Try the other tab!
          </p>
        </div>
      );
    }

    return (
      <>
        {/* Slot Machine Modal */}
        {showSpinWheel && (
          <SlotMachine
            listings={sortedListings}
            onClose={() => setShowSpinWheel(false)}
          />
        )}

        {/* Show sponsored only when no search filter */}
        {!isSearchActive && data.sponsored && <SponsoredCardDb listing={data.sponsored} />}

        {/* All listings sorted by distance */}
        <div>
          {/* Search filter indicator */}
          {isSearchActive && (
            <div className="flex items-center gap-2 text-sm font-medium text-[#2D2D2D] bg-[#FFF0ED] rounded-lg px-3 py-2 mb-3 border border-[#FF6B4A]">
              <span className="text-base">🔍</span>
              <span>Showing "{searchQuery}" ({sortedListings.length})</span>
            </div>
          )}
          {/* Single column list */}
          <div className="space-y-2">
            {paginatedListings.map((listing) => {
              const isHighlighted = listing.id === highlightedListingId;
              return (
                <div
                  key={listing.id}
                  ref={isHighlighted ? highlightedRef : undefined}
                  onClick={isHighlighted ? onHighlightClear : undefined}
                >
                  <FoodListingCardV2
                    listing={listing}
                    highlighted={isHighlighted}
                    onViewMenu={setSelectedMenuListing}
                  />
                </div>
              );
            })}
          </div>
          {/* Load More button */}
          {hasMoreListings && (
            <button
              onClick={() => setListingsPage(p => p + 1)}
              className="w-full mt-3 py-3 px-4 bg-[#FF6B4A] hover:bg-[#E55A3A] text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Load More ({sortedListings.length - paginatedListings.length} more)
            </button>
          )}
        </div>
      </>
    );
  };

  const renderMallsContent = () => {
    console.log('🏬 renderMallsContent:', { selectedMallId, selectedMall, outlets: outlets.length, outletsLoading });

    // If a mall is selected, show the outlet list
    if (selectedMallId) {
      // Filter outlets if search is active
      const filteredOutlets = isSearchActive && hasMallMatches
        ? outlets.filter(outlet => mallOutletMatches.some(m => m.id === outlet.id))
        : outlets;

      return (
        <>
          {/* Search filter indicator for malls */}
          {isSearchActive && hasMallMatches && (
            <div className="flex items-center gap-2 text-sm font-medium text-[#2D2D2D] bg-[#FFF0ED] rounded-lg px-3 py-2 mb-3 border border-[#FF6B4A]">
              <span className="text-base">🔍</span>
              <span>Showing "{searchQuery}" ({filteredOutlets.length})</span>
            </div>
          )}
          <OutletList
            mall={selectedMall}
            outlets={filteredOutlets}
            loading={outletsLoading}
            onBack={() => setSelectedMallId(null)}
            hideHeader={true}
          />
        </>
      );
    }

    // Otherwise show the mall list
    // Filter to only show malls that have matching outlets
    const filteredMalls = isSearchActive && hasMallMatches
      ? malls.filter(mall => mallOutletMatches.some(m => m.mallId === mall.id))
      : malls;

    return (
      <>
        {/* Search filter indicator for malls */}
        {isSearchActive && hasMallMatches && (
          <div className="flex items-center gap-2 text-sm font-medium text-[#2D2D2D] bg-[#FFF0ED] rounded-lg px-3 py-2 mb-3 border border-[#FF6B4A]">
            <span className="text-base">🔍</span>
            <span>Showing malls with "{searchQuery}"</span>
          </div>
        )}
        <MallList
          malls={filteredMalls}
          loading={mallsLoading}
          onSelectMall={setSelectedMallId}
        />
      </>
    );
  };

  const renderContent = () => {
    console.log('📄 renderContent:', { loading, mallsLoading, mode, availableModes, hasMallsContent });

    // Show loading state while data is being fetched
    if (loading || mallsLoading) {
      return <LoadingState />;
    }

    // If nearbyRedirect is present, show redirect card
    if (data?.nearbyRedirect) {
      return (
        <EmptyStationRedirect
          currentStationName={stationName}
          redirect={data.nearbyRedirect}
          onNavigate={(nearbyStationId) => {
            if (onNavigateToStation) {
              onNavigateToStation(nearbyStationId);
            }
          }}
        />
      );
    }

    // If no content at all, show empty state
    if (availableModes.length === 0) {
      return (
        <div className="text-center py-8">
          <div className="text-4xl mb-3">🚫</div>
          <p className="text-gray-500 text-sm">
            No food places or malls at this station yet.
          </p>
          <p className="text-gray-400 text-xs mt-1">
            Check back soon!
          </p>
        </div>
      );
    }

    // Check if we should show the spin header for food listings
    const shouldShowSpinHeader = mode !== 'malls' && !isSearchActive && (() => {
      const modeListings = mode === 'popular'
        ? [...separatedListings.popular]
        : [...separatedListings.recommended, ...separatedListings.foodKingOnly];
      return modeListings.length > 1;
    })();

    // Check if we're viewing mall outlets (for sticky header controls)
    const isViewingMallOutlets = mode === 'malls' && selectedMallId && outlets.length >= 2;

    return (
      <>
        {/* Combined Sticky Header - Mode Toggle + Spin Button + Sort */}
        <div
          className="sticky top-0 z-30 bg-white pt-1 pb-1.5 border-b border-gray-100"
          style={{
            paddingLeft: 'clamp(12px, 4vw, 20px)',
            paddingRight: 'clamp(12px, 4vw, 20px)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
          }}
        >
          {/* Mode Toggle */}
          <ModeToggle
            mode={mode}
            onModeChange={(newMode) => {
              setMode(newMode);
              // Reset mall selection when switching modes
              if (newMode !== 'malls') {
                setSelectedMallId(null);
              }
            }}
            availableModes={availableModes}
          />

          {/* Mall Outlets: Back button + Spin controls */}
          {isViewingMallOutlets && (
            <div className="mt-1">
              {/* Back button with mall name */}
              <button
                onClick={() => setSelectedMallId(null)}
                className="flex items-center gap-1 text-sm font-medium text-[#2D2D2D] hover:text-[#FF6B4A] transition-colors mb-1"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                <span>{selectedMall?.name || 'Back'}</span>
              </button>

              {/* Spin Button */}
              <SpinButtonWithBadge
                show={true}
                onClick={() => setShowOutletSpinWheel(true)}
                type="outlet"
              />
            </div>
          )}

          {/* Spin Button & Sort Controls (only for listings, not malls) */}
          {shouldShowSpinHeader && (
            <div className="mt-1">
              {/* Spin Button */}
              <SpinButtonWithBadge
                show={true}
                onClick={() => setShowSpinWheel(true)}
                type="listing"
              />

              {/* Sort controls */}
              <div className="flex items-center justify-between bg-[#F5F3F0] rounded-md px-2 py-1">
                <span className="text-xs text-[#757575]">
                  {(() => {
                    const modeListings = mode === 'popular'
                      ? [...separatedListings.popular]
                      : [...separatedListings.recommended, ...separatedListings.foodKingOnly];
                    return `${Math.min(listingsPage * LISTINGS_PER_PAGE, modeListings.length)} of ${modeListings.length}`;
                  })()}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-[#757575] mr-1">Sort:</span>
                  <button
                    onClick={() => setSortBy('distance')}
                    className={`px-2 py-1 text-xs rounded-md transition-colors ${
                      sortBy === 'distance'
                        ? 'bg-[#FF6B4A] text-white font-medium'
                        : 'bg-white text-[#757575] hover:bg-gray-100'
                    }`}
                  >
                    🚶 Nearest
                  </button>
                  <button
                    onClick={() => setSortBy('rating')}
                    className={`px-2 py-1 text-xs rounded-md transition-colors ${
                      sortBy === 'rating'
                        ? 'bg-[#FF6B4A] text-white font-medium'
                        : 'bg-white text-[#757575] hover:bg-gray-100'
                    }`}
                  >
                    ⭐ Rating
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content based on mode */}
        <div
          className="pt-2 space-y-2"
          style={{
            paddingLeft: 'clamp(12px, 4vw, 20px)',
            paddingRight: 'clamp(12px, 4vw, 20px)',
            paddingBottom: 'clamp(12px, 4vw, 20px)',
          }}
        >
          {mode === 'malls' ? renderMallsContent() : renderListings()}
        </div>

        {/* Outlet Slot Machine Modal */}
        {showOutletSpinWheel && (
          <OutletSlotMachine
            outlets={outlets}
            onClose={() => setShowOutletSpinWheel(false)}
          />
        )}
      </>
    );
  };

  // Desktop panel
  if (!isMobile) {
    return (
      <SpinSelectionProvider>
      <div className="w-[350px] h-full bg-white border-l border-gray-200 shadow-lg panel-container relative">
        {/* Main listing panel */}
        <div className={`panel-content ${selectedMenuListing ? 'slide-out-left' : ''} bg-white`}>
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E0DCD7] bg-[#FFFBF7] flex-shrink-0">
              <h2 className="text-lg font-bold text-[#2D2D2D]">{stationName}</h2>
              <button
                onClick={onClose}
                className="p-1 hover:bg-[#FFF0ED] rounded-full transition-colors"
                aria-label="Close panel"
              >
                <IconClose className="w-5 h-5 text-[#2D2D2D]" />
              </button>
            </div>
            <div ref={desktopScrollRef} className="flex-1 overflow-y-auto relative">
              {renderContent()}
            </div>
          </div>
        </div>

        {/* Scroll to top button - positioned within panel */}
        <div className="absolute bottom-4 right-4 z-30">
          <ScrollToTopButton containerRef={desktopScrollRef} />
        </div>

        {/* Menu preview overlay */}
        <div className={`menu-panel-overlay ${selectedMenuListing ? 'slide-in' : ''} bg-white`}>
          {selectedMenuListing && (
            <MenuPreview
              listing={selectedMenuListing}
              onBack={() => setSelectedMenuListing(null)}
            />
          )}
        </div>
      </div>
      </SpinSelectionProvider>
    );
  }

  // Mobile drawer with swipe-to-dismiss
  return (
    <SpinSelectionProvider>
    <MobileDrawer
      stationName={stationName}
      onClose={onClose}
      selectedMenuListing={selectedMenuListing}
      onBackFromMenu={() => setSelectedMenuListing(null)}
    >
      {renderContent()}
    </MobileDrawer>
    </SpinSelectionProvider>
  );
}

// Separate MobileDrawer component for swipe handling
function MobileDrawer({
  stationName,
  onClose,
  selectedMenuListing,
  onBackFromMenu,
  children
}: {
  stationName: string;
  onClose: () => void;
  selectedMenuListing: FoodListingWithSources | null;
  onBackFromMenu: () => void;
  children: React.ReactNode;
}) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const startY = useRef(0);
  const currentY = useRef(0);

  // Handle close with animation
  const handleClose = useCallback(() => {
    setIsClosing(true);
    // Wait for animation to complete before calling onClose
    setTimeout(() => {
      onClose();
    }, 250); // Match the animation duration
  }, [onClose]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isClosing) return;
    // Only allow drag from header area or when content is scrolled to top
    const touch = e.touches[0];
    const target = e.target as HTMLElement;
    const isHeader = target.closest('[data-drag-handle]');
    const contentScrollTop = contentRef.current?.scrollTop || 0;

    if (isHeader || contentScrollTop === 0) {
      startY.current = touch.clientY;
      currentY.current = touch.clientY;
      setIsDragging(true);
    }
  }, [isClosing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || isClosing) return;

    const touch = e.touches[0];
    const deltaY = touch.clientY - startY.current;

    // Only allow dragging down (positive deltaY)
    if (deltaY > 0) {
      // Prevent browser pull-to-refresh
      e.preventDefault();
      currentY.current = touch.clientY;
      setDragY(deltaY);
    }
  }, [isDragging, isClosing]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging || isClosing) return;

    const deltaY = currentY.current - startY.current;

    // If dragged more than 100px down, close the drawer with animation
    if (deltaY > 100) {
      handleClose();
    }

    // Reset state
    setDragY(0);
    setIsDragging(false);
    startY.current = 0;
    currentY.current = 0;
  }, [isDragging, isClosing, handleClose]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 ${isClosing ? 'drawer-overlay-closing' : 'drawer-overlay'}`}
        onClick={handleClose}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-[clamp(12px,3vw,20px)] shadow-2xl ${
          isClosing ? 'animate-slide-down' : 'animate-slide-up'
        }`}
        style={{
          height: 'min(80dvh, 80vh)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 0px)',
          transform: isClosing ? undefined : `translateY(${dragY}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Main listing panel */}
        <div className={`panel-content ${selectedMenuListing ? 'slide-out-left' : ''}`}>
          <div className="flex flex-col h-full">
            {/* Drag handle */}
            <div
              data-drag-handle
              className="flex justify-center cursor-grab active:cursor-grabbing flex-shrink-0"
              style={{
                paddingTop: 'clamp(8px, 2vw, 12px)',
                paddingBottom: 'clamp(8px, 2vw, 12px)',
              }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div
                className="bg-gray-300 rounded-full"
                style={{
                  width: 'clamp(40px, 12vw, 48px)',
                  height: 'clamp(4px, 1vw, 6px)',
                }}
              />
            </div>

            {/* Header */}
            <div
              data-drag-handle
              className="flex items-center justify-between border-b border-[#E0DCD7] bg-[#FFFBF7] flex-shrink-0"
              style={{
                paddingLeft: 'clamp(12px, 4vw, 20px)',
                paddingRight: 'clamp(12px, 4vw, 20px)',
                paddingTop: 'clamp(8px, 2vw, 12px)',
                paddingBottom: 'clamp(8px, 2vw, 12px)',
              }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <h2
                className="font-bold text-[#2D2D2D]"
                style={{ fontSize: 'clamp(16px, 4.5vw, 20px)' }}
              >
                {stationName}
              </h2>
              <button
                onClick={handleClose}
                className="hover:bg-[#FFF0ED] rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Close drawer"
                style={{
                  padding: 'clamp(8px, 2vw, 10px)',
                }}
              >
                <IconClose
                  className="text-[#2D2D2D]"
                  style={{ width: 'clamp(18px, 5vw, 20px)', height: 'clamp(18px, 5vw, 20px)' }}
                />
              </button>
            </div>

            {/* Content - scrollable */}
            <div
              ref={contentRef}
              className="flex-1 overflow-hidden"
            >
              {/* Inner scroll container - this is the actual scrollable area */}
              <div
                className="h-full overflow-y-auto overflow-x-hidden overscroll-contain"
                style={{
                  WebkitOverflowScrolling: 'touch',
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {children}
              </div>
            </div>
          </div>
        </div>

        {/* Scroll to top button for mobile */}
        <ScrollToTopButton containerRef={contentRef} isMobile={true} />

        {/* Menu preview overlay */}
        <div className={`menu-panel-overlay ${selectedMenuListing ? 'slide-in' : ''}`}>
          {selectedMenuListing && (
            <MenuPreview
              listing={selectedMenuListing}
              onBack={onBackFromMenu}
            />
          )}
        </div>
      </div>
    </>
  );
}
