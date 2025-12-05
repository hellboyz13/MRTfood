'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { FoodListingWithSources } from '@/types/database';

interface SlotMachineProps {
  listings: FoodListingWithSources[];
  onSelectWinner: (listing: FoodListingWithSources) => void;
}

// Get Michelin badge text
function getMichelinBadge(sourceId: string): string | null {
  if (sourceId === 'michelin-3-star') return '⭐⭐⭐ 3 Michelin Stars';
  if (sourceId === 'michelin-2-star') return '⭐⭐ 2 Michelin Stars';
  if (sourceId === 'michelin-1-star') return '⭐ 1 Michelin Star';
  if (sourceId === 'michelin-bib-gourmand') return '🍽️ Bib Gourmand';
  return null;
}

// Format distance
function formatDistance(meters: number | null): string {
  if (!meters) return '';
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

// Estimate walking time (avg 80m/min)
function formatWalkTime(meters: number | null): string {
  if (!meters) return '';
  const minutes = Math.ceil(meters / 80);
  return `${minutes} min`;
}

export default function SlotMachine({ listings, onSelectWinner }: SlotMachineProps) {
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'result'>('idle');
  const [winner, setWinner] = useState<FoodListingWithSources | null>(null);
  const [displayIndex, setDisplayIndex] = useState(0);
  const [spinSpeed, setSpinSpeed] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const spinIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (spinIntervalRef.current) {
        clearInterval(spinIntervalRef.current);
      }
    };
  }, []);

  // Fire confetti
  const fireConfetti = useCallback(() => {
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 9999,
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
  }, []);

  // Haptic feedback
  const vibrate = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([100, 50, 200]);
    }
  }, []);

  // Start spinning
  const startSpin = useCallback(() => {
    if (listings.length === 0) return;

    setPhase('spinning');
    setWinner(null);
    setSpinSpeed(50);

    // Pick a random winner ahead of time
    const winnerIndex = Math.floor(Math.random() * listings.length);
    const selectedWinner = listings[winnerIndex];

    let currentIndex = 0;
    let currentSpeed = 50;
    let elapsed = 0;
    const totalDuration = 2500; // 2.5 seconds

    // Clear any existing interval
    if (spinIntervalRef.current) {
      clearInterval(spinIntervalRef.current);
    }

    const tick = () => {
      elapsed += currentSpeed;

      // Move to next item
      currentIndex = (currentIndex + 1) % listings.length;
      setDisplayIndex(currentIndex);

      // Gradually slow down
      if (elapsed > 1000) {
        // After 1 second, start slowing
        const progress = (elapsed - 1000) / (totalDuration - 1000);
        currentSpeed = 50 + Math.floor(progress * 300); // 50ms -> 350ms
        setSpinSpeed(currentSpeed);
      }

      // Check if we should stop
      if (elapsed >= totalDuration) {
        if (spinIntervalRef.current) {
          clearInterval(spinIntervalRef.current);
          spinIntervalRef.current = null;
        }

        // Find the winner index and set display to it
        const finalIndex = listings.findIndex(l => l.id === selectedWinner.id);
        setDisplayIndex(finalIndex >= 0 ? finalIndex : winnerIndex);
        setWinner(selectedWinner);
        setPhase('result');

        // Effects
        fireConfetti();
        vibrate();
        onSelectWinner(selectedWinner);
        return;
      }

      // Schedule next tick with current speed
      spinIntervalRef.current = setTimeout(tick, currentSpeed);
    };

    // Start the spinning
    spinIntervalRef.current = setTimeout(tick, currentSpeed);
  }, [listings, fireConfetti, vibrate, onSelectWinner]);

  // Reset to idle
  const reset = useCallback(() => {
    setPhase('idle');
    setWinner(null);
  }, []);

  // Render idle state - the button
  if (phase === 'idle') {
    return (
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 mb-4">
        <div className="text-center mb-3">
          <span className="text-lg">😵</span>
          <p className="text-sm font-medium text-gray-700 mt-1">Can&apos;t decide what to eat?</p>
        </div>
        <button
          onClick={startSpin}
          disabled={listings.length === 0}
          className="w-full py-3 px-4 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500
                     hover:from-amber-500 hover:via-orange-500 hover:to-amber-600
                     text-white font-bold text-lg rounded-lg
                     shadow-lg shadow-amber-200/50 hover:shadow-xl hover:shadow-amber-300/50
                     transform hover:scale-[1.02] active:scale-[0.98]
                     transition-all duration-200
                     disabled:opacity-50 disabled:cursor-not-allowed
                     animate-pulse-subtle
                     flex items-center justify-center gap-2"
        >
          <span className="text-xl">🎰</span>
          <span>SPIN TO EAT</span>
        </button>
        {listings.length === 0 && (
          <p className="text-xs text-gray-500 text-center mt-2">No restaurants available</p>
        )}
      </div>
    );
  }

  // Render spinning state
  if (phase === 'spinning') {
    const currentListing = listings[displayIndex];
    return (
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 mb-4">
        <div className="text-center mb-3">
          <span className="text-2xl animate-bounce">🎰</span>
          <p className="text-sm font-medium text-gray-700 mt-1">Spinning...</p>
        </div>

        {/* Slot machine display */}
        <div
          ref={containerRef}
          className="relative h-16 bg-white rounded-lg border-2 border-amber-300 overflow-hidden shadow-inner"
        >
          {/* Gradient overlays for slot machine effect */}
          <div className="absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-white to-transparent z-10" />
          <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-white to-transparent z-10" />

          {/* Current item */}
          <div
            className="absolute inset-0 flex items-center justify-center px-4 transition-all"
            style={{
              animationDuration: `${spinSpeed}ms`,
            }}
          >
            <div className={`text-center ${spinSpeed < 100 ? 'blur-[1px]' : ''}`}>
              <p className="font-semibold text-gray-900 truncate">
                {currentListing?.name || 'Loading...'}
              </p>
              {currentListing?.description && (
                <p className="text-xs text-gray-500 truncate">
                  {currentListing.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render result state
  if (phase === 'result' && winner) {
    // Check for Michelin badge from sources array
    const michelinSource = winner.sources?.find(s => getMichelinBadge(s.source.id));
    const michelinBadge = michelinSource ? getMichelinBadge(michelinSource.source.id) : null;
    const distance = formatDistance(winner.distance_to_station);
    const walkTime = formatWalkTime(winner.distance_to_station);

    return (
      <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border-2 border-amber-300 rounded-xl p-4 mb-4 animate-winner-glow">
        {/* Header */}
        <div className="text-center mb-3">
          <p className="text-lg font-bold text-amber-700">
            🎉 YOU&apos;RE EATING AT 🎉
          </p>
        </div>

        {/* Winner card */}
        <div className="bg-white rounded-lg border border-amber-200 p-4 shadow-lg">
          <h3 className="font-bold text-lg text-gray-900 mb-1">
            🍜 {winner.name}
          </h3>

          {winner.description && (
            <p className="text-sm text-gray-600 mb-2">{winner.description}</p>
          )}

          {/* Badges */}
          <div className="space-y-1 mb-3">
            {michelinBadge && (
              <p className="text-sm font-medium text-amber-700">{michelinBadge}</p>
            )}
            {(distance || walkTime) && (
              <p className="text-sm text-gray-500">
                🚶 {distance} · {walkTime}
              </p>
            )}
          </div>

          {/* Address / Directions link */}
          {winner.address && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(winner.name + ' ' + winner.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              📍 Tap for directions
            </a>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={reset}
            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-amber-400 to-orange-400
                       hover:from-amber-500 hover:to-orange-500
                       text-white font-semibold rounded-lg
                       shadow-md hover:shadow-lg
                       transition-all duration-200
                       flex items-center justify-center gap-2"
          >
            <span>🎰</span>
            <span>Spin Again</span>
          </button>

          {winner.address && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(winner.name + ' ' + winner.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 px-4 bg-gradient-to-r from-green-500 to-emerald-500
                         hover:from-green-600 hover:to-emerald-600
                         text-white font-semibold rounded-lg
                         shadow-md hover:shadow-lg
                         transition-all duration-200
                         flex items-center justify-center gap-2"
            >
              <span>📍</span>
              <span>Let&apos;s Go!</span>
            </a>
          )}
        </div>
      </div>
    );
  }

  return null;
}
