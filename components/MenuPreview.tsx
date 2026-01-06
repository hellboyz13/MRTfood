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
  openNow?: boolean;
  periods?: Array<{
    open: { day: number; time?: string; hour?: number; minute?: number };
    close?: { day: number; time?: string; hour?: number; minute?: number };
  }>;
  weekday_text?: string[];
  weekdayDescriptions?: string[];
  formatted?: string[];
}

// Day names for display
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Parse time from various formats to minutes since midnight
function parseTimeToMinutes(time: { time?: string; hour?: number; minute?: number }): number {
  if (time.hour !== undefined) {
    return time.hour * 60 + (time.minute || 0);
  }
  if (time.time) {
    const h = parseInt(time.time.substring(0, 2));
    const m = parseInt(time.time.substring(2, 4));
    return h * 60 + m;
  }
  return 0;
}

// Format minutes to readable time
function formatMinutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${h12} ${period}` : `${h12}:${m.toString().padStart(2, '0')} ${period}`;
}

// Get current open status and next transition time
function getOpenStatus(openingHours: OpeningHours | null): {
  isOpen: boolean;
  nextTime: string | null;
  todayHours: string | null;
} {
  if (!openingHours) return { isOpen: false, nextTime: null, todayHours: null };

  // Check for explicit open_now/openNow flag
  const isOpenNow = openingHours.open_now ?? openingHours.openNow;

  const now = new Date();
  const currentDay = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (!openingHours.periods || openingHours.periods.length === 0) {
    return { isOpen: isOpenNow ?? false, nextTime: null, todayHours: null };
  }

  // Find today's periods
  const todayPeriods = openingHours.periods.filter(p => p.open.day === currentDay);

  // Build today's hours string
  let todayHours: string | null = null;
  if (todayPeriods.length > 0) {
    const hourParts = todayPeriods.map(p => {
      const openTime = formatMinutesToTime(parseTimeToMinutes(p.open));
      const closeTime = p.close ? formatMinutesToTime(parseTimeToMinutes(p.close)) : '';
      return closeTime ? `${openTime} – ${closeTime}` : `Opens ${openTime}`;
    });
    todayHours = hourParts.join(', ');
  }

  // Check if currently open
  let isOpen = false;
  let nextCloseTime: number | null = null;
  let nextOpenTime: number | null = null;

  for (const period of todayPeriods) {
    const openMinutes = parseTimeToMinutes(period.open);
    const closeMinutes = period.close ? parseTimeToMinutes(period.close) : 24 * 60;

    // Handle overnight hours (close time is next day)
    const adjustedClose = closeMinutes <= openMinutes ? closeMinutes + 24 * 60 : closeMinutes;

    if (currentMinutes >= openMinutes && currentMinutes < adjustedClose) {
      isOpen = true;
      nextCloseTime = closeMinutes <= openMinutes ? closeMinutes : closeMinutes;
      break;
    }

    if (currentMinutes < openMinutes && (nextOpenTime === null || openMinutes < nextOpenTime)) {
      nextOpenTime = openMinutes;
    }
  }

  // Use explicit flag if periods don't give clear answer
  if (isOpenNow !== undefined && !isOpen && todayPeriods.length > 0) {
    isOpen = isOpenNow;
  }

  let nextTime: string | null = null;
  if (isOpen && nextCloseTime !== null) {
    nextTime = `Closes ${formatMinutesToTime(nextCloseTime)}`;
  } else if (!isOpen && nextOpenTime !== null) {
    nextTime = `Opens ${formatMinutesToTime(nextOpenTime)}`;
  }

  return { isOpen, nextTime, todayHours };
}

// Get hours table data for expanded view
function getHoursTableData(openingHours: OpeningHours | null): Array<{ day: string; hours: string; isToday: boolean }> {
  if (!openingHours) return [];

  const currentDay = new Date().getDay();

  // Try weekdayDescriptions first, then weekday_text
  const descriptions = openingHours.weekdayDescriptions || openingHours.weekday_text;

  if (descriptions && descriptions.length === 7) {
    return descriptions.map((desc, idx) => {
      // Index 0 = Monday in weekday_text, need to map to day numbers
      const dayIdx = idx === 6 ? 0 : idx + 1; // Convert Mon(0)->1, Sun(6)->0
      const dayName = DAY_NAMES[dayIdx];

      // Extract hours part (after "Day: ")
      const match = desc.match(/:\s*(.+)$/);
      const hours = match ? match[1].trim() : desc;

      return {
        day: dayName,
        hours: formatHoursCompact(hours),
        isToday: dayIdx === currentDay
      };
    });
  }

  // Build from periods if no descriptions
  if (openingHours.periods && openingHours.periods.length > 0) {
    const dayHours: Map<number, string[]> = new Map();

    for (let d = 0; d < 7; d++) {
      const periods = openingHours.periods.filter(p => p.open.day === d);
      if (periods.length > 0) {
        const hourParts = periods.map(p => {
          const openTime = formatMinutesToTime(parseTimeToMinutes(p.open));
          const closeTime = p.close ? formatMinutesToTime(parseTimeToMinutes(p.close)) : '';
          return closeTime ? `${openTime} – ${closeTime}` : `Opens ${openTime}`;
        });
        dayHours.set(d, hourParts);
      }
    }

    // Return in Mon-Sun order
    const result: Array<{ day: string; hours: string; isToday: boolean }> = [];
    const dayOrder = [1, 2, 3, 4, 5, 6, 0]; // Mon to Sun

    for (const d of dayOrder) {
      const hours = dayHours.get(d);
      result.push({
        day: DAY_NAMES[d],
        hours: hours ? hours.join(', ') : 'Closed',
        isToday: d === currentDay
      });
    }

    return result;
  }

  return [];
}

// Format hours more compactly
function formatHoursCompact(hours: string): string {
  return hours
    .replace(/(\d{1,2}):00/g, '$1')
    .replace(/\s*(AM|PM)/gi, (_, p) => ` ${p.toUpperCase()}`)
    .replace(/\s*–\s*/g, ' – ')
    .trim();
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

// Collapsible Opening Hours Component
function OpeningHoursSection({ openingHours }: { openingHours: OpeningHours | string | null }) {
  const [expanded, setExpanded] = useState(false);

  // Handle plain text string - just show it directly
  if (typeof openingHours === 'string') {
    return (
      <div className="detail-info-row detail-info-static">
        <div className="detail-info-icon">
          <span>🕐</span>
        </div>
        <div className="detail-info-content">
          <p className="detail-info-text">{openingHours}</p>
        </div>
      </div>
    );
  }

  if (!openingHours) return null;

  const { isOpen, nextTime } = getOpenStatus(openingHours);
  const tableData = getHoursTableData(openingHours);

  // If no table data, don't show anything
  if (tableData.length === 0) return null;

  return (
    <div
      className={`detail-info-row detail-hours-compact ${expanded ? 'expanded' : ''}`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="detail-info-icon">
        <span>🕐</span>
      </div>
      <div className="detail-info-content">
        {/* Collapsed: Status + next time */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`detail-hours-status ${isOpen ? 'open' : 'closed'}`}>
            <span className="status-dot" />
            {isOpen ? 'Open' : 'Closed'}
          </span>
          {nextTime && (
            <span className="detail-hours-closes">· {nextTime}</span>
          )}
        </div>

        {/* Expanded: Full table */}
        {expanded && (
          <div className="detail-hours-table">
            {tableData.map((row, idx) => (
              <div key={idx} className={`detail-hours-table-row ${row.isToday ? 'today' : ''}`}>
                <span className="detail-hours-table-day">{row.day}</span>
                <span className="detail-hours-table-time">{row.hours}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chevron */}
      <svg
        className={`detail-hours-chevron ${expanded ? 'expanded' : ''}`}
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  );
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

      {/* 3. Opening hours - collapsible with Open/Closed status */}
      <OpeningHoursSection openingHours={openingHours} />

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
