'use client';

import { useState, useEffect, useCallback } from 'react';
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
  const [slots, setSlots] = useState<FoodListingWithSources[]>([]);
  const [winner, setWinner] = useState<FoodListingWithSources | null>(null);

  // Initialize slots with random listings
  useEffect(() => {
    if (listings.length > 0) {
      setSlots([
        listings[Math.floor(Math.random() * listings.length)],
        listings[Math.floor(Math.random() * listings.length)],
        listings[Math.floor(Math.random() * listings.length)],
      ]);
    }
  }, [listings]);

  const spin = useCallback(() => {
    if (listings.length === 0 || isSpinning) return;

    setIsSpinning(true);
    setWinner(null);

    let spinCount = 0;
    const maxSpins = 20;

    const spinInterval = setInterval(() => {
      setSlots([
        listings[Math.floor(Math.random() * listings.length)],
        listings[Math.floor(Math.random() * listings.length)],
        listings[Math.floor(Math.random() * listings.length)],
      ]);

      spinCount++;

      if (spinCount >= maxSpins) {
        clearInterval(spinInterval);

        // Pick final winner
        const randomWinner = listings[Math.floor(Math.random() * listings.length)];
        setSlots([randomWinner, randomWinner, randomWinner]);
        setWinner(randomWinner);
        setIsSpinning(false);
        onSelectWinner(randomWinner);
      }
    }, 100);
  }, [listings, isSpinning, onSelectWinner]);

  const SlotItem = ({ listing }: { listing: FoodListingWithSources }) => {
    const foodEmoji =
      listing.tags?.includes('Japanese') ? '🍜' :
      listing.tags?.includes('Chinese') ? '🥢' :
      listing.tags?.includes('Korean') ? '🍲' :
      listing.tags?.includes('Western') ? '🍔' :
      listing.tags?.includes('Malay') || listing.tags?.includes('Halal') ? '🍛' :
      '🍽️';

    return (
      <div className="text-center py-2">
        <div className="text-3xl mb-1">{foodEmoji}</div>
        <div className="text-xs font-semibold text-gray-800 truncate px-1">
          {listing.name}
        </div>
      </div>
    );
  };

  const WinnerCard = () => {
    if (!winner) return null;

    const michelinSource = winner.sources?.find(s => getMichelinBadge(s.source.id));
    const michelinBadge = michelinSource ? getMichelinBadge(michelinSource.source.id) : null;
    const distance = formatDistance(winner.distance_to_station);
    const walkTime = formatWalkTime(winner.distance_to_station);

    return (
      <div className="mt-4 bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
        <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-3 text-center">
          <p className="text-white text-sm font-medium">🎉 You&apos;re eating at...</p>
        </div>

        <div className="p-4">
          <div className="text-center mb-3">
            <h3 className="font-bold text-lg text-gray-900">{winner.name}</h3>
          </div>

          {michelinBadge && (
            <div className="flex justify-center mb-2">
              <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
                {michelinBadge}
              </span>
            </div>
          )}

          {winner.tags && winner.tags.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1 mb-3">
              {winner.tags.slice(0, 3).map((tag, i) => (
                <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {(distance || walkTime) && (
            <div className="text-center text-sm text-gray-500 mb-3">
              <span className="inline-flex items-center gap-1">
                <span>📍</span> {distance} {walkTime && `· ${walkTime}`}
              </span>
            </div>
          )}

          {winner.address && (
            <p className="text-xs text-gray-400 text-center mb-4 line-clamp-2">
              {winner.address}
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={spin}
              className="flex-1 py-2 px-3 bg-gray-100 hover:bg-gray-200
                         text-gray-700 font-medium text-sm rounded-lg
                         transition-colors duration-200
                         flex items-center justify-center gap-1"
            >
              <span>🔄</span>
              <span>Spin Again</span>
            </button>

            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(winner.name + ' ' + (winner.address || 'Singapore'))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2 px-3 bg-gradient-to-r from-green-500 to-emerald-500
                         hover:from-green-600 hover:to-emerald-600
                         text-white font-medium text-sm rounded-lg
                         shadow-md hover:shadow-lg
                         transition-all duration-200
                         flex items-center justify-center gap-1"
            >
              <span>🚀</span>
              <span>Let&apos;s Go!</span>
            </a>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4 mb-3">
      <h3 className="text-center text-lg font-bold text-amber-600 mb-3">
        🎰 Can&apos;t Decide? Spin the Wheel!
      </h3>

      <div className="bg-white rounded-lg p-4 shadow-inner mb-4">
        <div className={`grid grid-cols-3 gap-2 ${isSpinning ? 'animate-pulse' : ''}`}>
          {slots.map((listing, idx) => (
            <div
              key={idx}
              className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 border-gray-300 overflow-hidden"
            >
              <SlotItem listing={listing} />
            </div>
          ))}
        </div>
      </div>

      {!winner && (
        <button
          onClick={spin}
          disabled={listings.length === 0 || isSpinning}
          className="w-full py-3 px-4 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500
                     hover:from-amber-500 hover:via-orange-500 hover:to-amber-600
                     text-white font-semibold text-base rounded-lg
                     shadow-md hover:shadow-lg
                     transform hover:scale-[1.02] active:scale-[0.98]
                     transition-all duration-200
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSpinning ? '🎰 Spinning...' : '🎰 Spin Now!'}
        </button>
      )}

      {winner && <WinnerCard />}
    </div>
  );
}
