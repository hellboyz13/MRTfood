'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { FoodListingWithSources } from '@/types/database';

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
  const spinIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Don't initialize with a random listing - keep it null for neutral placeholder

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
      <div className="mt-3 bg-slate-50 rounded overflow-hidden border border-slate-200 animate-in fade-in duration-500">
        <div className="bg-slate-800 p-3 text-center">
          <p className="text-white text-sm font-medium">Your selection</p>
        </div>

        <div className="p-4">
          <div className="text-center mb-3">
            <h3 className="font-semibold text-lg text-slate-800 mb-1">{winner.name}</h3>
          </div>

          {michelinBadge && (
            <div className="flex justify-center mb-2">
              <span className="px-2 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded border border-amber-200">
                {michelinBadge}
              </span>
            </div>
          )}

          {winner.tags && winner.tags.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5 mb-3">
              {winner.tags.slice(0, 3).map((tag, i) => (
                <span key={i} className="px-2 py-0.5 bg-white text-slate-600 text-xs rounded border border-slate-200">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {(distance || walkTime) && (
            <div className="text-center text-xs text-slate-500 mb-3">
              <span>{distance} {walkTime && `• ${walkTime}`}</span>
            </div>
          )}

          {winner.address && (
            <p className="text-xs text-slate-400 text-center mb-4 line-clamp-2">
              {winner.address}
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={spin}
              className="flex-1 py-2 px-3 bg-white hover:bg-slate-50
                         text-slate-700 font-medium text-sm rounded
                         transition-colors duration-200 border border-slate-200"
            >
              Spin Again
            </button>

            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(winner.name + ' ' + (winner.address || 'Singapore'))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700
                         text-white font-medium text-sm rounded
                         transition-colors duration-200"
            >
              Directions
            </a>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg p-4 mb-4 border border-slate-200">
      <div className="text-center mb-3">
        <h3 className="text-sm font-semibold text-slate-700 mb-0.5">
          🎰 Surprise Me!
        </h3>
      </div>

      {/* Slot Machine Display */}
      <div className="bg-slate-50 rounded p-3 mb-3 border border-slate-200 min-h-[70px] flex items-center justify-center">
        <div className="text-center w-full overflow-hidden">
          <div
            className={`text-lg font-medium text-slate-800 transition-all duration-150 ${
              isSpinning ? 'blur-sm opacity-70' : 'blur-0 opacity-100'
            }`}
            style={{
              animation: isSpinning ? 'slideUp 0.1s ease-in-out infinite' : 'none'
            }}
          >
            {isSpinning && currentListing ? currentListing.name : (!winner ? 'Ready to spin!' : currentListing?.name || '...')}
          </div>
          {!isSpinning && !winner && (
            <div className="mt-1 text-xs text-slate-400">
              Let fate decide your next meal!
            </div>
          )}
          {!isSpinning && currentListing && currentListing.tags && winner && (
            <div className="mt-1 text-xs text-slate-400">
              {currentListing.tags.slice(0, 2).join(' • ')}
            </div>
          )}
        </div>
      </div>

      {!winner && (
        <button
          onClick={spin}
          disabled={listings.length === 0 || isSpinning}
          className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm rounded transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSpinning ? 'Spinning...' : 'Spin'}
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
