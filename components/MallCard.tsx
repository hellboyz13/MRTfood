'use client';

import { useState } from 'react';
import { MallWithOutletCount } from '@/types/database';

interface MallCardProps {
  mall: MallWithOutletCount;
  onClick: () => void;
}

export default function MallCard({ mall, onClick }: MallCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleAddressClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the mall onClick
    const searchQuery = encodeURIComponent(`${mall.name} Singapore`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${searchQuery}`, '_blank');
  };

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      className="w-full text-left bg-white border border-[#E0DCD7] rounded-lg p-3 hover:bg-[#FFF0ED] hover:border-[#FF6B4A] transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-3">
        {/* Mall thumbnail or icon */}
        <div className="w-12 h-12 bg-[#F5F3F0] rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden relative">
          {mall.thumbnail_url ? (
            <>
              {!imageLoaded && (
                <div className="absolute inset-0 bg-gray-200 animate-pulse" />
              )}
              <img
                src={mall.thumbnail_url}
                alt={mall.name}
                className={`w-full h-full object-cover transition-opacity duration-200 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                loading="lazy"
                onLoad={() => setImageLoaded(true)}
              />
            </>
          ) : (
            <span className="text-2xl">🏬</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[#2D2D2D] text-sm">
            {mall.name}
          </h3>
          <p className="text-xs text-[#757575] mt-0.5">
            {mall.outlet_count} food {mall.outlet_count === 1 ? 'outlet' : 'outlets'}
          </p>
          {/* Clickable address */}
          {mall.address && (
            <button
              onClick={handleAddressClick}
              className="text-xs text-[#FF6B4A] hover:text-[#E55A3A] mt-1 hover:underline text-left line-clamp-2"
            >
              {mall.address}
            </button>
          )}
        </div>

        {/* Arrow */}
        <div className="flex-shrink-0 text-[#757575]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>
      </div>
    </div>
  );
}
