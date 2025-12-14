'use client';

import { FoodListing } from '@/types';

interface FoodListingCardProps {
  listing: FoodListing;
}

export default function FoodListingCard({ listing }: FoodListingCardProps) {
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

        </div>
      </div>

      {/* Tags */}
      {listing.tags.length > 0 && (
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
      <p className="text-[10px] text-gray-400 mt-2 truncate">{listing.address}</p>
    </div>
  );
}
