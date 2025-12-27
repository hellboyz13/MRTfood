'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

const MAX_ITEMS = 5;
const STORAGE_KEY_LISTINGS = 'spin-selected-listings';
const STORAGE_KEY_OUTLETS = 'spin-selected-outlets';

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

// Helper to load from localStorage
function loadFromStorage(key: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return new Set(parsed);
      }
    }
  } catch {
    // Ignore errors
  }
  return new Set();
}

// Helper to save to localStorage
function saveToStorage(key: string, ids: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(ids)));
  } catch {
    // Ignore errors (e.g., storage full)
  }
}

export function SpinSelectionProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage
  const [selectedListingIds, setSelectedListingIds] = useState<Set<string>>(() => loadFromStorage(STORAGE_KEY_LISTINGS));
  const [selectedOutletIds, setSelectedOutletIds] = useState<Set<string>>(() => loadFromStorage(STORAGE_KEY_OUTLETS));
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage on mount (for SSR compatibility)
  useEffect(() => {
    setSelectedListingIds(loadFromStorage(STORAGE_KEY_LISTINGS));
    setSelectedOutletIds(loadFromStorage(STORAGE_KEY_OUTLETS));
    setIsHydrated(true);
  }, []);

  // Persist to localStorage whenever selections change
  useEffect(() => {
    if (isHydrated) {
      saveToStorage(STORAGE_KEY_LISTINGS, selectedListingIds);
    }
  }, [selectedListingIds, isHydrated]);

  useEffect(() => {
    if (isHydrated) {
      saveToStorage(STORAGE_KEY_OUTLETS, selectedOutletIds);
    }
  }, [selectedOutletIds, isHydrated]);

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
