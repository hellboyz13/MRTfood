'use client';

import { useEffect, useCallback, useState, useRef } from 'react';

interface ImageLightboxProps {
  images: string[];
  initialIndex?: number;
  alt?: string;
  onClose: () => void;
}

export default function ImageLightbox({ images, initialIndex = 0, alt = 'Image', onClose }: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Minimum swipe distance to trigger navigation (in pixels)
  const minSwipeDistance = 50;

  const goToNext = useCallback(() => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, images.length]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowRight') {
      goToNext();
    } else if (e.key === 'ArrowLeft') {
      goToPrev();
    }
  }, [onClose, goToNext, goToPrev]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  // Touch handlers for swipe
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setIsDragging(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const currentTouch = e.targetTouches[0].clientX;
    setTouchEnd(currentTouch);
    setDragOffset(currentTouch - touchStart);
  };

  const onTouchEnd = () => {
    setIsDragging(false);
    setDragOffset(0);

    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      goToNext();
    } else if (isRightSwipe) {
      goToPrev();
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 animate-fade-in"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 transition-colors"
        aria-label="Close"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      {/* Navigation arrows - only show if multiple images */}
      {images.length > 1 && (
        <>
          {/* Left arrow */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToPrev();
            }}
            disabled={currentIndex === 0}
            className={`absolute left-2 sm:left-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 transition-all ${
              currentIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'opacity-100'
            }`}
            aria-label="Previous image"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          {/* Right arrow */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
            disabled={currentIndex === images.length - 1}
            className={`absolute right-2 sm:right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 transition-all ${
              currentIndex === images.length - 1 ? 'opacity-30 cursor-not-allowed' : 'opacity-100'
            }`}
            aria-label="Next image"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </>
      )}

      {/* Image container with swipe support */}
      <div
        ref={containerRef}
        className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center touch-pan-y"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform: isDragging ? `translateX(${dragOffset}px)` : 'translateX(0)',
          transition: isDragging ? 'none' : 'transform 0.3s ease-out'
        }}
      >
        <img
          src={images[currentIndex]}
          alt={`${alt} ${currentIndex + 1}`}
          className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl select-none"
          style={{ maxWidth: '90vw' }}
          draggable={false}
        />
      </div>

      {/* Dots indicator - only show if multiple images */}
      {images.length > 1 && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(index);
              }}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex ? 'bg-white w-4' : 'bg-white/50'
              }`}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Hint text */}
      <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-xs sm:text-sm text-center">
        {images.length > 1 ? 'Swipe or use arrows to navigate' : 'Tap outside to close'}
      </p>
    </div>
  );
}
