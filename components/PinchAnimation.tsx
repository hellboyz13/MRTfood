'use client';

import { useEffect, useRef } from 'react';

export function PinchAnimation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const leftCircleRef = useRef<HTMLDivElement>(null);
  const rightCircleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const options: KeyframeAnimationOptions = {
      duration: 1500,
      iterations: Infinity,
      easing: 'ease-in-out',
    };

    // Animate touch points moving apart (zoom out gesture)
    leftCircleRef.current?.animate(
      [
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: 'translate(-12px, -8px) scale(0.9)', opacity: 0.7 },
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      ],
      options
    );

    rightCircleRef.current?.animate(
      [
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: 'translate(12px, 8px) scale(0.9)', opacity: 0.7 },
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      ],
      options
    );
  }, []);

  return (
    <div ref={containerRef} className="relative w-20 h-20 flex items-center justify-center">
      {/* Subtle expanding rings to show zoom effect */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="w-10 h-10 rounded-full border border-[#FF6B4A]/20"
          style={{
            animation: 'ping 1.5s ease-in-out infinite',
          }}
        />
      </div>

      {/* Touch point circles - minimal iOS-style */}
      <div
        ref={leftCircleRef}
        className="absolute w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6B4A] to-[#FF8A6A] shadow-lg"
        style={{
          left: '18px',
          top: '18px',
          boxShadow: '0 2px 8px rgba(255, 107, 74, 0.4)',
        }}
      />
      <div
        ref={rightCircleRef}
        className="absolute w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6B4A] to-[#FF8A6A] shadow-lg"
        style={{
          right: '18px',
          bottom: '18px',
          boxShadow: '0 2px 8px rgba(255, 107, 74, 0.4)',
        }}
      />
    </div>
  );
}

export function ScrollAnimation() {
  const mouseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mouseRef.current?.animate(
      [
        { transform: 'translateY(0)' },
        { transform: 'translateY(-4px)' },
        { transform: 'translateY(0)' },
        { transform: 'translateY(4px)' },
        { transform: 'translateY(0)' },
      ],
      {
        duration: 1500,
        iterations: Infinity,
        easing: 'ease-in-out',
      }
    );
  }, []);

  return (
    <div ref={mouseRef} className="text-3xl">
      🖱️
    </div>
  );
}
