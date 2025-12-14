'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, Search, SlidersHorizontal } from 'lucide-react';

export default function HowToUseCard() {
  const [show, setShow] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const ropeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if user has visited before
    const hasVisited = localStorage.getItem('mrtfoodie_visited');
    if (!hasVisited) {
      setTimeout(() => setShow(true), 300);
    }
  }, []);

  // Trigger animations when show becomes true
  useEffect(() => {
    if (show && !isExiting) {
      // Animate backdrop fade in
      backdropRef.current?.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        { duration: 400, easing: 'ease', fill: 'forwards' }
      );

      // Animate card wrapper drop with bounce
      containerRef.current?.animate(
        [
          { transform: 'translateY(-100vh)' },
          { transform: 'translateY(30px)' },
          { transform: 'translateY(-100px)' },
          { transform: 'translateY(15px)' },
          { transform: 'translateY(-45px)' },
          { transform: 'translateY(5px)' },
          { transform: 'translateY(-15px)' },
          { transform: 'translateY(0)' },
        ],
        { duration: 1400, easing: 'cubic-bezier(0.22, 0, 0.36, 1)', fill: 'forwards' }
      );

      // Animate rope extend - extends from top of screen to card hook
      ropeRef.current?.animate(
        [
          { height: '0px' },
          { height: 'calc(50vh - 290px + 60px)' },
          { height: 'calc(50vh - 290px - 50px)' },
          { height: 'calc(50vh - 290px + 30px)' },
          { height: 'calc(50vh - 290px - 30px)' },
          { height: 'calc(50vh - 290px + 15px)' },
          { height: 'calc(50vh - 290px - 10px)' },
          { height: 'calc(50vh - 290px)' },
        ],
        { duration: 1400, easing: 'cubic-bezier(0.22, 0, 0.36, 1)', fill: 'forwards' }
      );
    }
  }, [show, isExiting]);

  const handleDismiss = () => {
    setIsExiting(true);

    // Animate backdrop fade out
    backdropRef.current?.animate(
      [{ opacity: 1 }, { opacity: 0 }],
      { duration: 500, easing: 'ease', fill: 'forwards' }
    );

    // Animate card wrapper - stretch down first, then retract up
    containerRef.current?.animate(
      [
        { transform: 'translateY(0)', offset: 0 },
        { transform: 'translateY(40px)', offset: 0.15 },
        { transform: 'translateY(-120vh)', offset: 1 },
      ],
      { duration: 500, easing: 'cubic-bezier(0.55, 0, 1, 0.45)', fill: 'forwards' }
    );

    // Animate rope - extend slightly, then retract to top
    ropeRef.current?.animate(
      [
        { height: 'calc(50vh - 290px)', offset: 0 },
        { height: 'calc(50vh - 290px + 40px)', offset: 0.15 },
        { height: '0px', offset: 1 },
      ],
      { duration: 500, easing: 'cubic-bezier(0.55, 0, 1, 0.45)', fill: 'forwards' }
    );

    setTimeout(() => {
      localStorage.setItem('mrtfoodie_visited', 'true');
      setShow(false);
    }, 550);
  };

  if (!show) return null;

  const styles = {
    backdrop: {
      position: 'fixed' as const,
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(4px)',
      zIndex: 9998,
      opacity: 0,
    },
    container: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      pointerEvents: 'none' as const,
    },
    cardWrapper: {
      width: '100%',
      maxWidth: '400px',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      transform: 'translateY(-100vh)',
      pointerEvents: 'auto' as const,
      zIndex: 10001,
      position: 'relative' as const,
    },
    ropeContainer: {
      position: 'fixed' as const,
      top: '0',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      zIndex: 9999,
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
      background: 'linear-gradient(180deg, #FF6B4A 0%, #E55A3A 50%, #d4503a 100%)',
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
      border: '2px solid #E55A3A',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)',
    },
    card: {
      backgroundColor: '#FFFBF7',
      borderRadius: '24px',
      padding: '28px 24px 24px',
      fontFamily: "'Fredoka', sans-serif",
      boxShadow: '0 20px 60px rgba(0,0,0,0.3), 0 8px 20px rgba(0,0,0,0.2)',
      border: '2px solid #E0DCD7',
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
      backgroundColor: '#FFF0ED',
      opacity: 0.8,
    },
    circle2: {
      position: 'absolute' as const,
      bottom: '-30px',
      left: '-30px',
      width: '100px',
      height: '100px',
      borderRadius: '50%',
      backgroundColor: '#FF6B4A',
      opacity: 0.15,
    },
    header: {
      textAlign: 'center' as const,
      marginBottom: '20px',
      position: 'relative' as const,
    },
    title: {
      fontSize: '26px',
      fontWeight: 700,
      color: '#2D2D2D',
      margin: 0,
      letterSpacing: '-0.5px',
    },
    subtitle: {
      fontSize: '14px',
      color: '#757575',
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
      backgroundColor: '#F5F3F0',
      padding: '12px 14px',
      borderRadius: '12px',
    },
    icon: {
      flexShrink: 0,
      color: '#FF6B4A',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: {
      fontSize: '14px',
      fontWeight: 500,
      color: '#2D2D2D',
      lineHeight: 1.4,
    },
    sources: {
      backgroundColor: '#F5F3F0',
      borderRadius: '12px',
      padding: '12px 16px',
      marginTop: '4px',
      border: '1px solid #E0DCD7',
    },
    sourcesTitle: {
      fontSize: '12px',
      color: '#757575',
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
      backgroundColor: '#FFF0ED',
      color: '#FF6B4A',
      padding: '4px 10px',
      borderRadius: '20px',
      fontSize: '11px',
      fontWeight: 600,
    },
    more: {
      color: '#757575',
      padding: '4px 6px',
      fontSize: '11px',
      fontWeight: 500,
    },
    button: {
      width: '100%',
      marginTop: '20px',
      padding: '14px 24px',
      backgroundColor: '#FF6B4A',
      color: '#ffffff',
      border: 'none',
      borderRadius: '14px',
      fontSize: '16px',
      fontWeight: 700,
      fontFamily: "'Fredoka', sans-serif",
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: '0 4px 12px rgba(255,107,74,0.3)',
    },
    footer: {
      textAlign: 'center' as const,
      fontSize: '10px',
      color: '#757575',
      margin: '16px 0 0',
      fontWeight: 500,
    },
  };

  return (
    <>
      {/* Backdrop */}
      <div
        ref={backdropRef}
        style={styles.backdrop}
        onClick={handleDismiss}
      />

      {/* Rope - fixed at top of screen */}
      <div style={styles.ropeContainer}>
        <svg style={styles.ceilingHook} viewBox="0 0 30 24" fill="none">
          <rect x="10" y="0" width="10" height="6" rx="2" fill="#5a5a5a"/>
          <path d="M15 6 L15 10 Q15 16 20 16 Q26 16 26 20 Q26 24 15 24" stroke="#6a6a6a" strokeWidth="4" fill="none" strokeLinecap="round"/>
          <path d="M15 6 L15 10 Q15 16 20 16 Q26 16 26 20" stroke="#8a8a8a" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        </svg>
        <div ref={ropeRef} style={styles.rope} />
      </div>

      {/* Container */}
      <div style={styles.container}>
        {/* Card Wrapper - this is what gets animated */}
        <div ref={containerRef} style={styles.cardWrapper}>
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
              onClick={handleDismiss}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleDismiss();
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.backgroundColor = '#E55A3A';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.backgroundColor = '#FF6B4A';
              }}
            >
              Let&apos;s Eat!
            </button>
            <p style={styles.footer}>© {new Date().getFullYear()} MRT Foodie • All rights reserved</p>
          </div>
        </div>
      </div>
    </>
  );
}
