'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { MallOutlet } from '@/types/database';

interface OutletSlotMachineProps {
  outlets: MallOutlet[];
  onClose: () => void;
}

export default function OutletSlotMachine({ outlets, onClose }: OutletSlotMachineProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentOutlet, setCurrentOutlet] = useState<MallOutlet | null>(null);
  const [winner, setWinner] = useState<MallOutlet | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const spinIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const spin = useCallback(() => {
    if (outlets.length === 0 || isSpinning) return;

    setIsSpinning(true);
    setWinner(null);
    setShowCelebration(false);

    let spinCount = 0;
    const maxSpins = 30;
    let currentSpeed = 50;

    spinIntervalRef.current = setInterval(() => {
      // Change outlet rapidly
      setCurrentOutlet(outlets[Math.floor(Math.random() * outlets.length)]);

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
        const randomWinner = outlets[Math.floor(Math.random() * outlets.length)];
        setCurrentOutlet(randomWinner);
        setWinner(randomWinner);
        setAnimationKey(prev => prev + 1);
        setIsSpinning(false);
        setShowCelebration(true);

        // Hide celebration after animation
        setTimeout(() => setShowCelebration(false), 1500);
      }
    }, currentSpeed);
  }, [outlets, isSpinning]);

  useEffect(() => {
    return () => {
      if (spinIntervalRef.current) {
        clearInterval(spinIntervalRef.current);
      }
    };
  }, []);

  // Render winner card content
  const renderWinnerCard = () => {
    if (!winner) return null;

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
          <div className="text-center mb-3">
            <h3 className="font-semibold text-lg text-[#2D2D2D] mb-1">{winner.name}</h3>
          </div>

          {winner.category && (
            <div className="flex justify-center mb-2">
              <span className="px-2 py-1 bg-[#FF6B4A] text-white text-xs font-medium rounded">
                {winner.category}
              </span>
            </div>
          )}

          {winner.price_range && (
            <div className="text-center text-xs text-[#757575] font-medium mb-3">
              <span className="text-green-600">{winner.price_range}</span>
              {winner.level && <span> • {winner.level}</span>}
            </div>
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

            <button
              onClick={onClose}
              className="flex-1 py-2 px-3 bg-[#FF6B4A] hover:bg-[#E55A3A]
                         text-white font-medium text-sm rounded
                         transition-colors duration-200 text-center"
            >
              Done
            </button>
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
                {isSpinning && currentOutlet ? currentOutlet.name : 'Ready to spin!'}
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
            disabled={outlets.length === 0 || isSpinning}
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
