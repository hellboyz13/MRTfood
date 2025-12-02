'use client';

import { useState } from 'react';
import { StationFoodBySource } from '@/types';
import FoodListingCard from './FoodListingCard';

interface SourceSectionProps {
  data: StationFoodBySource;
  defaultExpanded?: boolean;
}

export default function SourceSection({ data, defaultExpanded = true }: SourceSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const { source, listings } = data;

  return (
    <div className="rounded-lg overflow-hidden" style={{ backgroundColor: source.bgColor }}>
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
            <FoodListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </div>

    </div>
  );
}
