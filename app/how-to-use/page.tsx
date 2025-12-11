'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, Search, SlidersHorizontal } from 'lucide-react';

export default function HowToUsePage() {
  const [show, setShow] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const ropeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Trigger entrance animation after mount
    setTimeout(() => setShow(true), 100);
  }, []);

  // Trigger animations when show becomes true
  useEffect(() => {
    if (show && !isExiting) {
      // Animate container drop with bounce
      containerRef.current?.animate(
        [
          { transform: 'translateY(-100vh) rotate(0deg)' },
          { transform: 'translateY(30px) rotate(2deg)' },
          { transform: 'translateY(-100px) rotate(-1.5deg)' },
          { transform: 'translateY(15px) rotate(1deg)' },
          { transform: 'translateY(-45px) rotate(-0.5deg)' },
          { transform: 'translateY(5px) rotate(0.2deg)' },
          { transform: 'translateY(-15px) rotate(0deg)' },
          { transform: 'translateY(0) rotate(0deg)' },
        ],
        { duration: 1400, easing: 'cubic-bezier(0.22, 0, 0.36, 1)', fill: 'forwards' }
      );

      // Animate rope extend
      ropeRef.current?.animate(
        [
          { height: '0px' },
          { height: '110px' },
          { height: '50px' },
          { height: '100px' },
          { height: '60px' },
          { height: '85px' },
          { height: '72px' },
          { height: '80px' },
        ],
        { duration: 1400, easing: 'cubic-bezier(0.22, 0, 0.36, 1)', fill: 'forwards' }
      );
    }
  }, [show, isExiting]);

  const handleBack = () => {
    setIsExiting(true);

    // Animate container - stretch down first, then retract up
    containerRef.current?.animate(
      [
        { transform: 'translateY(0)', offset: 0 },
        { transform: 'translateY(40px)', offset: 0.15 },
        { transform: 'translateY(-120vh)', offset: 1 },
      ],
      { duration: 500, easing: 'cubic-bezier(0.55, 0, 1, 0.45)', fill: 'forwards' }
    );

    // Animate rope - extend slightly, then retract
    ropeRef.current?.animate(
      [
        { height: '80px', offset: 0 },
        { height: '110px', offset: 0.15 },
        { height: '0px', offset: 1 },
      ],
      { duration: 500, easing: 'cubic-bezier(0.55, 0, 1, 0.45)', fill: 'forwards' }
    );

    setTimeout(() => {
      window.location.href = '/';
    }, 550);
  };

  if (!show) return <main className="min-h-screen bg-white" />;

  const styles = {
    outerContainer: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      pointerEvents: 'none' as const,
    },
    container: {
      width: '100%',
      maxWidth: '400px',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      transformOrigin: 'top center',
      transform: 'translateY(-100vh)',
      pointerEvents: 'auto' as const,
    },
    ropeContainer: {
      position: 'absolute' as const,
      top: '-110px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      zIndex: 1,
    },
    rope: {
      width: '5px',
      height: '0px',
      background: 'repeating-linear-gradient(180deg, #8B7355 0px, #A0896C 3px, #8B7355 6px, #6B5344 9px, #8B7355 12px)',
      borderRadius: '2px',
      boxShadow: '2px 0 3px rgba(0,0,0,0.3), -1px 0 2px rgba(0,0,0,0.2)',
    },
    ceilingHook: {
      width: '30px',
      height: '24px',
      marginBottom: '-4px',
    },
    cardHook: {
      width: '44px',
      height: '22px',
      background: 'linear-gradient(180deg, #D4A020 0%, #8B7355 50%, #6B5344 100%)',
      borderRadius: '8px 8px 0 0',
      marginBottom: '-4px',
      position: 'relative' as const,
      boxShadow: '0 -2px 4px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.2)',
      zIndex: 2,
    },
    cardHookHole: {
      position: 'absolute' as const,
      top: '5px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '14px',
      height: '14px',
      background: 'radial-gradient(circle at 30% 30%, #3a3a3a, #1a1a1a)',
      borderRadius: '50%',
      border: '2px solid #8B7355',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)',
    },
    card: {
      backgroundColor: '#E8B931',
      borderRadius: '24px',
      padding: '28px 24px 24px',
      fontFamily: "'Fredoka', sans-serif",
      boxShadow: '0 20px 60px rgba(0,0,0,0.3), 0 8px 20px rgba(0,0,0,0.2)',
      border: '4px solid #1a1a1a',
      position: 'relative' as const,
      overflow: 'hidden',
      width: '100%',
    },
    circle1: {
      position: 'absolute' as const,
      top: '-20px',
      right: '-20px',
      width: '80px',
      height: '80px',
      borderRadius: '50%',
      backgroundColor: '#F5D251',
      opacity: 0.6,
    },
    circle2: {
      position: 'absolute' as const,
      bottom: '-30px',
      left: '-30px',
      width: '100px',
      height: '100px',
      borderRadius: '50%',
      backgroundColor: '#D4A020',
      opacity: 0.4,
    },
    header: {
      textAlign: 'center' as const,
      marginBottom: '20px',
      position: 'relative' as const,
    },
    title: {
      fontSize: '26px',
      fontWeight: 700,
      color: '#1a1a1a',
      margin: 0,
      letterSpacing: '-0.5px',
    },
    subtitle: {
      fontSize: '14px',
      color: '#4a4a4a',
      margin: '6px 0 0',
      fontWeight: 500,
    },
    instructions: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '12px',
      position: 'relative' as const,
    },
    row: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      backgroundColor: 'rgba(255,255,255,0.5)',
      padding: '12px 14px',
      borderRadius: '12px',
    },
    icon: {
      flexShrink: 0,
      color: '#1a1a1a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: {
      fontSize: '14px',
      fontWeight: 500,
      color: '#1a1a1a',
      lineHeight: 1.4,
    },
    sources: {
      backgroundColor: '#1a1a1a',
      borderRadius: '12px',
      padding: '12px 16px',
      marginTop: '4px',
    },
    sourcesTitle: {
      fontSize: '12px',
      color: '#E8B931',
      margin: '0 0 8px',
      fontWeight: 600,
      textTransform: 'uppercase' as const,
      letterSpacing: '1px',
    },
    sourcesList: {
      display: 'flex',
      flexWrap: 'wrap' as const,
      gap: '6px',
    },
    tag: {
      backgroundColor: '#E8B931',
      color: '#1a1a1a',
      padding: '4px 10px',
      borderRadius: '20px',
      fontSize: '11px',
      fontWeight: 600,
    },
    more: {
      color: '#888',
      padding: '4px 6px',
      fontSize: '11px',
      fontWeight: 500,
    },
    button: {
      width: '100%',
      marginTop: '20px',
      padding: '14px 24px',
      backgroundColor: '#1a1a1a',
      color: '#E8B931',
      border: 'none',
      borderRadius: '14px',
      fontSize: '16px',
      fontWeight: 700,
      fontFamily: "'Fredoka', sans-serif",
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
    footer: {
      textAlign: 'center' as const,
      fontSize: '10px',
      color: '#6a6a6a',
      margin: '16px 0 0',
      fontWeight: 500,
    },
  };

  return (
    <main className="min-h-screen bg-white relative overflow-hidden">
      <div style={styles.outerContainer}>
        <div ref={containerRef} style={styles.container}>
          {/* Rope */}
          <div style={styles.ropeContainer}>
          <svg style={styles.ceilingHook} viewBox="0 0 30 24" fill="none">
            <rect x="10" y="0" width="10" height="6" rx="2" fill="#5a5a5a"/>
            <path d="M15 6 L15 10 Q15 16 20 16 Q26 16 26 20 Q26 24 15 24" stroke="#6a6a6a" strokeWidth="4" fill="none" strokeLinecap="round"/>
            <path d="M15 6 L15 10 Q15 16 20 16 Q26 16 26 20" stroke="#8a8a8a" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          </svg>
          <div ref={ropeRef} style={styles.rope} />
        </div>

        {/* Card Hook */}
        <div style={styles.cardHook}>
          <div style={styles.cardHookHole} />
        </div>

        {/* Card */}
        <div style={styles.card}>
          <div style={styles.circle1} />
          <div style={styles.circle2} />

          <div style={styles.header}>
            <h2 style={styles.title}>MRT Foodie</h2>
            <p style={styles.subtitle}>Your curated food map</p>
          </div>

          <div style={styles.instructions}>
            <div style={styles.row}>
              <span style={styles.icon}><MapPin size={22} strokeWidth={2.5} /></span>
              <span style={styles.text}>Tap any MRT station to discover nearby eats</span>
            </div>

            <div style={styles.row}>
              <span style={styles.icon}><Search size={22} strokeWidth={2.5} /></span>
              <span style={styles.text}>Search for food like &apos;pizza&apos;, &apos;ramen&apos; or restaurant names</span>
            </div>

            <div style={styles.row}>
              <span style={styles.icon}><SlidersHorizontal size={22} strokeWidth={2.5} /></span>
              <span style={styles.text}>Filter by Dessert and Supper</span>
            </div>

            <div style={styles.sources}>
              <p style={styles.sourcesTitle}>Curated Sources</p>
              <div style={styles.sourcesList}>
                {['Michelin Guide', 'Eatbook', 'Burpple', 'Seth Lui', 'GetFed'].map((source) => (
                  <span key={source} style={styles.tag}>{source}</span>
                ))}
                <span style={styles.more}>+more</span>
              </div>
            </div>
          </div>

          <button
            style={styles.button}
            onClick={handleBack}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
              e.currentTarget.style.backgroundColor = '#2a2a2a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.backgroundColor = '#1a1a1a';
            }}
          >
            Back to Map
          </button>
          <p style={styles.footer}>© {new Date().getFullYear()} MRT Foodie • All rights reserved</p>
        </div>
        </div>
      </div>
    </main>
  );
}
