'use client';

import { useState } from 'react';
import { FoodListingWithSources } from '@/types/database';
import CardShuffleGame from './CardShuffleGame';

interface SlotMachineProps {
  listings: FoodListingWithSources[];
  onSelectWinner: (listing: FoodListingWithSources) => void;
}

export default function SlotMachine({ listings, onSelectWinner }: SlotMachineProps) {
  const [showGame, setShowGame] = useState(false);

  if (showGame) {
    return (
      <CardShuffleGame
        listings={listings}
        onSelectWinner={onSelectWinner}
        onClose={() => setShowGame(false)}
      />
    );
  }

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-2 mb-3">
      <button
        onClick={() => setShowGame(true)}
        disabled={listings.length === 0}
        className="w-full py-2 px-3 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500
                   hover:from-amber-500 hover:via-orange-500 hover:to-amber-600
                   text-white font-semibold text-sm rounded-md
                   shadow-md shadow-amber-200/50 hover:shadow-lg hover:shadow-amber-300/50
                   transform hover:scale-[1.01] active:scale-[0.99]
                   transition-all duration-200
                   disabled:opacity-50 disabled:cursor-not-allowed
                   flex items-center justify-center gap-2"
      >
        <span>🃏</span>
        <span>Can&apos;t decide? Pick a card!</span>
      </button>
    </div>
  );
}
