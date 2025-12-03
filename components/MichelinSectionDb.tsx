'use client';

import { useState } from 'react';
import { FoodSource, FoodListingWithSource } from '@/types/database';
import { formatDistance, getWalkingTime, getMapsUrl } from '@/lib/distance';

interface MichelinSectionDbProps {
  sourceGroups: {
    source: FoodSource;
    listings: FoodListingWithSource[];
  }[];
  defaultExpanded?: boolean;
}

// Michelin sub-category IDs
const MICHELIN_SOURCE_IDS = ['michelin-3-star', 'michelin-2-star', 'michelin-1-star', 'michelin-hawker'];

// Helper to check if a source is a Michelin source
export function isMichelinSource(sourceId: string): boolean {
  return MICHELIN_SOURCE_IDS.includes(sourceId);
}

function FoodListingCardDb({ listing }: { listing: FoodListingWithSource }) {
  const distance = listing.distance_to_station;
  const walkingTime = getWalkingTime(listing.walking_time, distance);
  const formattedDistance = formatDistance(distance);

  return (
    <div className="bg-white rounded-lg p-3 border border-gray-100">
      <div className="flex gap-3">
        {/* Image placeholder */}
        <div className="w-16 h-16 bg-gray-100 rounded-md flex-shrink-0 flex items-center justify-center overflow-hidden">
          <span className="text-2xl">🍽️</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm truncate">{listing.name}</h3>

          {/* Rating if available */}
          {listing.rating && (
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-amber-500 text-xs">★</span>
              <span className="text-xs text-gray-600">{listing.rating}</span>
            </div>
          )}

          {/* Description */}
          {listing.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{listing.description}</p>
          )}
        </div>
      </div>

      {/* Tags */}
      {listing.tags && listing.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {listing.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Walking Distance & Address Row */}
      <div className="mt-2 space-y-1">
        {/* Walking distance */}
        {distance !== null && walkingTime !== null && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span>🚶</span>
            <span>{formattedDistance} · {walkingTime} min</span>
          </div>
        )}

        {/* Address with maps link */}
        {listing.address && (
          <a
            href={getMapsUrl(listing.address)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-800 hover:underline transition-colors"
          >
            <span>📍</span>
            <span className="truncate">{listing.address}</span>
            <svg
              className="w-2.5 h-2.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}

function SubCategorySection({
  source,
  listings,
  defaultExpanded = true
}: {
  source: FoodSource;
  listings: FoodListingWithSource[];
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="rounded-lg overflow-hidden" style={{ backgroundColor: source.bg_color }}>
      {/* Sub-category Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{source.icon}</span>
          <span className="font-medium text-gray-700 text-sm">{source.name}</span>
          <span className="text-xs text-gray-500">({listings.length})</span>
        </div>
        <svg
          className={`w-3.5 h-3.5 text-gray-600 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Listings */}
      <div
        className={`transition-all duration-200 ease-in-out overflow-hidden ${
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-3 pb-3 space-y-2">
          {listings.map(listing => (
            <FoodListingCardDb key={listing.id} listing={listing} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MichelinSectionDb({ sourceGroups, defaultExpanded = true }: MichelinSectionDbProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Calculate total count across all Michelin sub-categories
  const totalCount = sourceGroups.reduce((sum, group) => sum + group.listings.length, 0);

  return (
    <div className="rounded-lg overflow-hidden bg-red-50 border border-red-100">
      {/* Main Michelin Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-red-100/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🏅</span>
          <span className="font-semibold text-gray-800 text-sm">Michelin</span>
          <span className="text-xs text-gray-500">({totalCount})</span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Sub-categories Container */}
      <div
        className={`transition-all duration-200 ease-in-out overflow-hidden ${
          isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-2 pb-2 space-y-2">
          {sourceGroups.map((group, index) => (
            <SubCategorySection
              key={group.source.id}
              source={group.source}
              listings={group.listings}
              defaultExpanded={index === 0}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
