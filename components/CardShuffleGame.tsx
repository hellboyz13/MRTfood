'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { FoodListingWithSources } from '@/types/database';
import { getMapsUrl } from '@/lib/distance';

interface CardShuffleGameProps {
  listings: FoodListingWithSources[];
  onSelectWinner: (listing: FoodListingWithSources) => void;
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

// Dot patterns for cards (like dice)
const dotPatterns: { [key: number]: { x: number; y: number }[] } = {
  1: [{ x: 50, y: 50 }],
  2: [{ x: 25, y: 25 }, { x: 75, y: 75 }],
  3: [{ x: 25, y: 25 }, { x: 50, y: 50 }, { x: 75, y: 75 }],
  4: [{ x: 25, y: 25 }, { x: 75, y: 25 }, { x: 25, y: 75 }, { x: 75, y: 75 }],
  5: [{ x: 25, y: 25 }, { x: 75, y: 25 }, { x: 50, y: 50 }, { x: 25, y: 75 }, { x: 75, y: 75 }],
};

// Card positions (spread horizontally)
const cardPositions = [
  { x: 0, y: 0 },
  { x: 70, y: 0 },
  { x: 140, y: 0 },
  { x: 210, y: 0 },
  { x: 280, y: 0 },
];

export default function CardShuffleGame({ listings, onSelectWinner, onClose }: CardShuffleGameProps) {
  const [phase, setPhase] = useState<'idle' | 'shuffling' | 'picking' | 'revealed'>('idle');
  const [positions, setPositions] = useState<number[]>([0, 1, 2, 3, 4]); // Which position each card is at
  const [winner, setWinner] = useState<FoodListingWithSources | null>(null);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const shuffleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Start shuffling
  const startShuffle = useCallback(() => {
    setPhase('shuffling');
    setWinner(null);
    setSelectedCard(null);

    let shuffleCount = 0;
    const totalShuffles = 15;

    const doShuffle = () => {
      if (shuffleCount >= totalShuffles) {
        setPhase('picking');
        return;
      }

      // Swap two random cards
      setPositions(prev => {
        const newPositions = [...prev];
        const i = Math.floor(Math.random() * 5);
        let j = Math.floor(Math.random() * 5);
        while (j === i) j = Math.floor(Math.random() * 5);
        [newPositions[i], newPositions[j]] = [newPositions[j], newPositions[i]];
        return newPositions;
      });

      shuffleCount++;
      const delay = shuffleCount < 5 ? 150 : shuffleCount < 10 ? 200 : 300;
      shuffleTimeoutRef.current = setTimeout(doShuffle, delay);
    };

    doShuffle();
  }, []);

  useEffect(() => {
    return () => {
      if (shuffleTimeoutRef.current) {
        clearTimeout(shuffleTimeoutRef.current);
      }
    };
  }, []);

  const handleCardClick = (cardIndex: number) => {
    if (phase !== 'picking') return;

    setSelectedCard(cardIndex);

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
    setPositions([0, 1, 2, 3, 4]);
    startShuffle();
  };

  // White card with dots
  const Card = ({ cardNumber, positionIndex, onClick, isSelected }: {
    cardNumber: number;
    positionIndex: number;
    onClick?: () => void;
    isSelected?: boolean;
  }) => {
    const pos = cardPositions[positionIndex];
    const dots = dotPatterns[cardNumber];

    return (
      <div
        onClick={onClick}
        className={`
          absolute w-16 h-24 sm:w-20 sm:h-28 rounded-lg
          transition-all duration-300 ease-out
          ${phase === 'picking' ? 'cursor-pointer hover:scale-110 hover:-translate-y-2 hover:shadow-xl' : ''}
          ${isSelected ? 'ring-4 ring-amber-400 scale-110 -translate-y-2' : ''}
        `}
        style={{
          left: `${pos.x}px`,
          top: `${pos.y}px`,
          zIndex: isSelected ? 10 : 1,
        }}
      >
        {/* Card shadow */}
        <div className="absolute inset-0 bg-black/20 rounded-lg transform translate-x-1 translate-y-1" />

        {/* Card body - white with subtle gradient */}
        <div className="relative w-full h-full bg-gradient-to-br from-white to-gray-100 rounded-lg border-2 border-gray-300 shadow-md overflow-hidden">
          {/* Dots */}
          {dots.map((dot, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 sm:w-4 sm:h-4 bg-gray-800 rounded-full"
              style={{
                left: `${dot.x}%`,
                top: `${dot.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          ))}
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
      <div className="bg-white rounded-xl shadow-lg overflow-hidden animate-flip-in border border-gray-200">
        {/* Card header */}
        <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-3 text-center">
          <p className="text-white text-sm font-medium">🎉 You&apos;re eating at...</p>
        </div>

        {/* Card content */}
        <div className="p-4">
          {/* Food emoji and name */}
          <div className="text-center mb-3">
            <span className="text-3xl mb-2 block">
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
              <span>Again</span>
            </button>

            <a
              href={getMapsUrl(winner.name, winner.landmark, winner.address)}
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
    <div className="bg-gradient-to-br from-green-700 via-green-600 to-green-800 rounded-xl p-4 sm:p-6 shadow-lg border-2 border-amber-500/50">
      {/* Title */}
      <div className="text-center mb-4">
        <h3 className="text-lg sm:text-xl font-bold text-amber-300">
          {phase === 'idle' ? '🃏 Pick a Card Game' :
           phase === 'shuffling' ? '🔀 Shuffling...' :
           phase === 'picking' ? '👆 Pick a Card!' :
           '🎉 Winner!'}
        </h3>
        {phase === 'idle' && (
          <p className="text-amber-200/70 text-sm mt-1">Let fate decide your meal!</p>
        )}
        {phase === 'picking' && (
          <p className="text-amber-200/70 text-sm mt-1">Choose your destiny!</p>
        )}
      </div>

      {/* Cards area */}
      <div className="relative min-h-[140px] sm:min-h-[160px] flex items-center justify-center mb-4">
        {phase !== 'revealed' ? (
          <div className="relative" style={{ width: '350px', height: '112px' }}>
            {[1, 2, 3, 4, 5].map((cardNum, index) => (
              <Card
                key={cardNum}
                cardNumber={cardNum}
                positionIndex={positions[index]}
                onClick={phase === 'picking' ? () => handleCardClick(index) : undefined}
                isSelected={selectedCard === index}
              />
            ))}
          </div>
        ) : (
          <RevealedCard />
        )}
      </div>

      {/* Start/Close buttons */}
      {phase === 'idle' && (
        <div className="flex gap-2">
          <button
            onClick={startShuffle}
            disabled={listings.length === 0}
            className="flex-1 py-2 px-4 bg-gradient-to-r from-amber-400 to-orange-500
                       hover:from-amber-500 hover:to-orange-600
                       text-white font-semibold text-sm rounded-lg
                       shadow-md hover:shadow-lg
                       transition-all duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🎴 Start Shuffle
          </button>
          <button
            onClick={onClose}
            className="py-2 px-4 bg-white/10 hover:bg-white/20
                       text-white font-medium text-sm rounded-lg
                       transition-colors duration-200"
          >
            ✕ Close
          </button>
        </div>
      )}

      {/* Decorative elements */}
      <div className="flex justify-center gap-2 mt-3 opacity-40">
        <span className="text-amber-400">♠</span>
        <span className="text-red-400">♥</span>
        <span className="text-amber-400">♣</span>
        <span className="text-red-400">♦</span>
      </div>
    </div>
  );
}
