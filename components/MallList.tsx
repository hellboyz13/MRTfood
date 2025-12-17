'use client';

import { MallWithOutletCount } from '@/types/database';
import MallCard from './MallCard';

interface MallListProps {
  malls: MallWithOutletCount[];
  loading: boolean;
  onSelectMall: (mallId: string) => void;
}

function LoadingState() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-gray-100 rounded-lg p-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-200 rounded-lg" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
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
      <div className="text-4xl mb-3">🏬</div>
      <p className="text-[#2D2D2D] text-sm font-medium">
        No malls found at this station.
      </p>
      <p className="text-[#757575] text-xs mt-1">
        Check back soon!
      </p>
    </div>
  );
}

export default function MallList({ malls, loading, onSelectMall }: MallListProps) {
  if (loading) {
    return <LoadingState />;
  }

  if (malls.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-2">
      <div className="bg-[#F5F3F0] rounded-lg px-3 py-2 mb-3">
        <div className="flex items-center gap-2 text-sm font-medium text-[#2D2D2D]">
          <span className="text-base">🏬</span>
          <span>Malls near this station</span>
        </div>
        <p className="text-xs text-[#999999] mt-1 italic">Sorted by most food options</p>
      </div>
      {malls.map((mall) => (
        <MallCard
          key={mall.id}
          mall={mall}
          onClick={() => onSelectMall(mall.id)}
        />
      ))}
    </div>
  );
}
