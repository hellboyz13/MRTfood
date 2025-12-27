'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

const MAX_ITEMS = 5;
const STORAGE_KEY_PREFIX = 'spin-selection-';

interface SpinSelectionContextType {
  selectedListingIds: Set<string>;
  selectedOutletIds: Set<string>;
  toggleListing: (id: string) => boolean;
  toggleOutlet: (id: string) => boolean;
  clearListings: () => void;
  clearOutlets: () => void;
  clearAll: () => void;
  listingCount: number;
  outletCount: number;
  canAddListing: boolean;
  canAddOutlet: boolean;
  MAX_ITEMS: number;
}

const SpinSelectionContext = createContext<SpinSelectionContextType | null>(null);

interface StationSelections {
  listings: string[];
  outlets: string[];
}

// Helper to load from localStorage for a specific station
function loadFromStorage(stationId: string): StationSelections {
  if (typeof window === 'undefined') return { listings: [], outlets: [] };
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PREFIX + stationId);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        listings: Array.isArray(parsed.listings) ? parsed.listings : [],
        outlets: Array.isArray(parsed.outlets) ? parsed.outlets : []
      };
    }
  } catch {
    // Ignore errors
  }
  return { listings: [], outlets: [] };
}

// Helper to save to localStorage for a specific station
function saveToStorage(stationId: string, listings: Set<string>, outlets: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    const data: StationSelections = {
      listings: Array.from(listings),
      outlets: Array.from(outlets)
    };
    localStorage.setItem(STORAGE_KEY_PREFIX + stationId, JSON.stringify(data));
  } catch {
    // Ignore errors (e.g., storage full)
  }
}

interface SpinSelectionProviderProps {
  children: ReactNode;
  stationId: string;
}

export function SpinSelectionProvider({ children, stationId }: SpinSelectionProviderProps) {
  // Initialize empty - will hydrate from localStorage
  const [selectedListingIds, setSelectedListingIds] = useState<Set<string>>(new Set());
  const [selectedOutletIds, setSelectedOutletIds] = useState<Set<string>>(new Set());
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage on mount or when stationId changes
  useEffect(() => {
    const stored = loadFromStorage(stationId);
    setSelectedListingIds(new Set(stored.listings));
    setSelectedOutletIds(new Set(stored.outlets));
    setIsHydrated(true);
  }, [stationId]);

  // Persist to localStorage whenever selections change
  useEffect(() => {
    if (isHydrated) {
      saveToStorage(stationId, selectedListingIds, selectedOutletIds);
    }
  }, [selectedListingIds, selectedOutletIds, isHydrated, stationId]);

  const toggleListing = useCallback((id: string): boolean => {
    let success = false;
    setSelectedListingIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        success = true;
        return next;
      }
      if (next.size >= MAX_ITEMS) {
        success = false;
        return prev;
      }
      next.add(id);
      success = true;
      return next;
    });
    return success;
  }, []);

  const toggleOutlet = useCallback((id: string): boolean => {
    let success = false;
    setSelectedOutletIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        success = true;
        return next;
      }
      if (next.size >= MAX_ITEMS) {
        success = false;
        return prev;
      }
      next.add(id);
      success = true;
      return next;
    });
    return success;
  }, []);

  const clearListings = useCallback(() => {
    setSelectedListingIds(new Set());
  }, []);

  const clearOutlets = useCallback(() => {
    setSelectedOutletIds(new Set());
  }, []);

  const clearAll = useCallback(() => {
    setSelectedListingIds(new Set());
    setSelectedOutletIds(new Set());
  }, []);

  return (
    <SpinSelectionContext.Provider
      value={{
        selectedListingIds,
        selectedOutletIds,
        toggleListing,
        toggleOutlet,
        clearListings,
        clearOutlets,
        clearAll,
        listingCount: selectedListingIds.size,
        outletCount: selectedOutletIds.size,
        canAddListing: selectedListingIds.size < MAX_ITEMS,
        canAddOutlet: selectedOutletIds.size < MAX_ITEMS,
        MAX_ITEMS,
      }}
    >
      {children}
    </SpinSelectionContext.Provider>
  );
}

export function useSpinSelection() {
  const context = useContext(SpinSelectionContext);
  if (!context) {
    throw new Error('useSpinSelection must be used within SpinSelectionProvider');
  }
  return context;
}
