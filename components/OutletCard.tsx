'use client';

import { useState } from 'react';
import { MallOutlet } from '@/types/database';
import ImageLightbox from './ImageLightbox';
import { useSpinSelection } from '@/contexts/SpinSelectionContext';

interface OutletCardProps {
  outlet: MallOutlet;
  onClick?: () => void;
}

export default function OutletCard({ outlet, onClick }: OutletCardProps) {
  const [showLightbox, setShowLightbox] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Spin selection
  const { selectedOutletIds, toggleOutlet, canAddOutlet } = useSpinSelection();
  const isSelectedForSpin = selectedOutletIds.has(outlet.id);

  return (
    <>
      <div
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); }}
        className="w-full bg-white border border-[#E0DCD7] rounded-lg p-3 shadow-sm hover:bg-[#FFF0ED] hover:border-[#FF6B4A] transition-colors text-left cursor-pointer"
      >
        <div className="flex gap-3">
          {/* Thumbnail - clickable to expand */}
          <div
            className={`relative w-16 h-16 bg-gray-100 rounded-md flex-shrink-0 flex items-center justify-center overflow-hidden ${
              outlet.thumbnail_url ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''
            }`}
            onClick={(e) => {
              if (outlet.thumbnail_url) {
                e.stopPropagation(); // Prevent card click
                setShowLightbox(true);
              }
            }}
          >
            {outlet.thumbnail_url ? (
              <>
                {!imageLoaded && (
                  <div className="absolute inset-0 bg-gray-200 animate-pulse" />
                )}
                <img
                  src={outlet.thumbnail_url}
                  alt={outlet.name}
                  loading="lazy"
                  decoding="async"
                  className={`w-full h-full object-cover transition-opacity duration-200 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                  onLoad={() => setImageLoaded(true)}
                />
              </>
            ) : (
              <span className="text-2xl">🍽️</span>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Name */}
            <h3 className="font-semibold text-gray-900 text-sm leading-tight">
              {outlet.name}
            </h3>

            {/* Category */}
            {outlet.category && (
              <p className="text-xs text-[#757575] mt-0.5 truncate">
                {outlet.category}
              </p>
            )}

            {/* Level */}
            {outlet.level && (
              <p className="text-xs text-gray-500 mt-1.5">
                {outlet.level}
              </p>
            )}

            {/* Spin Selection Toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleOutlet(outlet.id);
              }}
              disabled={!isSelectedForSpin && !canAddOutlet}
              className={`mt-2 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
                isSelectedForSpin
                  ? 'bg-[#FF6B4A] text-white shadow-md ring-2 ring-[#FF6B4A]/30'
                  : canAddOutlet
                    ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 hover:border-amber-300'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isSelectedForSpin ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Selected</span>
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v8M8 12h8" />
                  </svg>
                  <span>Add to Spin</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Image Lightbox */}
      {showLightbox && outlet.thumbnail_url && (
        <ImageLightbox
          images={[outlet.thumbnail_url]}
          alt={outlet.name}
          onClose={() => setShowLightbox(false)}
        />
      )}
    </>
  );
}
