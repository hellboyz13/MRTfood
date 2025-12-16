'use client';

import { useState } from 'react';
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
  const [page, setPage] = useState(1);

  const OUTLETS_PER_PAGE = 20;
  const paginatedOutlets = outlets.slice(0, page * OUTLETS_PER_PAGE);
  const hasMore = outlets.length > page * OUTLETS_PER_PAGE;

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
    <div>
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
      ) : outlets.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-2">
          {/* Header with spin button */}
          <div className="bg-[#F5F3F0] rounded-lg px-3 py-2 mb-3">
            <div className="flex items-center justify-between">
              {/* Spin Wheel Button */}
              {outlets.length >= 2 && (
                <button
                  onClick={() => setShowSpinWheel(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF6B4A] text-white text-xs font-semibold rounded-full hover:bg-[#E55A3A] transition-colors"
                >
                  <span>🎰</span>
                  <span>Surprise me</span>
                </button>
              )}
            </div>
            <p className="text-xs text-[#999999] mt-1.5 italic">
              Organized by alphabet
            </p>
          </div>
          {paginatedOutlets.map((outlet) => (
            <OutletCard
              key={outlet.id}
              outlet={outlet}
              onClick={() => setSelectedOutlet(outlet)}
            />
          ))}
          {/* Load More button */}
          {hasMore && (
            <button
              onClick={() => setPage(p => p + 1)}
              className="w-full mt-3 py-3 px-4 bg-[#FF6B4A] hover:bg-[#E55A3A] text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Load More ({outlets.length - paginatedOutlets.length} more outlets)
            </button>
          )}
        </div>
      )}

      {/* Slot Machine Modal */}
      {showSpinWheel && (
        <OutletSlotMachine
          outlets={outlets}
          onClose={() => setShowSpinWheel(false)}
        />
      )}
    </div>
  );
}
