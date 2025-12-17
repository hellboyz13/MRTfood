'use client';

import { useState, useMemo } from 'react';
import { MallOutlet, Mall } from '@/types/database';
import OutletCard from './OutletCard';
import OutletSlotMachine from './OutletSlotMachine';
import OutletDetailPanel from './OutletDetailPanel';

interface OutletListProps {
  mall: Mall | null;
  outlets: MallOutlet[];
  loading: boolean;
  onBack: () => void;
}

// Parse level from outlet.level field (unit number format)
// Examples: "#01-15" → "1", "#B2-41" → "B2", "B1-K11" → "B1", "01 - 127" → "1"
// Standalone numbers like "21" are NOT floor levels - they go to Others
function parseLevel(level: string | null): string | null {
  if (!level) return null;

  const trimmed = level.trim();

  // Must have a dash/hyphen to be a valid unit number format
  // This filters out standalone numbers like "21" which aren't floor-unit format
  if (!trimmed.includes('-')) {
    return null;
  }

  // Handle various unit formats:
  // "#01-15", "#B2-41", "B1-K11", "01 - 127", "#04 - 12A"
  const unitMatch = trimmed.match(/^#?\s*([B]?\d+)\s*-/i);
  if (unitMatch) {
    const floorPart = unitMatch[1].toUpperCase();
    // Remove leading zeros from numeric floors (e.g., "01" → "1", "02" → "2")
    if (/^\d+$/.test(floorPart)) {
      return String(parseInt(floorPart, 10));
    }
    return floorPart; // B1, B2, B3, etc.
  }

  return null;
}

// Sort levels: B2, B1, 1, 2, 3, etc.
function sortLevelKeys(a: string, b: string): number {
  // "Others" always goes last
  if (a === 'Others') return 1;
  if (b === 'Others') return -1;

  const aIsBasement = a.startsWith('B');
  const bIsBasement = b.startsWith('B');

  // Basements come before ground levels
  if (aIsBasement && !bIsBasement) return -1;
  if (!aIsBasement && bIsBasement) return 1;

  // Both basements: B2 comes before B1 (deeper first)
  if (aIsBasement && bIsBasement) {
    const aNum = parseInt(a.slice(1), 10);
    const bNum = parseInt(b.slice(1), 10);
    return bNum - aNum; // B2 (2) > B1 (1) so B2 comes first
  }

  // Both regular floors: sort numerically
  return parseInt(a, 10) - parseInt(b, 10);
}

interface GroupedOutlets {
  level: string;
  displayLevel: string;
  outlets: MallOutlet[];
}

function LoadingState() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-gray-100 rounded-lg p-4 animate-pulse">
          <div className="flex gap-3">
            <div className="w-16 h-16 bg-gray-200 rounded-md" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-8 bg-[#F5F3F0] rounded-lg border border-[#E0DCD7]">
      <div className="text-4xl mb-3">🍽️</div>
      <p className="text-[#2D2D2D] text-sm font-medium">
        No outlets found in this mall.
      </p>
      <p className="text-[#757575] text-xs mt-1">
        Check back soon!
      </p>
    </div>
  );
}

export default function OutletList({ mall, outlets, loading, onBack }: OutletListProps) {
  const [showSpinWheel, setShowSpinWheel] = useState(false);
  const [selectedOutlet, setSelectedOutlet] = useState<MallOutlet | null>(null);

  // Group outlets by floor level (exclude outlets with unclear unit info)
  const groupedOutlets = useMemo((): GroupedOutlets[] => {
    const groups: Record<string, MallOutlet[]> = {};

    outlets.forEach((outlet) => {
      const parsedLevel = parseLevel(outlet.level);
      // Skip outlets without valid floor level (they would go to "Others")
      if (!parsedLevel) return;

      if (!groups[parsedLevel]) {
        groups[parsedLevel] = [];
      }
      groups[parsedLevel].push(outlet);
    });

    // Sort levels and convert to array
    const sortedKeys = Object.keys(groups).sort(sortLevelKeys);

    return sortedKeys.map((key) => ({
      level: key,
      displayLevel: `Level ${key}`,
      outlets: groups[key],
    }));
  }, [outlets]);

  // Count total displayed outlets (for spin button logic)
  const displayedOutletsCount = groupedOutlets.reduce((sum, g) => sum + g.outlets.length, 0);

  // If an outlet is selected, show detail panel
  if (selectedOutlet && mall) {
    return (
      <OutletDetailPanel
        outlet={selectedOutlet}
        mallName={mall.name}
        onBack={() => setSelectedOutlet(null)}
      />
    );
  }

  return (
    <div className="min-h-0">
      {/* Back button with mall name */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-medium text-[#2D2D2D] hover:text-[#FF6B4A] transition-colors mb-3"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        <span>{mall?.name || 'Back'}</span>
      </button>

      {loading ? (
        <LoadingState />
      ) : displayedOutletsCount === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-6">
          {/* Spin Button - full width */}
          {displayedOutletsCount >= 2 && (
            <button
              onClick={() => setShowSpinWheel(true)}
              className="w-full flex items-center justify-center gap-2 py-2 bg-[#FF6B4A] text-white text-sm font-semibold rounded-lg hover:bg-[#E55A3A] transition-colors"
            >
              <span>🎰</span>
              <span>Can't decide? Spin!</span>
            </button>
          )}

          {/* Grouped outlets by floor level */}
          {groupedOutlets.map((group, index) => (
            <div key={group.level}>
              {/* Level header - prominent divider */}
              <div className="bg-[#F5F3F0] rounded-lg px-4 py-2 mb-3">
                <span className="text-sm font-semibold text-[#2D2D2D]">
                  {group.displayLevel}
                </span>
                <span className="text-xs text-[#757575] ml-2">
                  ({group.outlets.length})
                </span>
              </div>

              {/* Outlets in this level */}
              <div className="space-y-2">
                {group.outlets.map((outlet) => (
                  <OutletCard
                    key={outlet.id}
                    outlet={outlet}
                    onClick={() => setSelectedOutlet(outlet)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Slot Machine Modal */}
      {showSpinWheel && (
        <OutletSlotMachine
          outlets={groupedOutlets.flatMap(g => g.outlets)}
          onClose={() => setShowSpinWheel(false)}
        />
      )}
    </div>
  );
}
