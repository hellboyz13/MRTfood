'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { FoodListingWithSources, ListingSourceWithDetails } from '@/types/database';
import { formatDistance, getWalkingTime, getMapsUrl } from '@/lib/distance';

// Email client picker modal
function EmailClientPicker({
  subject,
  body,
  onClose
}: {
  subject: string;
  body: string;
  onClose: () => void;
}) {
  const modalRef = useRef<HTMLDivElement>(null);
  const email = 'feedback@mrtfoodie.sg';
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const openEmail = (client: 'outlook' | 'gmail' | 'default') => {
    let url: string;
    switch (client) {
      case 'outlook':
        url = `https://outlook.live.com/mail/0/deeplink/compose?to=${email}&subject=${encodedSubject}&body=${encodedBody}`;
        break;
      case 'gmail':
        url = `https://mail.google.com/mail/?view=cm&to=${email}&su=${encodedSubject}&body=${encodedBody}`;
        break;
      default:
        url = `mailto:${email}?subject=${encodedSubject}&body=${encodedBody}`;
    }
    window.open(url, client === 'default' ? '_self' : '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div
        ref={modalRef}
        className="bg-white rounded-xl shadow-xl max-w-[280px] w-full overflow-hidden animate-fade-in"
      >
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm">Open with email client</h3>
          <p className="text-xs text-gray-500 mt-0.5">Choose how to send your report</p>
        </div>
        <div className="p-2 space-y-1">
          <button
            onClick={() => openEmail('gmail')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <div className="w-8 h-8 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700">Gmail</span>
          </button>
          <button
            onClick={() => openEmail('outlook')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <div className="w-8 h-8 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#0078D4" d="M24 7.387v10.478c0 .23-.08.424-.238.576-.159.152-.355.228-.588.228h-8.348v-6.18l1.066.672c.107.074.24.11.399.11.16 0 .293-.036.399-.11l6.915-4.555c.08-.052.156-.126.227-.223.071-.097.107-.215.107-.352v-.001c0-.177-.076-.332-.227-.463-.152-.131-.336-.196-.55-.196h-.001L12.826 12.66l-.91-.582V6.314h.001c0-.242-.011-.456-.032-.644-.022-.188-.062-.364-.119-.528a2.17 2.17 0 0 0-.21-.451 1.623 1.623 0 0 0-.306-.389 1.92 1.92 0 0 0-.418-.302c-.157-.087-.322-.158-.493-.211-.172-.054-.35-.092-.534-.115-.184-.022-.381-.033-.589-.033H.826C.593 3.64.397 3.716.238 3.868.08 4.02 0 4.212 0 4.442v14.115c0 .232.08.426.238.58.159.153.355.23.588.23h8.348v-7.76L.826 6.574C.563 6.418.338 6.375.151 6.447c-.187.071-.337.206-.45.405-.054.1-.08.226-.08.378l.002.157 8.203 5.222v7.76H.826c-.233 0-.429.076-.588.228-.159.152-.238.344-.238.576V22.4c0 .232.08.426.238.58.159.153.355.23.588.23h22.348c.233 0 .429-.077.588-.23.158-.154.238-.348.238-.58V7.387z"/>
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700">Outlook</span>
          </button>
          <button
            onClick={() => openEmail('default')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <div className="w-8 h-8 flex items-center justify-center text-gray-500">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700">Default Email App</span>
          </button>
        </div>
        <div className="p-2 pt-0">
          <button
            onClick={onClose}
            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showEmailPicker, setShowEmailPicker] = useState(false);

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
              {!imageLoaded && (
                <div className="absolute inset-0 bg-gray-200 animate-pulse" />
              )}
              <img
                src={displayImage}
                alt={listing.name}
                loading="lazy"
                decoding="async"
                className={`w-full h-full object-cover transition-opacity duration-200 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setImageLoaded(true)}
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

      {/* Share & Report Buttons */}
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => {
            const shareUrl = `${window.location.origin}?listing=${listing.id}`;
            const shareText = `Check out ${listing.name} on MRT Foodie!`;
            if (navigator.share) {
              navigator.share({ title: listing.name, text: shareText, url: shareUrl });
            } else {
              navigator.clipboard.writeText(shareUrl);
              alert('Link copied to clipboard!');
            }
          }}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-gray-100 text-gray-600 rounded-md text-xs font-medium hover:bg-gray-200 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
          </svg>
          <span>Share</span>
        </button>
        <button
          onClick={() => setShowEmailPicker(true)}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-gray-100 text-gray-600 rounded-md text-xs font-medium hover:bg-gray-200 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3h18l-2 13H5L3 3z" />
            <path d="M3 3l1 10M21 3l-1 10" />
            <circle cx="12" cy="21" r="1" />
            <path d="M12 17v-4" />
          </svg>
          <span>Report Issue</span>
        </button>
      </div>

      {/* Email Client Picker Modal */}
      {showEmailPicker && (
        <EmailClientPicker
          subject={`Issue Report: ${listing.name}`}
          body={`Hi MRT Foodie team,\n\nI found an issue with the listing "${listing.name}":\n\n[Please describe the issue here]\n\n- Wrong address\n- Closed permanently\n- Wrong price\n- Other: ___\n\nThanks!`}
          onClose={() => setShowEmailPicker(false)}
        />
      )}
    </div>
  );
}
