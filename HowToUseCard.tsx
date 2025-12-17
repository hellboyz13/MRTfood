'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Search, SlidersHorizontal } from 'lucide-react';

export default function HowToUseCard() {
  const [show, setShow] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const ropeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hasVisited = localStorage.getItem('mrtfoodie_visited');
    if (!hasVisited) {
      setShow(true);
    }
  }, []);

  useEffect(() => {
    if (show && containerRef.current && backdropRef.current && ropeRef.current) {
      // Backdrop fade in
      backdropRef.current.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        { duration: 400, fill: 'forwards' }
      );

      // Container drop with 3 bounces
      containerRef.current.animate(
        [
          { transform: 'translateY(-100vh) rotate(0deg)' },
          { transform: 'translateY(30px) rotate(2deg)', offset: 0.35 },
          { transform: 'translateY(-100px) rotate(-1.5deg)', offset: 0.50 },
          { transform: 'translateY(15px) rotate(1deg)', offset: 0.65 },
          { transform: 'translateY(-45px) rotate(-0.5deg)', offset: 0.78 },
          { transform: 'translateY(5px) rotate(0.2deg)', offset: 0.88 },
          { transform: 'translateY(-15px) rotate(0deg)', offset: 0.94 },
          { transform: 'translateY(0) rotate(0deg)' }
        ],
        { duration: 1400, easing: 'cubic-bezier(0.22, 0, 0.36, 1)', fill: 'forwards' }
      );

      // Rope extend with bounce
      ropeRef.current.animate(
        [
          { height: '0px' },
          { height: '110px', offset: 0.35 },
          { height: '50px', offset: 0.50 },
          { height: '100px', offset: 0.65 },
          { height: '60px', offset: 0.78 },
          { height: '85px', offset: 0.88 },
          { height: '72px', offset: 0.94 },
          { height: '80px' }
        ],
        { duration: 1400, easing: 'cubic-bezier(0.22, 0, 0.36, 1)', fill: 'forwards' }
      );
    }
  }, [show]);

  const handleDismiss = () => {
    if (containerRef.current && backdropRef.current && ropeRef.current) {
      // Backdrop fade out
      backdropRef.current.animate(
        [{ opacity: 1 }, { opacity: 0 }],
        { duration: 400, fill: 'forwards' }
      );

      // Container retract up
      containerRef.current.animate(
        [
          { transform: 'translateY(0)' },
          { transform: 'translateY(-120vh)' }
        ],
        { duration: 400, easing: 'cubic-bezier(0.55, 0, 1, 0.45)', fill: 'forwards' }
      );

      // Rope retract
      ropeRef.current.animate(
        [{ height: '80px' }, { height: '0px' }],
        { duration: 400, easing: 'cubic-bezier(0.55, 0, 1, 0.45)', fill: 'forwards' }
      );

      setTimeout(() => {
        localStorage.setItem('mrtfoodie_visited', 'true');
        setShow(false);
      }, 450);
    }
  };

  if (!show) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        ref={backdropRef}
        onClick={handleDismiss}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 9998,
          opacity: 0
        }}
      />

      {/* Container */}
      <div
        ref={containerRef}
        style={{
          position: 'fixed',
          top: 100,
          left: '50%',
          marginLeft: -200,
          width: 400,
          maxWidth: '90vw',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          transformOrigin: 'top center',
          transform: 'translateY(-100vh)'
        }}
      >
        {/* Rope */}
        <div style={{
          position: 'absolute',
          top: -110,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 1
        }}>
          {/* Ceiling hook */}
          <svg width="30" height="24" viewBox="0 0 30 24" fill="none">
            <rect x="10" y="0" width="10" height="6" rx="2" fill="#5a5a5a"/>
            <path d="M15 6 L15 10 Q15 16 20 16 Q26 16 26 20 Q26 24 15 24" stroke="#6a6a6a" strokeWidth="4" fill="none" strokeLinecap="round"/>
            <path d="M15 6 L15 10 Q15 16 20 16 Q26 16 26 20" stroke="#8a8a8a" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          </svg>
          {/* Rope */}
          <div
            ref={ropeRef}
            style={{
              width: 5,
              height: 0,
              background: 'repeating-linear-gradient(180deg, #8B7355 0px, #A0896C 3px, #8B7355 6px, #6B5344 9px, #8B7355 12px)',
              borderRadius: 2,
              boxShadow: '2px 0 3px rgba(0,0,0,0.3), -1px 0 2px rgba(0,0,0,0.2)'
            }}
          />
        </div>

        {/* Card hook attachment */}
        <div style={{
          width: 44,
          height: 22,
          background: 'linear-gradient(180deg, #D4A020 0%, #8B7355 50%, #6B5344 100%)',
          borderRadius: '8px 8px 0 0',
          marginBottom: -4,
          position: 'relative',
          boxShadow: '0 -2px 4px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.2)',
          zIndex: 2
        }}>
          <div style={{
            position: 'absolute',
            top: 5,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 14,
            height: 14,
            background: 'radial-gradient(circle at 30% 30%, #3a3a3a, #1a1a1a)',
            borderRadius: '50%',
            border: '2px solid #8B7355',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)'
          }} />
        </div>

        {/* Card */}
        <div style={{
          backgroundColor: '#E8B931',
          borderRadius: 24,
          padding: '28px 24px 24px',
          fontFamily: '"Fredoka", sans-serif',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3), 0 8px 20px rgba(0,0,0,0.2)',
          border: '4px solid #1a1a1a',
          position: 'relative',
          overflow: 'hidden',
          width: '100%'
        }}>
          {/* Decorative circles */}
          <div style={{
            position: 'absolute',
            top: -20,
            right: -20,
            width: 80,
            height: 80,
            borderRadius: '50%',
            backgroundColor: '#F5D251',
            opacity: 0.6
          }} />
          <div style={{
            position: 'absolute',
            bottom: -30,
            left: -30,
            width: 100,
            height: 100,
            borderRadius: '50%',
            backgroundColor: '#D4A020',
            opacity: 0.4
          }} />

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 20, position: 'relative' }}>
            <h2 style={{
              fontSize: 26,
              fontWeight: 700,
              color: '#1a1a1a',
              margin: 0,
              letterSpacing: -0.5
            }}>MRT Foodie</h2>
            <p style={{
              fontSize: 14,
              color: '#4a4a4a',
              margin: '6px 0 0',
              fontWeight: 500
            }}>Your curated food map</p>
          </div>

          {/* Instructions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'relative' }}>
            <InstructionRow icon={<MapPin size={22} strokeWidth={2.5} />} text="Tap any MRT station to discover nearby eats" />
            <InstructionRow icon={<Search size={22} strokeWidth={2.5} />} text="Search for food like 'pizza', 'ramen' or restaurant names" />
            <InstructionRow icon={<SlidersHorizontal size={22} strokeWidth={2.5} />} text="Filter by Dessert and Supper" />

            {/* Sources */}
            <div style={{
              backgroundColor: '#1a1a1a',
              borderRadius: 12,
              padding: '12px 16px',
              marginTop: 4
            }}>
              <p style={{
                fontSize: 12,
                color: '#E8B931',
                margin: '0 0 8px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 1
              }}>✨ Curated Sources</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {['Michelin Guide', 'Eatbook', 'Burpple', 'Seth Lui', 'GetFed'].map((source) => (
                  <span key={source} style={{
                    backgroundColor: '#E8B931',
                    color: '#1a1a1a',
                    padding: '4px 10px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 600
                  }}>{source}</span>
                ))}
                <span style={{ color: '#888', padding: '4px 6px', fontSize: 11, fontWeight: 500 }}>+more</span>
              </div>
            </div>
          </div>

          {/* Button */}
          <button
            onClick={handleDismiss}
            style={{
              width: '100%',
              marginTop: 20,
              padding: '14px 24px',
              backgroundColor: '#1a1a1a',
              color: '#E8B931',
              border: 'none',
              borderRadius: 14,
              fontSize: 16,
              fontWeight: 700,
              fontFamily: '"Fredoka", sans-serif',
              cursor: 'pointer'
            }}
          >
            Let&apos;s Eat!
          </button>

          <p style={{
            textAlign: 'center',
            fontSize: 10,
            color: '#6a6a6a',
            margin: '16px 0 0',
            fontWeight: 500
          }}>© {new Date().getFullYear()} MRT Foodie • All rights reserved</p>
        </div>
      </div>
    </>
  );
}

function InstructionRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      backgroundColor: 'rgba(255,255,255,0.5)',
      padding: '12px 14px',
      borderRadius: 12
    }}>
      <span style={{ flexShrink: 0, color: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </span>
      <span style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', lineHeight: 1.4 }}>
        {text}
      </span>
    </div>
  );
}
