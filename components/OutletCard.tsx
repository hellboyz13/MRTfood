'use client';

import { useState } from 'react';
import { MallOutlet } from '@/types/database';
import ImageLightbox from './ImageLightbox';

interface OutletCardProps {
  outlet: MallOutlet;
  onClick?: () => void;
}

export default function OutletCard({ outlet, onClick }: OutletCardProps) {
  const [showLightbox, setShowLightbox] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <>
      <button
        onClick={onClick}
        className="w-full bg-white border border-[#E0DCD7] rounded-lg p-3 shadow-sm hover:bg-[#FFF0ED] hover:border-[#FF6B4A] transition-colors text-left"
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
              <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-500">
                <span>📍</span>
                <span>{outlet.level}</span>
              </div>
            )}
          </div>
        </div>
      </button>

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
