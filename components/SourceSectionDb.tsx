'use client';

import { useState } from 'react';
import { FoodSource, FoodListingWithSource } from '@/types/database';

interface SourceSectionDbProps {
  source: FoodSource;
  listings: FoodListingWithSource[];
  defaultExpanded?: boolean;
}

function FoodListingCardDb({ listing }: { listing: FoodListingWithSource }) {
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

      {/* Address */}
      {listing.address && (
        <p className="text-[10px] text-gray-400 mt-2 truncate">{listing.address}</p>
      )}
    </div>
  );
}

export default function SourceSectionDb({ source, listings, defaultExpanded = true }: SourceSectionDbProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="rounded-lg overflow-hidden" style={{ backgroundColor: source.bg_color }}>
      {/* Header - Clickable to toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2.5 flex items-center justify-between hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{source.icon}</span>
          <span className="font-semibold text-gray-800 text-sm">{source.name}</span>
          <span className="text-xs text-gray-500">({listings.length})</span>
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

      {/* Listings - Collapsible */}
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
