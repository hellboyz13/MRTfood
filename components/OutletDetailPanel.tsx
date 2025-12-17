'use client';

import { MallOutlet } from '@/types/database';

interface OutletDetailPanelProps {
  outlet: MallOutlet;
  mallName: string;
  onBack: () => void;
}

interface OpeningHours {
  open_now?: boolean;
  periods?: Array<{
    open: { day: number; time: string };
    close?: { day: number; time: string };
  }>;
  weekday_text?: string[];
}

// Calculate if currently open from periods data (real-time)
function calculateIsOpen(openingHours: OpeningHours | null): boolean | null {
  if (!openingHours?.periods || openingHours.periods.length === 0) {
    return null;
  }

  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday
  const currentTime = now.getHours() * 100 + now.getMinutes(); // HHMM format

  // Check if any period covers current time
  for (const period of openingHours.periods) {
    const openDay = period.open.day;
    const openTime = parseInt(period.open.time);
    const closeDay = period.close?.day ?? openDay;
    const closeTime = period.close ? parseInt(period.close.time) : 2359;

    // Handle 24h case (close time 2359 on previous day means 24h)
    if (openTime === 0 && closeTime === 2359 && closeDay !== openDay) {
      return true; // Open 24 hours
    }

    // Same day operation
    if (openDay === closeDay && currentDay === openDay) {
      if (currentTime >= openTime && currentTime < closeTime) {
        return true;
      }
    }
    // Spans midnight
    else if (closeDay !== openDay) {
      // Check if we're on the opening day after open time
      if (currentDay === openDay && currentTime >= openTime) {
        return true;
      }
      // Check if we're on the closing day before close time
      if (currentDay === closeDay && currentTime < closeTime) {
        return true;
      }
    }
    // Normal case: current day matches open day
    else if (currentDay === openDay) {
      if (currentTime >= openTime && currentTime < closeTime) {
        return true;
      }
    }
  }

  return false;
}

// Helper to format today's hours for compact display
function formatTodayHours(openingHours: OpeningHours | null): { todayHours: string; isOpen: boolean | null } | null {
  if (!openingHours?.weekday_text || openingHours.weekday_text.length === 0) {
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

  // Check if closed today (from weekday_text)
  const isClosed = hours.toLowerCase() === 'closed';

  // Shorten common phrases
  hours = hours
    .replace(/Closed/i, 'Closed')
    .replace('Open 24 hours', '24h')
    .replace(/\s*[–-]\s*/g, ' - ')
    .replace(/(\d{1,2}):00/g, '$1')
    .replace(/\s*(AM|PM)/gi, (_, p) => p.toLowerCase());

  // Calculate real-time open status from periods
  const isOpen = isClosed ? false : calculateIsOpen(openingHours);

  return {
    todayHours: hours,
    isOpen
  };
}

export default function OutletDetailPanel({ outlet, mallName, onBack }: OutletDetailPanelProps) {
  // Get opening hours directly from outlet
  const openingHours = outlet.opening_hours as OpeningHours | null;

  // Get today's hours (compact display)
  const todayInfo = openingHours ? formatTodayHours(openingHours) : null;

  // Generate Google Maps search URL for mall + outlet name
  const mapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${outlet.name} ${mallName} Singapore`)}`;

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

      {/* Outlet name */}
      <h1 className="detail-restaurant-name">{outlet.name}</h1>

      {/* Floor & Unit (if available) */}
      {outlet.level && (
        <div className="detail-info-row detail-info-static">
          <div className="detail-info-icon">
            <span>📍</span>
          </div>
          <div className="detail-info-content">
            <p className="detail-info-text">{outlet.level}</p>
            <p className="detail-info-hint">Floor & Unit</p>
          </div>
        </div>
      )}

      {/* Opening hours - compact single row */}
      {todayInfo && (
        <div className="detail-info-row detail-hours-compact">
          <div className="detail-info-icon">
            <span>🕐</span>
          </div>
          <div className="detail-info-content">
            <p className="detail-info-text">
              <span className={`detail-hours-status ${todayInfo.isOpen === true ? 'open' : todayInfo.isOpen === false ? 'closed' : ''}`}>
                {todayInfo.isOpen === true ? 'Open' : todayInfo.isOpen === false ? 'Closed' : 'Today'}
              </span>
              {todayInfo.todayHours !== 'Closed' && (
                <span className="detail-hours-time"> · {todayInfo.todayHours}</span>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
