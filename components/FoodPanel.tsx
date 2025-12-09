'use client';

import { useState, useCallback } from 'react';
import { SponsoredListing as MockSponsoredListing } from '@/types';
import { SponsoredListing as DbSponsoredListing, FoodListingWithSources } from '@/types/database';
import { stationNames, getSponsoredListing as getMockSponsored } from '@/data/mock-data';
import { getStationFood } from '@/data/stations';
import { useStationFood } from '@/hooks/useStationFood';
import SourceSection from './SourceSection';
import FoodListingCardV2 from './FoodListingCardV2';
import SlotMachine from './SlotMachine';
import { IconClose } from './Icons';

interface FoodPanelProps {
  stationId: string | null;
  onClose: () => void;
  isMobile?: boolean;
}

// Sponsored listing card component for mock data
function SponsoredCard({ listing }: { listing: MockSponsoredListing }) {
  return (
    <div className="bg-amber-50/60 border border-amber-100 rounded-lg overflow-hidden">
      {/* Advertisement label */}
      <div className="px-3 py-1.5">
        <span className="text-xs font-medium text-amber-700">Advertisement</span>
      </div>

      {/* Content */}
      <div className="px-3 pb-3">
        <div className="flex gap-3">
          {/* Image */}
          <div className="w-16 h-16 bg-gray-200 rounded-md flex-shrink-0 flex items-center justify-center">
            <span className="text-2xl">🍽️</span>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm">{listing.restaurant.name}</h3>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-amber-500 text-xs">★</span>
              <span className="text-xs text-gray-600">{listing.restaurant.rating}</span>
            </div>
            <p className="text-xs text-amber-700 font-medium mt-1">
              {listing.restaurant.promotion}
            </p>
          </div>
        </div>

        {/* CTA Button */}
        <a
          href={listing.restaurant.link}
          className="mt-3 block w-full text-center py-2 px-3 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-medium rounded-md transition-colors"
        >
          View Offer
        </a>
      </div>
    </div>
  );
}

// Sponsored listing card for Supabase data
function SponsoredCardDb({ listing }: { listing: DbSponsoredListing }) {
  return (
    <div className="bg-amber-50/60 border border-amber-100 rounded-lg overflow-hidden">
      {/* Advertisement label */}
      <div className="px-3 py-1.5">
        <span className="text-xs font-medium text-amber-700">Advertisement</span>
      </div>

      {/* Content */}
      <div className="px-3 pb-3">
        <div className="flex gap-3">
          {/* Image */}
          <div className="w-16 h-16 bg-gray-200 rounded-md flex-shrink-0 flex items-center justify-center">
            <span className="text-2xl">🍽️</span>
          </div>

          {/* Details */}
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

        {/* CTA Button */}
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

// Empty state component
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

// Loading state component
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

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
};

export default function FoodPanel({ stationId, onClose, isMobile = false }: FoodPanelProps) {
  // Use Supabase data if configured (multi-source support)
  const { data: supabaseData, separatedListings, loading, error } = useStationFood(
    isSupabaseConfigured() ? stationId : null
  );

  // Track slot machine winner for highlighting
  const [slotWinner, setSlotWinner] = useState<FoodListingWithSources | null>(null);

  // Handle slot machine winner selection
  const handleSlotWinner = useCallback((listing: FoodListingWithSources) => {
    setSlotWinner(listing);
  }, []);

  if (!stationId) return null;

  // Determine data source
  const useSupabase = isSupabaseConfigured() && !error;

  // Get station name
  const stationName = useSupabase && supabaseData?.station
    ? supabaseData.station.name
    : stationNames[stationId] || stationId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  // Get mock data as fallback
  const mockSponsored = getMockSponsored(stationId);
  const mockStationFood = getStationFood(stationId);

  // Get all listings for slot machine
  const getAllListings = (): FoodListingWithSources[] => {
    if (useSupabase && supabaseData) {
      return supabaseData.listings;
    }
    return [];
  };

  // Render content based on data source
  const renderContent = () => {
    if (useSupabase) {
      if (loading) {
        return <LoadingState />;
      }

      if (supabaseData) {
        const allListings = getAllListings();
        const { recommended, foodKingOnly } = separatedListings;
        const hasContent = supabaseData.sponsored || recommended.length > 0 || foodKingOnly.length > 0;

        return (
          <>
            {/* Slot Machine - show when there are listings */}
            {allListings.length > 1 && (
              <SlotMachine
                listings={allListings}
                onSelectWinner={handleSlotWinner}
              />
            )}
            {supabaseData.sponsored && <SponsoredCardDb listing={supabaseData.sponsored} />}

            {/* Michelin section (Michelin, ieatishootipost, editors-choice) */}
            {recommended.length > 0 && (
              <div className="space-y-2">
                <h2 className="flex items-center gap-2 text-base font-semibold text-gray-800">
                  <span>📕</span>
                  <span>Michelin</span>
                  <span className="text-xs font-normal text-gray-500">({recommended.length})</span>
                </h2>
                <div className="space-y-2">
                  {recommended.map((listing) => (
                    <FoodListingCardV2 key={listing.id} listing={listing} />
                  ))}
                </div>
              </div>
            )}

            {/* Food King only section */}
            {foodKingOnly.length > 0 && (
              <div className="space-y-2">
                <h2 className="flex items-center gap-2 text-base font-semibold text-gray-800">
                  <span>🍉</span>
                  <span>As Seen on Food King</span>
                  <span className="text-xs font-normal text-gray-500">({foodKingOnly.length})</span>
                </h2>
                <div className="space-y-2">
                  {foodKingOnly.map((listing) => (
                    <FoodListingCardV2 key={listing.id} listing={listing} />
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {!hasContent && <EmptyState />}
          </>
        );
      }
    }

    // Fallback to mock data
    return (
      <>
        {mockSponsored && <SponsoredCard listing={mockSponsored} />}
        {mockStationFood && mockStationFood.foodBySource.length > 0 ? (
          mockStationFood.foodBySource.map((sourceData, index) => (
            <SourceSection
              key={sourceData.source.id}
              data={sourceData}
              defaultExpanded={index === 0}
            />
          ))
        ) : (
          !mockSponsored && <EmptyState />
        )}
      </>
    );
  };

  // Desktop panel
  if (!isMobile) {
    return (
      <div className="w-[350px] h-full bg-white border-l border-gray-200 shadow-lg flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">{stationName}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded-full transition-colors"
            aria-label="Close panel"
          >
            <IconClose className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Food list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {renderContent()}
        </div>
      </div>
    );
  }

  // Mobile drawer
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[70vh] flex flex-col animate-slide-up">
      {/* Drag handle */}
      <div className="flex justify-center py-2">
        <div className="w-10 h-1 bg-gray-300 rounded-full" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900">{stationName}</h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Close drawer"
        >
          <IconClose className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Food list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {renderContent()}
      </div>
    </div>
  );
}
