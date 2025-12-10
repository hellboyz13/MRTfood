'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { SponsoredListing as DbSponsoredListing, FoodListingWithSources } from '@/types/database';
import { stationNames } from '@/data/mock-data';
import { useStationFood } from '@/hooks/useStationFood';
import { SearchMatch } from '@/lib/api';
import FoodListingCardV2 from './FoodListingCardV2';
import SlotMachine from './SlotMachine';
import MenuPreview from './MenuPreview';
import { IconClose } from './Icons';

interface FoodPanelV2Props {
  stationId: string | null;
  onClose: () => void;
  isMobile?: boolean;
  searchQuery?: string;
  searchMatches?: SearchMatch[];
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

export default function FoodPanelV2({ stationId, onClose, isMobile = false, searchQuery = '', searchMatches = [] }: FoodPanelV2Props) {
  const [selectedMenuListing, setSelectedMenuListing] = useState<FoodListingWithSources | null>(null);

  const { data, separatedListings, loading, error } = useStationFood(
    isSupabaseConfigured() ? stationId : null
  );

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

  const renderCuratedContent = () => {
    if (loading) {
      return <LoadingState />;
    }

    if (!data) {
      return <EmptyState />;
    }

    const hasContent = data.sponsored || data.listings.length > 0;

    if (!hasContent) {
      return <EmptyState />;
    }

    // Sort all listings by distance (closest first)
    const sortedListings = [...data.listings].sort((a, b) => {
      const distA = a.distance_to_station ?? a.walking_time ?? Infinity;
      const distB = b.distance_to_station ?? b.walking_time ?? Infinity;
      return distA - distB;
    });

    return (
      <>
        {/* Slot Machine - show when there are 2+ listings */}
        {data.listings.length > 1 && (
          <SlotMachine
            listings={data.listings}
            onSelectWinner={() => {}}
          />
        )}

        {data.sponsored && <SponsoredCardDb listing={data.sponsored} />}

        {/* All listings sorted by distance */}
        {sortedListings.length > 0 && (
          <div className="space-y-2">
            {/* Sort indicator */}
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg px-3 py-2 mb-1">
              <span className="text-base">🚶</span>
              <span>Sorted by walking distance</span>
            </div>
            {sortedListings.map((listing) => (
              <FoodListingCardV2
                key={listing.id}
                listing={listing}
                highlighted={matchesSearch(listing)}
                onViewMenu={setSelectedMenuListing}
              />
            ))}
          </div>
        )}
      </>
    );
  };

  const renderContent = () => {
    return renderCuratedContent();
  };

  // Desktop panel
  if (!isMobile) {
    return (
      <div className="w-[350px] h-full bg-white border-l border-gray-200 shadow-lg panel-container">
        {/* Main listing panel */}
        <div className={`panel-content ${selectedMenuListing ? 'slide-out-left' : ''} bg-white`}>
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E8B931] bg-[#E8B931] flex-shrink-0">
              <h2 className="text-lg font-bold text-[#1a1a1a]">{stationName}</h2>
              <button
                onClick={onClose}
                className="p-1 hover:bg-[#F5D251] rounded-full transition-colors"
                aria-label="Close panel"
              >
                <IconClose className="w-5 h-5 text-[#1a1a1a]" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {renderContent()}
            </div>
          </div>
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
    );
  }

  // Mobile drawer with swipe-to-dismiss
  return (
    <MobileDrawer
      stationName={stationName}
      onClose={onClose}
      selectedMenuListing={selectedMenuListing}
      onBackFromMenu={() => setSelectedMenuListing(null)}
    >
      {renderContent()}
    </MobileDrawer>
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
              className="flex items-center justify-between border-b border-[#E8B931] bg-[#E8B931] flex-shrink-0"
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
                className="font-bold text-[#1a1a1a]"
                style={{ fontSize: 'clamp(16px, 4.5vw, 20px)' }}
              >
                {stationName}
              </h2>
              <button
                onClick={handleClose}
                className="hover:bg-[#F5D251] rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Close drawer"
                style={{
                  padding: 'clamp(8px, 2vw, 10px)',
                }}
              >
                <IconClose
                  className="text-[#1a1a1a]"
                  style={{ width: 'clamp(18px, 5vw, 20px)', height: 'clamp(18px, 5vw, 20px)' }}
                />
              </button>
            </div>

            {/* Content - scrollable */}
            <div
              ref={contentRef}
              className="flex-1 overflow-y-auto overscroll-contain space-y-3"
              style={{
                padding: 'clamp(12px, 4vw, 20px)',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {children}
            </div>
          </div>
        </div>

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
