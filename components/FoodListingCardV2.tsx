'use client';

import { useState, useEffect, useCallback } from 'react';
import { FoodListingWithSources, ListingSourceWithDetails } from '@/types/database';
import { formatDistance, getWalkingTime, getMapsUrl } from '@/lib/distance';

// Image Lightbox Modal
function ImageLightbox({
  imageUrl,
  alt,
  onClose
}: {
  imageUrl: string;
  alt: string;
  onClose: () => void;
}) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
        aria-label="Close"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      {/* Image */}
      <img
        src={imageUrl}
        alt={alt}
        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Tap to close hint */}
      <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
        Tap anywhere to close
      </p>
    </div>
  );
}

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
  const [showLightbox, setShowLightbox] = useState(false);

  const displayImage = thumbnailImage || (listing.image_url?.startsWith('http') ? listing.image_url : null);
  const handleImageClick = useCallback(() => {
    if (displayImage) setShowLightbox(true);
  }, [displayImage]);

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
        ? 'bg-[#FFF0ED] border-2 border-[#FF6B4A] ring-2 ring-[#FF6B4A]/20'
        : 'bg-white border border-[#E0DCD7]'
    }`}>
      {/* Lightbox Modal */}
      {showLightbox && displayImage && (
        <ImageLightbox
          imageUrl={displayImage}
          alt={listing.name}
          onClose={() => setShowLightbox(false)}
        />
      )}

      <div className="flex gap-3">
        {/* Image thumbnail - clickable to view full size */}
        <div
          onClick={handleImageClick}
          className={`w-16 h-16 bg-gray-100 rounded-md flex-shrink-0 flex items-center justify-center overflow-hidden relative ${
            displayImage ? 'cursor-zoom-in' : ''
          }`}
        >
          {displayImage ? (
            <>
              <img
                src={displayImage}
                alt={listing.name}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
              {/* Zoom hint overlay */}
              <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="drop-shadow">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35M11 8v6M8 11h6" />
                </svg>
              </div>
            </>
          ) : (
            <span className="text-2xl">🍽️</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Name and Rating */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 text-sm leading-tight">
              {listing.name}
            </h3>
            {listing.rating && (
              <span className="flex items-center gap-0.5 text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded flex-shrink-0">
                <span>⭐</span>
                <span>{listing.rating.toFixed(1)}</span>
                {listing.review_count && (
                  <span className="text-amber-500">({listing.review_count.toLocaleString()})</span>
                )}
              </span>
            )}
          </div>

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

        </div>
      </div>

      {/* Tags */}
      {listing.tags && listing.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {[...new Set(listing.tags)].slice(0, 4).map((tag, index) => {
            // Transform "24 hour" tag to "Supper"
            const displayTag = tag.toLowerCase() === '24 hour' ? 'Supper' : tag;
            return (
              <span
                key={`${tag}-${index}`}
                className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
              >
                {displayTag}
              </span>
            );
          })}
          {[...new Set(listing.tags)].length > 4 && (
            <span className="px-1.5 py-0.5 text-gray-400 text-xs">
              +{[...new Set(listing.tags)].length - 4} more
            </span>
          )}
        </div>
      )}

      {/* Directions & Menu Button */}
      <button
        onClick={() => onViewMenu?.(listing)}
        className="flex items-center justify-center gap-1 w-full mt-3 py-1.5 px-3 bg-[#FFF0ED] text-[#FF6B4A] border border-[#FF6B4A] rounded-md text-[13px] font-medium hover:bg-[#FF6B4A] hover:text-white transition-colors"
      >
        <span>📍</span>
        <span>Direction, Opening Hours & Menu →</span>
      </button>
    </div>
  );
}
