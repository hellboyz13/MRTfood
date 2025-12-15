'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { FoodListingWithSources } from '@/types/database';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface MenuPreviewProps {
  listing: FoodListingWithSources;
  onBack: () => void;
}

interface MenuImage {
  id: string;
  image_url: string;
  display_order: number;
}

interface PlaceDetails {
  review_count: number | null;
  phone: string | null;
  website: string | null;
  opening_hours: {
    open_now?: boolean;
    periods?: Array<{
      open: { day: number; time: string };
      close?: { day: number; time: string };
    }>;
    weekday_text?: string[];
  } | null;
  rating: number | null;
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
    <div className="w-full h-full bg-gray-200 flex items-center justify-center rounded-lg">
      <CameraIcon className="w-8 h-8 text-gray-400" />
    </div>
  );
}

// Photo component with loading state
function PhotoItem({ src }: { src?: string }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (!src || error) {
    return <PhotoPlaceholder />;
  }

  return (
    <div className="w-full h-full relative">
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

// Helper to format time from HHMM string to readable format
function formatTime(timeStr: string): string {
  const hour = Math.floor(parseInt(timeStr) / 100);
  const min = parseInt(timeStr) % 100;
  const period = hour >= 12 ? 'pm' : 'am';
  const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return min > 0 ? `${hour12}:${min.toString().padStart(2, '0')}${period}` : `${hour12}${period}`;
}

// Helper to get today's opening hours
function getTodayHours(openingHours: PlaceDetails['opening_hours']): string | null {
  if (!openingHours) return null;

  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday

  // Try to get from weekday_text first (more readable)
  if (openingHours.weekday_text && openingHours.weekday_text.length > 0) {
    // weekday_text is usually in order Mon-Sun, but currentDay is 0=Sun
    // So we need to map: Sun=0 -> index 6, Mon=1 -> index 0, etc.
    const dayIndex = currentDay === 0 ? 6 : currentDay - 1;
    const todayText = openingHours.weekday_text[dayIndex];
    if (todayText) {
      // Extract just the hours part (after the colon)
      const match = todayText.match(/:\s*(.+)$/);
      if (match) {
        const hours = match[1].trim();
        // Don't show if it just says "Closed"
        if (hours.toLowerCase() === 'closed') {
          return null;
        }
        return hours;
      }
    }
  }

  // Fallback to periods
  if (openingHours.periods && openingHours.periods.length > 0) {
    const todayPeriod = openingHours.periods.find(p => p.open.day === currentDay);
    if (todayPeriod) {
      const openTime = formatTime(todayPeriod.open.time);
      const closeTime = todayPeriod.close ? formatTime(todayPeriod.close.time) : 'Late';
      return `${openTime} - ${closeTime}`;
    }
  }

  return null;
}

export default function MenuPreview({ listing, onBack }: MenuPreviewProps) {
  const [photos, setPhotos] = useState<MenuImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [placeDetails, setPlaceDetails] = useState<PlaceDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(true);

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

  // Fetch place details (opening hours, phone, website)
  useEffect(() => {
    async function fetchPlaceDetails() {
      try {
        const response = await fetch(`/api/fetch-place-details?listingId=${listing.id}`);
        const data = await response.json();

        if (data.success && data.data) {
          setPlaceDetails(data.data);
        }
      } catch (error) {
        console.error('Error fetching place details:', error);
      } finally {
        setDetailsLoading(false);
      }
    }

    fetchPlaceDetails();
  }, [listing.id]);

  // Generate Google Maps directions URL
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${listing.name} ${listing.address || ''} Singapore`)}`;

  // Generate Google Maps search URL for photos/menu
  const mapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${listing.name} ${listing.address || ''} Singapore`)}`;

  // Get photo URL by index (0-4)
  const getPhoto = (index: number) => photos[index]?.image_url;

  // Get today's opening hours
  const todayHours = placeDetails?.opening_hours ? getTodayHours(placeDetails.opening_hours) : null;

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

      {/* 3. Opening hours - today only */}
      {(todayHours || detailsLoading) && (
        <div className="detail-info-row detail-info-static">
          <div className="detail-info-icon">
            <span>🕐</span>
          </div>
          <div className="detail-info-content">
            {detailsLoading ? (
              <p className="detail-info-text text-gray-400">Loading hours...</p>
            ) : todayHours ? (
              <p className="detail-info-text">{todayHours}</p>
            ) : null}
          </div>
        </div>
      )}

      {/* 4. Phone number - tappable to call */}
      {placeDetails?.phone && (
        <a
          href={`tel:${placeDetails.phone}`}
          className="detail-info-row"
        >
          <div className="detail-info-icon">
            <span>📞</span>
          </div>
          <div className="detail-info-content">
            <p className="detail-info-text">{placeDetails.phone}</p>
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
      {placeDetails?.website && (
        <a
          href={placeDetails.website}
          target="_blank"
          rel="noopener noreferrer"
          className="detail-info-row"
        >
          <div className="detail-info-icon">
            <span>🌐</span>
          </div>
          <div className="detail-info-content">
            <p className="detail-info-text detail-info-truncate">
              {placeDetails.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
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
            <PhotoItem src={getPhoto(0)} />
          </div>
          <div className="detail-photo-item">
            <PhotoItem src={getPhoto(1)} />
          </div>
          <div className="detail-photo-item">
            <PhotoItem src={getPhoto(2)} />
          </div>
        </div>
        <div className="detail-photo-row-2">
          <div className="detail-photo-item">
            <PhotoItem src={getPhoto(3)} />
          </div>
          <div className="detail-photo-item">
            <PhotoItem src={getPhoto(4)} />
          </div>
        </div>
      </div>

      {/* Photo hint - only show if no photos */}
      {!loading && photos.length === 0 && (
        <p className="detail-photo-hint">Photos coming soon!</p>
      )}
    </div>
  );
}
