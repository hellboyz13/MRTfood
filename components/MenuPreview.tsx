'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { FoodListingWithSources } from '@/types/database';
import ImageLightbox from './ImageLightbox';

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

// Helper to format time from HHMM string to readable format
function formatTime(timeStr: string): string {
  const hour = Math.floor(parseInt(timeStr) / 100);
  const min = parseInt(timeStr) % 100;
  const period = hour >= 12 ? 'pm' : 'am';
  const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return min > 0 ? `${hour12}:${min.toString().padStart(2, '0')}${period}` : `${hour12}${period}`;
}

// Helper to format weekday hours for display (compact version)
function formatWeeklyHours(openingHours: OpeningHours | null): { day: string; hours: string; isToday: boolean }[] | null {
  if (!openingHours?.weekday_text || openingHours.weekday_text.length === 0) {
    return null;
  }

  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday

  // Single letter day abbreviations matching weekday_text order (Mon-Sun)
  const dayAbbrevs = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return openingHours.weekday_text.map((text, index) => {
    // Extract hours part (after "Day: ")
    const match = text.match(/:\s*(.+)$/);
    let hours = match ? match[1].trim() : text;

    // Shorten common phrases
    hours = hours
      .replace('Closed', '✕')
      .replace('Open 24 hours', '24h')
      .replace(/\s*[–-]\s*/g, '-') // Normalize dashes
      .replace(/(\d{1,2}):00/g, '$1') // Remove :00
      .replace(/\s*(AM|PM)/gi, (_, p) => p.toLowerCase()); // Lowercase am/pm

    // Map index to actual day (weekday_text is Mon=0 to Sun=6)
    // currentDay is Sun=0 to Sat=6
    const dayNumber = index === 6 ? 0 : index + 1;

    return {
      day: dayAbbrevs[index],
      hours: hours,
      isToday: dayNumber === currentDay
    };
  });
}

export default function MenuPreview({ listing, onBack }: MenuPreviewProps) {
  const [photos, setPhotos] = useState<MenuImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Get opening hours, phone, website directly from listing
  const openingHours = listing.opening_hours as OpeningHours | null;
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

  // Get weekly hours
  const weeklyHours = openingHours ? formatWeeklyHours(openingHours) : null;

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

      {/* 3. Opening hours - full week */}
      {weeklyHours && (
        <div className="detail-hours-section">
          <div className="detail-hours-header">
            <span className="detail-hours-icon">🕐</span>
            <span className="detail-hours-title">Opening Hours</span>
          </div>
          <div className="detail-hours-grid">
            {weeklyHours.map(({ day, hours, isToday }) => (
              <div key={day} className={`detail-hours-row ${isToday ? 'detail-hours-today' : ''}`}>
                <span className="detail-hours-day">{day}</span>
                <span className="detail-hours-time">{hours}</span>
              </div>
            ))}
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
