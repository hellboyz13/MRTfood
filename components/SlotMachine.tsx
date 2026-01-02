'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { FoodListingWithSources } from '@/types/database';
import { getMapsUrl } from '@/lib/distance';
import { useSpinSelection } from '@/contexts/SpinSelectionContext';

// Hook to fetch thumbnail for a listing
interface MenuImage {
  image_url: string;
  is_header?: boolean;
}

function useThumbnail(listingId: string | null) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  useEffect(() => {
    if (!listingId) {
      setThumbnail(null);
      return;
    }

    let cancelled = false;

    async function fetchThumbnail() {
      try {
        const response = await fetch(`/api/get-menu-images?listingId=${listingId}`);
        if (cancelled) return;

        const data = await response.json();
        if (cancelled) return;

        if (data.success && data.images.length > 0) {
          const headerImg = data.images.find((img: MenuImage) => img.is_header);
          setThumbnail(headerImg?.image_url || data.images[0]?.image_url);
        }
      } catch {
        // Silently fail - thumbnail is optional
      }
    }

    fetchThumbnail();

    return () => {
      cancelled = true;
    };
  }, [listingId]);

  return thumbnail;
}

interface SlotMachineProps {
  listings: FoodListingWithSources[];
  onClose: () => void;
}

function getMichelinBadge(sourceId: string): string | null {
  if (sourceId === 'michelin-hawker') return 'Michelin Hawker';
  if (sourceId === 'michelin-bib-gourmand') return 'Bib Gourmand';
  return null;
}

