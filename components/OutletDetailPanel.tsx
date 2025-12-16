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

// Helper to format weekday hours for display (compact version)
function formatWeeklyHours(openingHours: OpeningHours | null): { day: string; hours: string; isToday: boolean }[] | null {
  if (!openingHours?.weekday_text || openingHours.weekday_text.length === 0) {
    return null;
  }

  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday

  // Three letter day abbreviations matching weekday_text order (Mon-Sun)
  const dayAbbrevs = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return openingHours.weekday_text.map((text, index) => {
    // Extract hours part (after "Day: ")
    const match = text.match(/:\s*(.+)$/);
    let hours = match ? match[1].trim() : text;

    // Shorten common phrases
    hours = hours
      .replace('Closed', '✕')
      .replace('Open 24 hours', '24h')
      .replace(/\s*[–-]\s*/g, ' - ') // Normalize dashes with spaces
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

export default function OutletDetailPanel({ outlet, mallName, onBack }: OutletDetailPanelProps) {
  // Get opening hours directly from outlet
  const openingHours = outlet.opening_hours as OpeningHours | null;

  // Get weekly hours
  const weeklyHours = openingHours ? formatWeeklyHours(openingHours) : null;

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

      {/* Opening hours - full week */}
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
    </div>
  );
}
