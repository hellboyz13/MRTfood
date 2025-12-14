'use client';

import { useState, useEffect } from 'react';
import { FoodListingWithSources, ListingSourceWithDetails } from '@/types/database';
import { getWalkingTime } from '@/lib/distance';

interface RestaurantGridCardProps {
  listing: FoodListingWithSources;
  onClick?: (listing: FoodListingWithSources) => void;
}

// Sources to hide from badge display
const HIDDEN_SOURCE_IDS = ['popular', 'michelin-3-star', 'michelin-2-star', 'michelin-1-star', 'dessert'];

// Get primary source for display
function getPrimarySourceBadge(sources: ListingSourceWithDetails[]): ListingSourceWithDetails | null {
  const visibleSources = sources.filter(s => !HIDDEN_SOURCE_IDS.includes(s.source.id));
  return visibleSources.find(s => s.is_primary) || visibleSources[0] || null;
}

export default function RestaurantGridCard({ listing, onClick }: RestaurantGridCardProps) {
  const [thumbnailImage, setThumbnailImage] = useState<string | null>(null);
  const primarySource = getPrimarySourceBadge(listing.sources);
  const cuisineType = listing.tags?.[0] || '';
  const walkingTime = getWalkingTime(listing.walking_time, listing.distance_to_station);

  // Fetch thumbnail from menu_images
  useEffect(() => {
    async function fetchThumbnail() {
      try {
        const response = await fetch(`/api/get-menu-images?listingId=${listing.id}`);
        const data = await response.json();
        if (data.success && data.images.length > 0) {
          const headerImg = data.images.find((img: any) => img.is_header);
          setThumbnailImage(headerImg?.image_url || data.images[0]?.image_url);
        }
      } catch {
        // Silently fail
      }
    }
    fetchThumbnail();
  }, [listing.id]);

  const imageUrl = thumbnailImage || (listing.image_url?.startsWith('http') ? listing.image_url : null);

  return (
    <div
      onClick={() => onClick?.(listing)}
      className="bg-[#F5F3F0] rounded-xl overflow-hidden cursor-pointer transition-shadow hover:shadow-md min-w-0"
    >
      {/* Thumbnail */}
      <div className="aspect-[4/3] bg-[#E8E4DF] flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={listing.name}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-3xl">🍽️</span>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Name */}
        <h3 className="font-semibold text-[15px] text-[#2D2D2D] leading-tight mb-1 line-clamp-2">
          {listing.name}
        </h3>

        {/* Cuisine */}
        {cuisineType && (
          <p className="text-[13px] text-[#757575] truncate mb-1.5">{cuisineType}</p>
        )}

        {/* Price + Rating + Walk */}
        <div className="flex items-center flex-wrap gap-x-1.5 text-[13px] text-[#757575]">
          {listing.price_range && <span className="text-[#2D2D2D]">{listing.price_range}</span>}
          {listing.rating && (
            <span className="flex items-center gap-0.5">
              <span className="text-amber-500">★</span>
              <span>{listing.rating.toFixed(1)}</span>
            </span>
          )}
          {walkingTime && <span>· 🚶{walkingTime}min</span>}
        </div>

        {/* Source */}
        {primarySource && (
          <p className="text-[11px] text-[#999] mt-1.5 truncate">
            {primarySource.source.icon} {primarySource.source.name}
          </p>
        )}
      </div>
    </div>
  );
}