function formatDistance(meters: number | null): string {
  if (!meters) return '';
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function formatWalkTime(meters: number | null): string {
  if (!meters) return '';
  const minutes = Math.ceil(meters / 80);
  return `${minutes} min walk`;
}

export default function SlotMachine({ listings, onClose }: SlotMachineProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentListing, setCurrentListing] = useState<FoodListingWithSources | null>(null);
  const [winner, setWinner] = useState<FoodListingWithSources | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const spinIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get selected listings from context - spin only selected if any are selected
  const { selectedListingIds } = useSpinSelection();
  const spinListings = useMemo(() => {
    if (selectedListingIds.size === 0) return listings;
    return listings.filter(l => selectedListingIds.has(l.id));
  }, [listings, selectedListingIds]);

  // Fetch thumbnail for winner
  const winnerThumbnail = useThumbnail(winner?.id || null);
  const displayImage = winnerThumbnail || (winner?.image_url?.startsWith('http') ? winner.image_url : null);

  const spin = useCallback(() => {
    if (spinListings.length === 0 || isSpinning) return;

    setIsSpinning(true);
    setWinner(null);
    setShowCelebration(false);

    let spinCount = 0;
    const maxSpins = 30;
    let currentSpeed = 50;

    // Use recursive setTimeout instead of setInterval so speed changes take effect
    const doSpin = () => {
      // Change listing rapidly
      setCurrentListing(spinListings[Math.floor(Math.random() * spinListings.length)]);

      spinCount++;

      // Gradually slow down after 20 spins
      if (spinCount > 20) {
        currentSpeed += 20;
      }

      if (spinCount >= maxSpins) {
        // Pick final winner
        const randomWinner = spinListings[Math.floor(Math.random() * spinListings.length)];
        setCurrentListing(randomWinner);
        setWinner(randomWinner);
        setAnimationKey(prev => prev + 1);
        setIsSpinning(false);
        setShowCelebration(true);

        // Hide celebration after animation
        setTimeout(() => setShowCelebration(false), 1500);
      } else {
        // Schedule next spin with updated speed
        spinIntervalRef.current = setTimeout(doSpin, currentSpeed);
      }
    };

    // Start spinning
    spinIntervalRef.current = setTimeout(doSpin, currentSpeed);
  }, [spinListings, isSpinning]);

  useEffect(() => {
    return () => {
      if (spinIntervalRef.current) {
        clearTimeout(spinIntervalRef.current);
      }
    };
  }, []);

  // Render winner card content
  const renderWinnerCard = () => {
    if (!winner) return null;

    const michelinSource = winner.sources?.find(s => getMichelinBadge(s.source.id));
    const michelinBadge = michelinSource ? getMichelinBadge(michelinSource.source.id) : null;
    const distance = formatDistance(winner.distance_to_station);
    const walkTime = formatWalkTime(winner.distance_to_station);

    return (
      <div
        key={animationKey}
        className="mt-3 rounded-lg overflow-hidden border border-[#E0DCD7]"
        style={{
          animation: 'winnerPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
        }}
      >
        <div className="bg-[#F5F3F0] p-3 text-center border-b border-[#E0DCD7]">
          <p className="text-[#2D2D2D] text-sm font-medium">Your selection</p>
        </div>

        <div className="p-4 bg-[#FFF0ED]">
          {/* Food thumbnail */}
          <div className="flex justify-center mb-3">
            <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
              {displayImage ? (
                <img
                  src={displayImage}
                  alt={winner.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl">🍽️</span>
              )}
            </div>
          </div>

          <div className="text-center mb-3">
            <h3 className="font-semibold text-lg text-[#2D2D2D] mb-1">{winner.name}</h3>
          </div>

          {michelinBadge && (
            <div className="flex justify-center mb-2">
              <span className="px-2 py-1 bg-[#FF6B4A] text-white text-xs font-medium rounded">
                {michelinBadge}
              </span>
            </div>
          )}

          {winner.tags && winner.tags.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5 mb-3">
              {winner.tags.slice(0, 3).map((tag, i) => (
                <span key={i} className="px-2 py-0.5 bg-white text-[#2D2D2D] text-xs rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {(distance || walkTime) && (
            <div className="text-center text-xs text-[#757575] font-medium mb-3">
              <span>{distance} {walkTime && `• ${walkTime}`}</span>
            </div>
          )}

          {winner.address && (
            <p className="text-xs text-[#757575] text-center mb-4 line-clamp-2">
              {winner.address}
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={spin}
              className="flex-1 py-2 px-3 bg-[#E8E4E0] hover:bg-[#DDD9D4]
                         text-[#2D2D2D] font-medium text-sm rounded
                         transition-colors duration-200"
            >
              Spin Again
            </button>

            <a
              href={getMapsUrl(winner.name, winner.landmark, winner.address)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2 px-3 bg-[#FF6B4A] hover:bg-[#E55A3A]
                         text-white font-medium text-sm rounded
                         transition-colors duration-200 text-center"
            >
              Directions
            </a>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
      <div className="bg-white rounded-2xl p-4 mx-4 max-w-[340px] w-full shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#2D2D2D]">
            🎰 Surprise Me!
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Slot Machine Display - only show when spinning or no winner yet */}
        {!winner && (
          <div className={`bg-[#FFF0ED] rounded p-3 mb-3 border border-[#FF6B4A]/30 min-h-[70px] flex items-center justify-center relative overflow-hidden ${
            showCelebration ? 'bg-[#FFF0ED]' : ''
          }`}>
            <div className="text-center w-full overflow-hidden relative z-10">
              <div
                className={`text-lg font-medium transition-all duration-150 ${
                  isSpinning ? 'blur-sm opacity-70 text-[#2D2D2D]' : 'blur-0 opacity-100'
                } ${showCelebration ? 'text-[#2D2D2D] animate-bounce-subtle scale-105' : 'text-[#2D2D2D]'}`}
                style={{
                  animation: isSpinning ? 'slotSpin 0.08s ease-in-out infinite' : undefined
                }}
              >
                {isSpinning && currentListing ? currentListing.name : 'Ready to spin!'}
              </div>
              {!isSpinning && (
                <div className="mt-1 text-xs text-[#757575]">
                  Let fate decide your next meal!
                </div>
              )}
            </div>
          </div>
        )}

        {!winner && (
          <button
            onClick={spin}
            disabled={listings.length === 0 || isSpinning}
            className={`w-full py-2.5 px-4 font-medium text-sm rounded transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
              isSpinning
                ? 'bg-[#FFF0ED] text-[#FF6B4A] animate-pulse'
                : 'bg-[#FF6B4A] hover:bg-[#E55A3A] hover:scale-[1.02] active:scale-[0.98] text-white'
            }`}
          >
            {isSpinning ? '🎲 Spinning...' : '🎰 Spin'}
          </button>
        )}

        {winner && renderWinnerCard()}

        <style jsx>{`
          @keyframes slotSpin {
            0% {
              transform: translateY(-100%);
              opacity: 0;
            }
            50% {
              opacity: 1;
            }
            100% {
              transform: translateY(100%);
              opacity: 0;
            }
          }
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
            20%, 40%, 60%, 80% { transform: translateX(2px); }
          }
          .animate-shake {
            animation: shake 0.5s ease-in-out infinite;
          }
          .animate-bounce-subtle {
            animation: bounceSubtle 0.5s ease-out;
          }
          @keyframes bounceSubtle {
            0% { transform: scale(0.9); opacity: 0; }
            50% { transform: scale(1.1); }
            100% { transform: scale(1.05); opacity: 1; }
          }
          @keyframes winnerPop {
            0% {
              transform: scale(0.3);
              opacity: 0;
            }
            50% {
              transform: scale(1.08);
              opacity: 1;
            }
            70% {
              transform: scale(0.95);
            }
            100% {
              transform: scale(1);
            }
          }
        `}</style>
      </div>
    </div>
  );
}
