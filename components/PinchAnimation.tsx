'use client';

import { useEffect, useRef } from 'react';

export function PinchAnimation() {
  const leftHandRef = useRef<SVGGElement>(null);
  const rightHandRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const options: KeyframeAnimationOptions = {
      duration: 1400,
      iterations: Infinity,
      easing: 'ease-in-out',
    };

    leftHandRef.current?.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(6px)' },
        { transform: 'translateX(0)' },
      ],
      options
    );

    rightHandRef.current?.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-6px)' },
        { transform: 'translateX(0)' },
      ],
      options
    );
  }, []);

  return (
    <div className="flex justify-center items-center py-2">
      <svg width="80" height="50" viewBox="0 0 80 50">
        {/* Left hand/finger */}
        <g ref={leftHandRef}>
          <ellipse cx="18" cy="25" rx="8" ry="12" fill="#2D2D2D" opacity="0.15" />
          <ellipse cx="18" cy="25" rx="6" ry="10" fill="#2D2D2D" opacity="0.3" />
          <circle cx="18" cy="20" r="3" fill="#2D2D2D" opacity="0.5" />
        </g>

        {/* Right hand/finger */}
        <g ref={rightHandRef}>
          <ellipse cx="62" cy="25" rx="8" ry="12" fill="#2D2D2D" opacity="0.15" />
          <ellipse cx="62" cy="25" rx="6" ry="10" fill="#2D2D2D" opacity="0.3" />
          <circle cx="62" cy="20" r="3" fill="#2D2D2D" opacity="0.5" />
        </g>

        {/* Arrows indicating pinch direction */}
        <path d="M30 25 L36 25 M34 22 L36 25 L34 28" stroke="#FF6B4A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M50 25 L44 25 M46 22 L44 25 L46 28" stroke="#FF6B4A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
