'use client';

import { useState, useEffect } from 'react';
import Snowfall from 'react-snowfall';

// Christmas lights component
function ChristmasLights() {
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] pointer-events-none overflow-hidden">
      <div className="flex justify-center">
        <div className="christmas-lights">
          {Array.from({ length: 30 }).map((_, i) => (
            <span
              key={i}
              className="light"
              style={{
                '--i': i,
                '--color': ['#ff0000', '#00ff00', '#ffff00', '#ff00ff', '#00ffff', '#ff8800'][i % 6],
              } as React.CSSProperties}
            />
          ))}
        </div>
      </div>
      <style jsx>{`
        .christmas-lights {
          display: flex;
          gap: 25px;
          padding: 10px 20px;
        }
        .light {
          width: 12px;
          height: 18px;
          background: var(--color);
          border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
          position: relative;
          box-shadow:
            0 0 10px var(--color),
            0 0 20px var(--color),
            0 0 30px var(--color);
          animation: glow 1s ease-in-out infinite;
          animation-delay: calc(var(--i) * 0.1s);
        }
        .light::before {
          content: '';
          position: absolute;
          top: -6px;
          left: 50%;
          transform: translateX(-50%);
          width: 6px;
          height: 6px;
          background: #444;
          border-radius: 2px;
        }
        .light::after {
          content: '';
          position: absolute;
          top: -10px;
          left: 50%;
          width: 30px;
          height: 8px;
          border-bottom: 2px solid #228B22;
          border-radius: 0 0 50% 50%;
          transform: translateX(-50%);
        }
        @keyframes glow {
          0%, 100% {
            opacity: 1;
            filter: brightness(1);
          }
          50% {
            opacity: 0.6;
            filter: brightness(0.7);
          }
        }
      `}</style>
    </div>
  );
}

// Festive corner decorations
function CornerDecorations() {
  return (
    <>
      {/* Top left holly */}
      <div className="fixed top-2 left-2 z-[99] pointer-events-none text-2xl animate-bounce-slow">
        🎄
      </div>
      {/* Top right candy cane */}
      <div className="fixed top-2 right-2 z-[99] pointer-events-none text-2xl animate-bounce-slow" style={{ animationDelay: '0.5s' }}>
        🎅
      </div>
      <style jsx>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}

export default function ChristmasDecorations() {
  const [mounted, setMounted] = useState(false);
  const [showDecorations, setShowDecorations] = useState(true);

  useEffect(() => {
    setMounted(true);
    // Check localStorage for user preference
    const saved = localStorage.getItem('christmas-decorations');
    if (saved === 'false') {
      setShowDecorations(false);
    }
  }, []);

  const toggleDecorations = () => {
    const newValue = !showDecorations;
    setShowDecorations(newValue);
    localStorage.setItem('christmas-decorations', String(newValue));
  };

  if (!mounted) return null;

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={toggleDecorations}
        className="fixed bottom-20 right-4 z-[101] w-10 h-10 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 border border-gray-200"
        aria-label={showDecorations ? 'Turn off Christmas decorations' : 'Turn on Christmas decorations'}
        title={showDecorations ? 'Turn off decorations' : 'Turn on decorations'}
      >
        <span className="text-lg">{showDecorations ? '🎄' : '❄️'}</span>
      </button>

      {showDecorations && (
        <>
          {/* Snowfall effect */}
          <Snowfall
            color="white"
            snowflakeCount={100}
            style={{
              position: 'fixed',
              width: '100vw',
              height: '100vh',
              zIndex: 98,
              pointerEvents: 'none',
            }}
            speed={[0.5, 1.5]}
            wind={[-0.5, 1]}
            radius={[1, 4]}
          />

          {/* Christmas lights at the top */}
          <ChristmasLights />

          {/* Corner decorations */}
          <CornerDecorations />
        </>
      )}
    </>
  );
}
