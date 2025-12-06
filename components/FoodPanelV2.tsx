'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { SponsoredListing as DbSponsoredListing } from '@/types/database';
import { stationNames } from '@/data/mock-data';
import { useStationFood } from '@/hooks/useStationFood';
import FoodListingCardV2 from './FoodListingCardV2';
import SlotMachine from './SlotMachine';

interface FoodPanelV2Props {
  stationId: string | null;
  onClose: () => void;
  isMobile?: boolean;
  searchQuery?: string;
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

export default function FoodPanelV2({ stationId, onClose, isMobile = false, searchQuery = '' }: FoodPanelV2Props) {
  const { data, separatedListings, loading, error } = useStationFood(
    isSupabaseConfigured() ? stationId : null
  );

  if (!stationId) return null;

  const useSupabase = isSupabaseConfigured() && !error;

  const stationName = useSupabase && data?.station
    ? data.station.name
    : stationNames[stationId] || stationId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  // Helper function to check if listing matches search query
  const matchesSearch = (listing: any) => {
    if (!searchQuery) return false;
    const query = searchQuery.toLowerCase();

    // Check name
    if (listing.name?.toLowerCase().includes(query)) return true;

    // Check description
    if (listing.description?.toLowerCase().includes(query)) return true;

    // Check tags
    if (listing.tags && Array.isArray(listing.tags)) {
      return listing.tags.some((tag: string) => tag.toLowerCase().includes(query));
    }

    return false;
  };

  const renderContent = () => {
    if (loading) {
      return <LoadingState />;
    }

    if (!data) {
      return <EmptyState />;
    }

    const { recommended, foodKingOnly } = separatedListings;
    const hasContent = data.sponsored || recommended.length > 0 || foodKingOnly.length > 0;

    if (!hasContent) {
      return <EmptyState />;
    }

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

        {/* Michelin Guide section */}
        {recommended.length > 0 && (
          <div className="space-y-2">
            <div className="space-y-2">
              {recommended.map((listing) => (
                <FoodListingCardV2 key={listing.id} listing={listing} highlighted={matchesSearch(listing)} />
              ))}
            </div>
          </div>
        )}

        {/* Food King only section */}
        {foodKingOnly.length > 0 && (
          <div className="space-y-2">
            <h2 className="flex items-center gap-2 text-base font-semibold text-gray-800">
              <span>📺</span>
              <span>As Seen on Food King</span>
              <span className="text-xs font-normal text-gray-500">({foodKingOnly.length})</span>
            </h2>
            <div className="space-y-2">
              {foodKingOnly.map((listing) => (
                <FoodListingCardV2 key={listing.id} listing={listing} highlighted={matchesSearch(listing)} />
              ))}
            </div>
          </div>
        )}
      </>
    );
  };

  // Desktop panel
  if (!isMobile) {
    return (
      <div className="w-[350px] h-full bg-white border-l border-gray-200 shadow-lg flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">{stationName}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded-full transition-colors"
            aria-label="Close panel"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {renderContent()}
        </div>
      </div>
    );
  }

  // Mobile drawer with swipe-to-dismiss
  return (
    <MobileDrawer stationName={stationName} onClose={onClose}>
      {renderContent()}
    </MobileDrawer>
  );
}

// Separate MobileDrawer component for swipe handling
function MobileDrawer({
  stationName,
  onClose,
  children
}: {
  stationName: string;
  onClose: () => void;
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
        className={`fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[70vh] flex flex-col touch-none ${
          isClosing ? 'animate-slide-down' : 'animate-slide-up'
        }`}
        style={{
          transform: isClosing ? undefined : `translateY(${dragY}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div data-drag-handle className="flex justify-center py-3 cursor-grab active:cursor-grabbing">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div data-drag-handle className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">{stationName}</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close drawer"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content - scrollable */}
        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3"
        >
          {children}
        </div>
      </div>
    </>
  );
}
