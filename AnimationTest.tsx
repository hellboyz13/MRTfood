'use client';

import { useEffect, useRef, useState } from 'react';

export default function AnimationTest() {
  const boxRef = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(true);
  }, []);

  useEffect(() => {
    if (show && boxRef.current) {
      // Web Animations API - pure JavaScript animation
      boxRef.current.animate(
        [
          { transform: 'translateY(-100vh)' },
          { transform: 'translateY(30px)' },
          { transform: 'translateY(-100px)' },
          { transform: 'translateY(15px)' },
          { transform: 'translateY(-45px)' },
          { transform: 'translateY(0)' }
        ],
        {
          duration: 1400,
          easing: 'cubic-bezier(0.22, 0, 0.36, 1)',
          fill: 'forwards'
        }
      );
    }
  }, [show]);

  if (!show) return null;

  return (
    <div
      ref={boxRef}
      style={{
        position: 'fixed',
        top: 100,
        left: '50%',
        marginLeft: -100,
        width: 200,
        height: 200,
        backgroundColor: '#E8B931',
        border: '4px solid #1a1a1a',
        borderRadius: 20,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif',
        fontWeight: 'bold',
        transform: 'translateY(-100vh)'
      }}
    >
      Animation Test
    </div>
  );
}
