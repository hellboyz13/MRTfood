'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { FoodListingWithSources } from '@/types/database';
import ImageLightbox from './ImageLightbox';

interface MenuPreviewProps {
  listing: FoodListingWithSources;
  onBack: () => void;
}

interface MenuImage {
  id: string;
  image_url: string;
  display_order: number;
}

interface OpeningHours {
  open_now?: boolean;
  periods?: Array<{
    open: { day: number; time: string };
    close?: { day: number; time: string };
  }>;
  weekday_text?: string[];
}

// Camera icon component for placeholder photos
function CameraIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

// Photo placeholder component
function PhotoPlaceholder() {
  return (
    <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center rounded-lg">
      <CameraIcon className="w-8 h-8 text-gray-400" />
    </div>
  );
}

// Photo component with loading state - now clickable
function PhotoItem({ src, onClick }: { src?: string; onClick?: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (!src || error) {
    return <PhotoPlaceholder />;
  }

  return (
    <div
      className="w-full h-full relative cursor-pointer hover:opacity-90 transition-opacity"
      onClick={onClick}
    >
      {!loaded && <PhotoPlaceholder />}
      <img
        src={src}
        alt="Food photo"
        className={`w-full h-full object-cover rounded-lg ${loaded ? '' : 'hidden'}`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  );
}

// Helper to get today's hours (just the time range, no open/closed status)
function getTodayHours(openingHours: OpeningHours | string | null): string | null {
  if (!openingHours) {
    return null;
  }

  // Handle plain text string (e.g., "Daily 10am to 8pm")
  if (typeof openingHours === 'string') {
    return openingHours;
  }

  // Handle structured object with weekday_text
  if (!openingHours.weekday_text || openingHours.weekday_text.length === 0) {
    return null;
  }

  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday

  // Map Sunday=0 to index 6, Mon=1 to index 0, etc.
  const todayIndex = currentDay === 0 ? 6 : currentDay - 1;
  const todayText = openingHours.weekday_text[todayIndex];

  // Extract hours part (after "Day: ")
  const match = todayText.match(/:\s*(.+)$/);
  let hours = match ? match[1].trim() : todayText;

  // Shorten common phrases
  hours = hours
    .replace('Open 24 hours', '24h')
    .replace(/\s*[–-]\s*/g, ' - ')
    .replace(/(\d{1,2}):00/g, '$1')
    .replace(/\s*(AM|PM)/gi, (_, p) => p.toLowerCase());

  return hours;
}

export default function MenuPreview({ listing, onBack }: MenuPreviewProps) {
  const [photos, setPhotos] = useState<MenuImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Get opening hours, phone, website directly from listing (can be JSON object or plain string)
  const openingHours = listing.opening_hours as OpeningHours | string | null;
  const phone = (listing as { phone?: string | null }).phone;
  const website = (listing as { website?: string | null }).website;

  // Fetch photos from menu_images table
  useEffect(() => {
    async function fetchPhotos() {
      const { data, error } = await supabase
        .from('menu_images')
        .select('id, image_url, display_order')
        .eq('listing_id', listing.id)
        .order('display_order', { ascending: true })
        .limit(5);

      if (!error && data) {
        setPhotos(data);
      }
      setLoading(false);
    }

    fetchPhotos();
  }, [listing.id]);

  // Generate Google Maps directions URL
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${listing.name} ${listing.address || ''} Singapore`)}`;

  // Generate Google Maps search URL for photos/menu
  const mapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${listing.name} ${listing.address || ''} Singapore`)}`;

  // Get photo URL by index (0-4)
  const getPhoto = (index: number) => photos[index]?.image_url;

  // Get today's hours (just time range)
  const todayHours = getTodayHours(openingHours);

  return (
    <div className="restaurant-detail-page">
      {/* 1. Back button (top left) */}
      <button
        onClick={onBack}
        className="detail-back-btn"
        aria-label="Go back"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        <span>Back</span>
      </button>

      {/* Restaurant name */}
      <h1 className="detail-restaurant-name">{listing.name}</h1>

      {/* 2. Address section - tappable for directions */}
      <a
        href={directionsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="detail-info-row"
      >
        <div className="detail-info-icon">
          <span>📍</span>
        </div>
        <div className="detail-info-content">
          <p className="detail-info-text">
            {listing.address || 'Address not available'}
          </p>
          <p className="detail-info-hint">Tap for directions</p>
        </div>
        <div className="detail-info-arrow">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>
      </a>

      {/* 3. Opening hours - just today's time range */}
      {todayHours && (
        <div className="detail-info-row detail-hours-compact">
          <div className="detail-info-icon">
            <span>🕐</span>
          </div>
          <div className="detail-info-content">
            <p className="detail-info-text">{todayHours}</p>
          </div>
        </div>
      )}

      {/* 4. Phone number - tappable to call */}
      {phone && (
        <a
          href={`tel:${phone}`}
          className="detail-info-row"
        >
          <div className="detail-info-icon">
            <span>📞</span>
          </div>
          <div className="detail-info-content">
            <p className="detail-info-text">{phone}</p>
            <p className="detail-info-hint">Tap to call</p>
          </div>
          <div className="detail-info-arrow">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        </a>
      )}

      {/* 5. Website - tappable to open */}
      {website && (
        <a
          href={website}
          target="_blank"
          rel="noopener noreferrer"
          className="detail-info-row"
        >
          <div className="detail-info-icon">
            <span>🌐</span>
          </div>
          <div className="detail-info-content">
            <p className="detail-info-text detail-info-truncate">
              {website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
            </p>
            <p className="detail-info-hint">Tap to visit website</p>
          </div>
          <div className="detail-info-arrow">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        </a>
      )}

      {/* 6. View more photos on Google Maps link */}
      <a
        href={mapsSearchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="detail-maps-link"
      >
        View more photos on Google Maps
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </a>

      {/* Photo grid - 3 on top, 2 on bottom */}
      <div className="detail-photo-grid">
        <div className="detail-photo-row-3">
          <div className="detail-photo-item">
            <PhotoItem src={getPhoto(0)} onClick={() => getPhoto(0) && setLightboxIndex(0)} />
          </div>
          <div className="detail-photo-item">
            <PhotoItem src={getPhoto(1)} onClick={() => getPhoto(1) && setLightboxIndex(1)} />
          </div>
          <div className="detail-photo-item">
            <PhotoItem src={getPhoto(2)} onClick={() => getPhoto(2) && setLightboxIndex(2)} />
          </div>
        </div>
        <div className="detail-photo-row-2">
          <div className="detail-photo-item">
            <PhotoItem src={getPhoto(3)} onClick={() => getPhoto(3) && setLightboxIndex(3)} />
          </div>
          <div className="detail-photo-item">
            <PhotoItem src={getPhoto(4)} onClick={() => getPhoto(4) && setLightboxIndex(4)} />
          </div>
        </div>
      </div>

      {/* Photo hint - only show if no photos */}
      {!loading && photos.length === 0 && (
        <p className="detail-photo-hint">Photos coming soon!</p>
      )}

      {/* Image Lightbox with carousel */}
      {lightboxIndex !== null && photos.length > 0 && (
        <ImageLightbox
          images={photos.map(p => p.image_url)}
          initialIndex={lightboxIndex}
          alt={`${listing.name} photo`}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}
