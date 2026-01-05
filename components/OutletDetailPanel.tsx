'use client';

import { useState } from 'react';
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

// Helper to get today's hours (just the time range, no open/closed status)
function getTodayHours(openingHours: OpeningHours | string | null): string | null {
  if (!openingHours) {
    return null;
  }

  // Handle plain text string (e.g., "Daily 10am to 8pm")
  if (typeof openingHours === 'string') {
    return formatHoursDisplay(openingHours);
  }

  // If we have formatted hours, use the first line as compact display
  if (openingHours.formatted && openingHours.formatted.length > 0) {
    return openingHours.formatted[0];
  }

  // Handle structured object with weekday_text
  if (!openingHours.weekday_text || openingHours.weekday_text.length === 0) {
    return null;
  }

  // If weekday_text has only 1 item, it's a generic "Daily" format
  if (openingHours.weekday_text.length === 1) {
    return formatHoursDisplay(openingHours.weekday_text[0]);
  }

  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday

  // Map Sunday=0 to index 6, Mon=1 to index 0, etc.
  const todayIndex = currentDay === 0 ? 6 : currentDay - 1;
  const todayText = openingHours.weekday_text[todayIndex];

  if (!todayText) {
    // Fallback to first item if index out of bounds
    return formatHoursDisplay(openingHours.weekday_text[0]);
  }

  // Extract hours part (after "Day: ")
  const match = todayText.match(/:\s*(.+)$/);
  const hours = match ? match[1].trim() : todayText;

  return formatHoursDisplay(hours);
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

export default function OutletDetailPanel({ outlet, mallName, onBack }: OutletDetailPanelProps) {
  const [showFullHours, setShowFullHours] = useState(false);

  // Get opening hours directly from outlet (can be JSON object or plain string)
  const openingHours = outlet.opening_hours as OpeningHours | string | null;

  // Get formatted hours array if available
  const formattedHours = typeof openingHours === 'object' && openingHours?.formatted
    ? openingHours.formatted
    : null;

  // Get today's hours (just time range)
  const todayHours = getTodayHours(openingHours);

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

      {/* Opening hours - tappable to show full schedule */}
      {todayHours && (
        <div
          className="detail-info-row detail-hours-compact"
          onClick={() => formattedHours && setShowFullHours(!showFullHours)}
          style={{ cursor: formattedHours ? 'pointer' : 'default' }}
        >
          <div className="detail-info-icon">
            <span>🕐</span>
          </div>
          <div className="detail-info-content">
            {showFullHours && formattedHours ? (
              <div className="detail-hours-full">
                {formattedHours.map((line, idx) => (
                  <p key={idx} className="detail-info-text" style={{ whiteSpace: 'pre' }}>{line}</p>
                ))}
              </div>
            ) : (
              <>
                <p className="detail-info-text">{todayHours}</p>
                {formattedHours && (
                  <p className="detail-info-hint">Tap to see full hours</p>
                )}
              </>
            )}
          </div>
          {formattedHours && (
            <div className="detail-info-arrow" style={{ transform: showFullHours ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
