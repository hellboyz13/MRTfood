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
} {
  if (!openingHours) return { isOpen: false, nextTime: null };

  const isOpenNow = openingHours.open_now ?? openingHours.openNow;

  const now = new Date();
  const currentDay = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (!openingHours.periods || openingHours.periods.length === 0) {
    return { isOpen: isOpenNow ?? false, nextTime: null };
  }

  const todayPeriods = openingHours.periods.filter(p => p.open.day === currentDay);

  let isOpen = false;
  let nextCloseTime: number | null = null;
  let nextOpenTime: number | null = null;

  for (const period of todayPeriods) {
    const openMinutes = parseTimeToMinutes(period.open);
    const closeMinutes = period.close ? parseTimeToMinutes(period.close) : 24 * 60;
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

  if (isOpenNow !== undefined && !isOpen && todayPeriods.length > 0) {
    isOpen = isOpenNow;
  }

  let nextTime: string | null = null;
  if (isOpen && nextCloseTime !== null) {
    nextTime = `Closes ${formatMinutesToTime(nextCloseTime)}`;
  } else if (!isOpen && nextOpenTime !== null) {
    nextTime = `Opens ${formatMinutesToTime(nextOpenTime)}`;
  }

  return { isOpen, nextTime };
}

// Format hours more compactly
function formatHoursCompact(hours: string): string {
  return hours
    .replace(/(\d{1,2}):00/g, '$1')
    .replace(/\s*(AM|PM)/gi, (_, p) => ` ${p.toUpperCase()}`)
    .replace(/\s*–\s*/g, ' – ')
    .trim();
}

// Get hours table data for expanded view
function getHoursTableData(openingHours: OpeningHours | null): Array<{ day: string; hours: string; isToday: boolean }> {
  if (!openingHours) return [];

  const currentDay = new Date().getDay();
  const descriptions = openingHours.weekdayDescriptions || openingHours.weekday_text;

  if (descriptions && descriptions.length === 7) {
    return descriptions.map((desc, idx) => {
      const dayIdx = idx === 6 ? 0 : idx + 1;
      const dayName = DAY_NAMES[dayIdx];
      const match = desc.match(/:\s*(.+)$/);
      const hours = match ? match[1].trim() : desc;

      return {
        day: dayName,
        hours: formatHoursCompact(hours),
        isToday: dayIdx === currentDay
      };
    });
  }

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

    const result: Array<{ day: string; hours: string; isToday: boolean }> = [];
    const dayOrder = [1, 2, 3, 4, 5, 6, 0];

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

// Collapsible Opening Hours Component
function OpeningHoursSection({ openingHours }: { openingHours: OpeningHours | string | null }) {
  const [expanded, setExpanded] = useState(false);

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
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`detail-hours-status ${isOpen ? 'open' : 'closed'}`}>
            <span className="status-dot" />
            {isOpen ? 'Open' : 'Closed'}
          </span>
          {nextTime && (
            <span className="detail-hours-closes">· {nextTime}</span>
          )}
        </div>

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

export default function OutletDetailPanel({ outlet, mallName, onBack }: OutletDetailPanelProps) {
  const openingHours = outlet.opening_hours as OpeningHours | string | null;

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

      {/* Opening hours - collapsible with Open/Closed status */}
      <OpeningHoursSection openingHours={openingHours} />
    </div>
  );
}
