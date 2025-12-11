'use client';

import { useState, useEffect } from 'react';
import { FoodListingWithSources, ListingSourceWithDetails } from '@/types/database';
import { formatDistance, getWalkingTime, getMapsUrl } from '@/lib/distance';

interface FoodListingCardV2Props {
  listing: FoodListingWithSources;
  highlighted?: boolean;
  onViewMenu?: (listing: FoodListingWithSources) => void;
}

// Helper to get Michelin distinction from source (only hawker and bib gourmand)
function getMichelinDistinction(sourceId: string): string | null {
  switch (sourceId) {
    case 'michelin-hawker':
      return 'Hawker';
    case 'michelin-bib-gourmand':
      return 'Bib Gourmand';
    default:
      return null;
  }
}

// Sources to hide from badge display (not recommendations, just categories/tags)
const HIDDEN_SOURCE_IDS = ['popular', 'michelin-3-star', 'michelin-2-star', 'michelin-1-star', 'dessert'];

// Source badge component
function SourceBadge({
  sourceDetail,
  isPrimary
}: {
  sourceDetail: ListingSourceWithDetails;
  isPrimary: boolean;
}) {
  const { source, source_url } = sourceDetail;
  const distinction = getMichelinDistinction(source.id);

  const content = (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        isPrimary ? 'text-sm' : ''
      }`}
      style={{ backgroundColor: source.bg_color || '#f3f4f6' }}
    >
      <span>{source.icon}</span>
      <span>{distinction ? `Michelin ${distinction}` : source.name}</span>
    </span>
  );

  if (source_url) {
    return (
      <a
        href={source_url}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:opacity-80 transition-opacity"
      >
        {content}
      </a>
    );
  }

  return content;
}

export default function FoodListingCardV2({ listing, highlighted = false, onViewMenu }: FoodListingCardV2Props) {
  const [thumbnailImage, setThumbnailImage] = useState<string | null>(null);

  const distance = listing.distance_to_station;
  const walkingTime = getWalkingTime(listing.walking_time, distance);
  const formattedDistance = formatDistance(distance);

  // Get primary and secondary sources, filtering out hidden sources (Popular, Michelin 1-3 stars)
  const primarySources = listing.sources.filter(s => s.is_primary && !HIDDEN_SOURCE_IDS.includes(s.source.id));
  const secondarySources = listing.sources.filter(s => !s.is_primary && !HIDDEN_SOURCE_IDS.includes(s.source.id));

  // Fetch header/thumbnail image from menu_images
  useEffect(() => {
    async function fetchThumbnail() {
      try {
        const response = await fetch(`/api/get-menu-images?listingId=${listing.id}`);
        const data = await response.json();

        if (data.success && data.images.length > 0) {
          // Get the header image (first image with is_header=true)
          const headerImg = data.images.find((img: any) => img.is_header);
          setThumbnailImage(headerImg?.image_url || data.images[0]?.image_url);
        }
      } catch (error) {
        // Silently fail - will show fallback image
      }
    }

    fetchThumbnail();
  }, [listing.id]);

  return (
    <div className={`rounded-lg p-3 shadow-sm ${
      highlighted
        ? 'bg-green-50 border-2 border-green-400 ring-2 ring-green-200'
        : 'bg-white border border-gray-100'
    }`}>
      <div className="flex gap-3">
        {/* Image thumbnail */}
        <div className="w-16 h-16 bg-gray-100 rounded-md flex-shrink-0 flex items-center justify-center overflow-hidden">
          {thumbnailImage || (listing.image_url && listing.image_url.startsWith('http')) ? (
            <img
              src={thumbnailImage || listing.image_url || ''}
              alt={listing.name}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-2xl">🍽️</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Name */}
          <h3 className="font-semibold text-gray-900 text-sm leading-tight">
            {listing.name}
          </h3>

          {/* Primary source badges */}
          {primarySources.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {primarySources.map((s) => (
                <SourceBadge
                  key={s.source.id}
                  sourceDetail={s}
                  isPrimary={true}
                />
              ))}
            </div>
          )}

          {/* Secondary sources - "Also on" */}
          {secondarySources.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 mt-1">
              <span className="text-xs text-gray-500">Also on:</span>
              {secondarySources.map((s) => (
                <SourceBadge
                  key={s.source.id}
                  sourceDetail={s}
                  isPrimary={false}
                />
              ))}
            </div>
          )}

          {/* Price and Walking info */}
          <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500">
            {listing.price_range && (
              <span className="text-green-600 font-medium">{listing.price_range}</span>
            )}
            {listing.price_range && (formattedDistance || walkingTime) && <span>·</span>}
            {(formattedDistance || walkingTime) && (
              <span className="flex items-center gap-1">
                <span>🚶</span>
                {formattedDistance && <span>{formattedDistance}</span>}
                {formattedDistance && walkingTime && <span>·</span>}
                {walkingTime && <span>{walkingTime} min</span>}
              </span>
            )}
          </div>

          {/* Address */}
          {listing.address && (
            <a
              href={getMapsUrl(listing.name, listing.address)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 mt-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
            >
              <span>📍</span>
              <span className="truncate">{listing.address}</span>
            </a>
          )}
        </div>
      </div>

      {/* Description if available */}
      {listing.description && (
        <p className="mt-2 text-xs text-gray-600 line-clamp-2">
          {listing.description}
        </p>
      )}

      {/* Tags */}
      {listing.tags && listing.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {listing.tags.slice(0, 4).map((tag) => {
            // Transform "24 hour" tag to "Supper"
            const displayTag = tag.toLowerCase() === '24 hour' ? 'Supper' : tag;
            return (
              <span
                key={tag}
                className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
              >
                {displayTag}
              </span>
            );
          })}
          {listing.tags.length > 4 && (
            <span className="px-1.5 py-0.5 text-gray-400 text-xs">
              +{listing.tags.length - 4} more
            </span>
          )}
        </div>
      )}

      {/* View Menu Button */}
      {onViewMenu && (
        <button
          onClick={() => onViewMenu(listing)}
          className="w-full mt-3 py-2 px-3 bg-primary hover:bg-primary-hover text-white text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1"
        >
          <span>📸</span>
          <span>View Menu</span>
        </button>
      )}
    </div>
  );
}
