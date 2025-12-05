'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { FoodListingWithSources } from '@/types/database';

interface SlotMachineProps {
  listings: FoodListingWithSources[];
  onSelectWinner: (listing: FoodListingWithSources) => void;
}

function getMichelinBadge(sourceId: string): string | null {
  if (sourceId === 'michelin-3-star') return '3 Michelin Stars';
  if (sourceId === 'michelin-2-star') return '2 Michelin Stars';
  if (sourceId === 'michelin-1-star') return '1 Michelin Star';
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
  const spinIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize with random listing
  useEffect(() => {
    if (listings.length > 0 && !currentListing) {
      setCurrentListing(listings[Math.floor(Math.random() * listings.length)]);
    }
  }, [listings, currentListing]);

  const spin = useCallback(() => {
    if (listings.length === 0 || isSpinning) return;

    setIsSpinning(true);
    setWinner(null);

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
        setIsSpinning(false);
        onSelectWinner(randomWinner);
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

  const WinnerCard = () => {
    if (!winner) return null;

    const michelinSource = winner.sources?.find(s => getMichelinBadge(s.source.id));
    const michelinBadge = michelinSource ? getMichelinBadge(michelinSource.source.id) : null;
    const distance = formatDistance(winner.distance_to_station);
    const walkTime = formatWalkTime(winner.distance_to_station);

    return (
      <div className="mt-4 bg-white rounded-xl shadow-lg overflow-hidden border-2 border-emerald-200 animate-in fade-in duration-500">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-4 text-center">
          <p className="text-white text-base font-semibold">Your meal awaits!</p>
        </div>

        <div className="p-5">
          <div className="text-center mb-4">
            <h3 className="font-bold text-xl text-gray-900 mb-2">{winner.name}</h3>
          </div>

          {michelinBadge && (
            <div className="flex justify-center mb-3">
              <span className="px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full border border-amber-200">
                ⭐ {michelinBadge}
              </span>
            </div>
          )}

          {winner.tags && winner.tags.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {winner.tags.slice(0, 3).map((tag, i) => (
                <span key={i} className="px-3 py-1 bg-slate-50 text-slate-700 text-xs font-medium rounded-full border border-slate-200">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {(distance || walkTime) && (
            <div className="text-center text-sm text-gray-600 mb-4 flex items-center justify-center gap-2">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{distance} {walkTime && `• ${walkTime}`}</span>
            </div>
          )}

          {winner.address && (
            <p className="text-xs text-gray-500 text-center mb-5 line-clamp-2 px-2">
              {winner.address}
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={spin}
              className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200
                         text-slate-700 font-semibold text-sm rounded-lg
                         transition-all duration-200 border border-slate-200
                         hover:border-slate-300"
            >
              Try Again
            </button>

            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(winner.name + ' ' + (winner.address || 'Singapore'))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-500
                         hover:from-emerald-600 hover:to-teal-600
                         text-white font-semibold text-sm rounded-lg
                         shadow-sm hover:shadow-md
                         transition-all duration-200"
            >
              Get Directions
            </a>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-5 mb-4 border border-slate-200 shadow-sm">
      <div className="text-center mb-5">
        <h3 className="text-lg font-bold text-slate-800 mb-1">
          Can&apos;t Decide?
        </h3>
        <p className="text-sm text-slate-600">Let us pick for you!</p>
      </div>

      {/* Slot Machine Display */}
      <div className="bg-white rounded-lg p-6 shadow-inner mb-5 border-2 border-slate-200 min-h-[120px] flex items-center justify-center">
        <div className="text-center w-full overflow-hidden">
          <div
            className={`text-2xl font-bold text-slate-800 transition-all duration-150 ${
              isSpinning ? 'animate-pulse blur-sm' : 'blur-0'
            }`}
            style={{
              animation: isSpinning ? 'slideUp 0.1s ease-in-out infinite' : 'none'
            }}
          >
            {currentListing ? currentListing.name : '...'}
          </div>
          {!isSpinning && currentListing && currentListing.tags && (
            <div className="mt-2 text-sm text-slate-500">
              {currentListing.tags.slice(0, 2).join(' • ')}
            </div>
          )}
        </div>
      </div>

      {!winner && (
        <button
          onClick={spin}
          disabled={listings.length === 0 || isSpinning}
          className="w-full py-3 px-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-base rounded-lg shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isSpinning ? 'Spinning...' : 'Spin Now!'}
        </button>
      )}

      {winner && <WinnerCard />}

      <style jsx>{`
        @keyframes slideUp {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }
      `}</style>
    </div>
  );
}
