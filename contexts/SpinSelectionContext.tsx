'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

const MAX_ITEMS = 5;

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

export function SpinSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedListingIds, setSelectedListingIds] = useState<Set<string>>(new Set());
  const [selectedOutletIds, setSelectedOutletIds] = useState<Set<string>>(new Set());

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
