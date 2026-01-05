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
  formatted?: string[];
}

// Format hours for display
function formatHoursDisplay(hours: string): string {
  return hours
    .replace('Open 24 hours', '24h')
    .replace(/\s*[–-]\s*/g, ' – ')
    .replace(/(\d{1,2}):00\s*/g, '$1')
    .replace(/\s*(AM|PM)/gi, (_, p) => ' ' + p.toUpperCase())
    .replace(/\s*(am|pm)/gi, (_, p) => ' ' + p.toUpperCase())
    .trim();
}

// Split hours string into multiple lines for better readability
function splitHoursIntoLines(hours: string): string[] {
  // Split on comma followed by day name, using non-capturing group
  const parts = hours.split(/,\s*(?=(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun))/i);
  return parts.map(p => formatHoursDisplay(p.trim())).filter(Boolean);
}

// Get all hours as array of lines for display
function getHoursLines(openingHours: OpeningHours | string | null): string[] | null {
  if (!openingHours) return null;

  // Handle plain text string
  if (typeof openingHours === 'string') {
    const lines = splitHoursIntoLines(openingHours);
    return lines.length > 0 ? lines : null;
  }

  // If we have formatted hours, use them
  if (openingHours.formatted && openingHours.formatted.length > 0) {
    return openingHours.formatted;
  }

  // Handle structured object with weekday_text
  if (openingHours.weekday_text && openingHours.weekday_text.length > 0) {
    if (openingHours.weekday_text.length === 1) {
      const lines = splitHoursIntoLines(openingHours.weekday_text[0]);
      return lines.length > 0 ? lines : null;
    }
    // For full 7-day weekday_text, just return formatted version of each
    return openingHours.weekday_text.map(formatHoursDisplay);
  }

  return null;
}

export default function OutletDetailPanel({ outlet, mallName, onBack }: OutletDetailPanelProps) {
  // Get opening hours directly from outlet (can be JSON object or plain string)
  const openingHours = outlet.opening_hours as OpeningHours | string | null;
  const hoursLines = getHoursLines(openingHours);

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

      {/* Opening hours - show all hours directly */}
      {hoursLines && hoursLines.length > 0 && (
        <div className="detail-info-row detail-info-static">
          <div className="detail-info-icon">
            <span>🕐</span>
          </div>
          <div className="detail-info-content">
            {hoursLines.map((line, idx) => (
              <p key={idx} className="detail-info-text">{line}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
