'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { FoodListingWithSources } from '@/types/database';
import { getMapsUrl } from '@/lib/distance';

interface SlotMachineProps {
  listings: FoodListingWithSources[];
  onSelectWinner: (listing: FoodListingWithSources) => void;
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

export default function SlotMachine({ listings, onSelectWinner }: SlotMachineProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentListing, setCurrentListing] = useState<FoodListingWithSources | null>(null);
  const [winner, setWinner] = useState<FoodListingWithSources | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const spinIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Don't initialize with a random listing - keep it null for neutral placeholder

  const spin = useCallback(() => {
    if (listings.length === 0 || isSpinning) return;

    setIsSpinning(true);
    setWinner(null);
    setShowCelebration(false);

    let spinCount = 0;
    const maxSpins = 30;
    let currentSpeed = 50;

    spinIntervalRef.current = setInterval(() => {
      // Change listing rapidly
      setCurrentListing(listings[Math.floor(Math.random() * listings.length)]);

      spinCount++;

      // Gradually slow down
      if (spinCount > 20) {
        currentSpeed += 20;
      }

      if (spinCount >= maxSpins) {
        if (spinIntervalRef.current) {
          clearInterval(spinIntervalRef.current);
        }

        // Pick final winner
        const randomWinner = listings[Math.floor(Math.random() * listings.length)];
        setCurrentListing(randomWinner);
        setWinner(randomWinner);
        setAnimationKey(prev => prev + 1); // Increment key to trigger animation once
        setIsSpinning(false);
        setShowCelebration(true);
        onSelectWinner(randomWinner);

        // Hide celebration after animation
        setTimeout(() => setShowCelebration(false), 1500);
      }
    }, currentSpeed);
  }, [listings, isSpinning, onSelectWinner]);

  useEffect(() => {
    return () => {
      if (spinIntervalRef.current) {
        clearInterval(spinIntervalRef.current);
      }
    };
  }, []);

  // Render winner card content (not as separate component to avoid remounting)
  const renderWinnerCard = () => {
    if (!winner) return null;

    const michelinSource = winner.sources?.find(s => getMichelinBadge(s.source.id));
    const michelinBadge = michelinSource ? getMichelinBadge(michelinSource.source.id) : null;
    const distance = formatDistance(winner.distance_to_station);
    const walkTime = formatWalkTime(winner.distance_to_station);

    return (
      <div
        key={animationKey}
        className="mt-3 rounded-lg overflow-hidden border-2 border-[#1a1a1a]"
        style={{
          animation: 'winnerPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
        }}
      >
        <div className="bg-white p-3 text-center border-b-2 border-[#1a1a1a]">
          <p className="text-[#1a1a1a] text-sm font-medium">Your selection</p>
        </div>

        <div className="p-4 bg-[#E8B931]">
          <div className="text-center mb-3">
            <h3 className="font-semibold text-lg text-[#1a1a1a] mb-1">{winner.name}</h3>
          </div>

          {michelinBadge && (
            <div className="flex justify-center mb-2">
              <span className="px-2 py-1 bg-[#1a1a1a] text-[#E8B931] text-xs font-medium rounded">
                {michelinBadge}
              </span>
            </div>
          )}

          {winner.tags && winner.tags.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5 mb-3">
              {winner.tags.slice(0, 3).map((tag, i) => (
                <span key={i} className="px-2 py-0.5 bg-white/80 text-[#1a1a1a] text-xs rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {(distance || walkTime) && (
            <div className="text-center text-xs text-[#1a1a1a] font-medium mb-3">
              <span>{distance} {walkTime && `• ${walkTime}`}</span>
            </div>
          )}

          {winner.address && (
            <p className="text-xs text-[#1a1a1a] text-center mb-4 line-clamp-2">
              {winner.address}
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={spin}
              className="flex-1 py-2 px-3 bg-white hover:bg-gray-100
                         text-[#1a1a1a] font-medium text-sm rounded
                         transition-colors duration-200 border border-[#1a1a1a]"
            >
              Spin Again
            </button>

            <a
              href={getMapsUrl(winner.name, winner.landmark, winner.address)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2 px-3 bg-white hover:bg-gray-100
                         text-[#1a1a1a] font-medium text-sm rounded
                         transition-colors duration-200 text-center border border-[#1a1a1a]"
            >
              Directions
            </a>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-lg p-4 mb-4 border-2 border-[#1a1a1a] transition-all duration-300 ${
      isSpinning ? 'animate-shake' : ''
    } ${showCelebration ? 'ring-2 ring-[#E8B931] ring-offset-2' : ''}`}>
      <div className="text-center mb-3">
        <h3 className="text-sm font-semibold text-[#1a1a1a] mb-0.5">
          🎰 Surprise Me!
        </h3>
      </div>

      {/* Slot Machine Display - only show when spinning or no winner yet */}
      {!winner && (
        <div className={`bg-[#E8B931]/10 rounded p-3 mb-3 border border-[#E8B931] min-h-[70px] flex items-center justify-center relative overflow-hidden ${
          showCelebration ? 'bg-[#E8B931]/30' : ''
        }`}>
          <div className="text-center w-full overflow-hidden relative z-10">
            <div
              className={`text-lg font-medium transition-all duration-150 ${
                isSpinning ? 'blur-sm opacity-70 text-[#1a1a1a]' : 'blur-0 opacity-100'
              } ${showCelebration ? 'text-[#1a1a1a] animate-bounce-subtle scale-105' : 'text-[#1a1a1a]'}`}
              style={{
                animation: isSpinning ? 'slotSpin 0.08s ease-in-out infinite' : undefined
              }}
            >
              {isSpinning && currentListing ? currentListing.name : 'Ready to spin!'}
            </div>
            {!isSpinning && (
              <div className="mt-1 text-xs text-[#1a1a1a]/60">
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
              ? 'bg-[#E8B931] text-[#1a1a1a] animate-pulse'
              : 'bg-[#1a1a1a] hover:bg-[#2a2a2a] hover:scale-[1.02] active:scale-[0.98] text-[#E8B931]'
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
        .animate-winner-pop {
          animation: winnerPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>
    </div>
  );
}
