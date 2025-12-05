'use client';

import { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { FoodListingWithSources } from '@/types/database';

interface CardShuffleGameProps {
  listings: FoodListingWithSources[];
  onSelectWinner: (listing: FoodListingWithSources) => void;
  onClose: () => void;
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

export default function CardShuffleGame({ listings, onSelectWinner, onClose }: CardShuffleGameProps) {
  const [phase, setPhase] = useState<'shuffling' | 'picking' | 'revealed'>('shuffling');
  const [cardPositions, setCardPositions] = useState<number[]>([0, 1, 2, 3, 4]);
  const [winner, setWinner] = useState<FoodListingWithSources | null>(null);
  const [shuffleCount, setShuffleCount] = useState(0);

  const fireConfetti = useCallback(() => {
    const count = 200;
    const defaults = { origin: { y: 0.7 }, zIndex: 9999 };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({ ...defaults, ...opts, particleCount: Math.floor(count * particleRatio) });
    }

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
  }, []);

  const vibrate = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([100, 50, 200]);
    }
  }, []);

  // Shuffle animation
  useEffect(() => {
    if (phase !== 'shuffling') return;

    const totalShuffles = 12;
    const shuffleInterval = setInterval(() => {
      setShuffleCount(prev => {
        if (prev >= totalShuffles) {
          clearInterval(shuffleInterval);
          setPhase('picking');
          return prev;
        }
        // Randomly shuffle positions
        setCardPositions(prev => {
          const newPositions = [...prev];
          for (let i = newPositions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newPositions[i], newPositions[j]] = [newPositions[j], newPositions[i]];
          }
          return newPositions;
        });
        return prev + 1;
      });
    }, 250);

    return () => clearInterval(shuffleInterval);
  }, [phase]);

  const handleCardClick = () => {
    if (phase !== 'picking') return;

    // Pick a random winner from listings
    const randomIndex = Math.floor(Math.random() * listings.length);
    const selectedWinner = listings[randomIndex];
    setWinner(selectedWinner);

    setPhase('revealed');
    fireConfetti();
    vibrate();
    onSelectWinner(selectedWinner);
  };

  const handleDrawAgain = () => {
    setPhase('shuffling');
    setWinner(null);
    setShuffleCount(0);
    setCardPositions([0, 1, 2, 3, 4]);
  };

  // Card back design
  const CardBack = ({ index, onClick, isShuffling }: { index: number; onClick?: () => void; isShuffling: boolean }) => {
    const position = cardPositions[index];

    return (
      <div
        onClick={onClick}
        className={`
          relative w-20 h-28 sm:w-24 sm:h-32 rounded-lg cursor-pointer
          transform transition-all duration-300 ease-in-out
          ${isShuffling ? 'hover:scale-100' : 'hover:scale-110 hover:-translate-y-2'}
          ${onClick ? 'cursor-pointer' : 'cursor-default'}
        `}
        style={{
          transform: isShuffling
            ? `translateX(${(position - 2) * 10}px) rotate(${(position - 2) * 3}deg)`
            : undefined,
        }}
      >
        {/* Card shadow */}
        <div className="absolute inset-0 bg-black/20 rounded-lg transform translate-x-1 translate-y-1" />

        {/* Card body */}
        <div className="relative w-full h-full bg-gradient-to-br from-red-700 via-red-600 to-red-800 rounded-lg border-2 border-red-900 overflow-hidden">
          {/* Inner border */}
          <div className="absolute inset-1 border border-yellow-500/50 rounded-md" />

          {/* Diamond pattern */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute inset-0" style={{
              backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,215,0,0.1) 8px, rgba(255,215,0,0.1) 16px)`,
            }} />
          </div>

          {/* Center design */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-3xl sm:text-4xl">?</div>
          </div>

          {/* Corner designs */}
          <div className="absolute top-1 left-1 text-yellow-400 text-xs font-bold">MRT</div>
          <div className="absolute bottom-1 right-1 text-yellow-400 text-xs font-bold rotate-180">MRT</div>
        </div>
      </div>
    );
  };

  // Revealed card with winner info
  const RevealedCard = () => {
    if (!winner) return null;

    const michelinSource = winner.sources?.find(s => getMichelinBadge(s.source.id));
    const michelinBadge = michelinSource ? getMichelinBadge(michelinSource.source.id) : null;
    const distance = formatDistance(winner.distance_to_station);
    const walkTime = formatWalkTime(winner.distance_to_station);

    return (
      <div className="relative w-64 sm:w-72 bg-white rounded-xl shadow-2xl overflow-hidden animate-flip-in">
        {/* Card header */}
        <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-3 text-center">
          <p className="text-white text-sm font-medium">You&apos;re eating at...</p>
        </div>

        {/* Card content */}
        <div className="p-4">
          {/* Food emoji and name */}
          <div className="text-center mb-3">
            <span className="text-4xl mb-2 block">
              {winner.tags?.includes('Japanese') ? '🍜' :
               winner.tags?.includes('Chinese') ? '🥢' :
               winner.tags?.includes('Korean') ? '🍲' :
               winner.tags?.includes('Western') ? '🍔' :
               winner.tags?.includes('Malay') || winner.tags?.includes('Halal') ? '🍛' :
               '🍽️'}
            </span>
            <h3 className="font-bold text-lg text-gray-900">{winner.name}</h3>
          </div>

          {/* Badges */}
          {michelinBadge && (
            <div className="flex justify-center mb-2">
              <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
                {michelinBadge}
              </span>
            </div>
          )}

          {/* Tags */}
          {winner.tags && winner.tags.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1 mb-3">
              {winner.tags.slice(0, 3).map((tag, i) => (
                <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Distance info */}
          {(distance || walkTime) && (
            <div className="text-center text-sm text-gray-500 mb-3">
              <span className="inline-flex items-center gap-1">
                <span>📍</span> {distance} {walkTime && `· ${walkTime}`}
              </span>
            </div>
          )}

          {/* Address */}
          {winner.address && (
            <p className="text-xs text-gray-400 text-center mb-4 line-clamp-2">
              {winner.address}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleDrawAgain}
              className="flex-1 py-2 px-3 bg-gray-100 hover:bg-gray-200
                         text-gray-700 font-medium text-sm rounded-lg
                         transition-colors duration-200
                         flex items-center justify-center gap-1"
            >
              <span>🔄</span>
              <span>Draw Again</span>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Game container */}
      <div className="relative w-full max-w-lg mx-4">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 z-10 w-10 h-10 bg-white/10 hover:bg-white/20
                     rounded-full flex items-center justify-center text-white text-xl
                     transition-colors duration-200"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Gambling board background */}
        <div className="relative bg-gradient-to-b from-green-800 via-green-700 to-green-900
                        rounded-2xl p-6 sm:p-8 shadow-2xl border-4 border-amber-600">
          {/* Felt texture overlay */}
          <div className="absolute inset-0 rounded-2xl opacity-20"
               style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.5\'/%3E%3C/svg%3E")' }}
          />

          {/* Inner border */}
          <div className="absolute inset-3 border-2 border-amber-500/30 rounded-xl pointer-events-none" />

          {/* Title */}
          <div className="text-center mb-6 relative">
            <h2 className="text-2xl sm:text-3xl font-bold text-amber-400 drop-shadow-lg">
              {phase === 'shuffling' ? '🃏 Shuffling...' :
               phase === 'picking' ? '👆 Pick a Card!' :
               '🎉 Winner!'}
            </h2>
            {phase === 'picking' && (
              <p className="text-amber-200/80 text-sm mt-1">Choose your destiny!</p>
            )}
          </div>

          {/* Cards area */}
          <div className="relative min-h-[180px] flex items-center justify-center">
            {phase !== 'revealed' ? (
              <div className="flex gap-2 sm:gap-3 justify-center">
                {[0, 1, 2, 3, 4].map((index) => (
                  <CardBack
                    key={index}
                    index={index}
                    onClick={phase === 'picking' ? handleCardClick : undefined}
                    isShuffling={phase === 'shuffling'}
                  />
                ))}
              </div>
            ) : (
              <RevealedCard />
            )}
          </div>

          {/* Decorative elements */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
            <span className="text-amber-500/40 text-xl">♠</span>
            <span className="text-red-500/40 text-xl">♥</span>
            <span className="text-amber-500/40 text-xl">♣</span>
            <span className="text-red-500/40 text-xl">♦</span>
          </div>
        </div>
      </div>

    </div>
  );
}
