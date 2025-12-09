'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { IconInfo } from './Icons';

export default function Footer() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="fixed top-3 right-3 z-50" ref={menuRef}>
      {/* Info button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 md:w-11 md:h-11 bg-white/90 backdrop-blur-sm rounded-full shadow-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:text-orange-600 hover:border-orange-300 transition-colors"
        aria-label="Info menu"
      >
<IconInfo className="w-5 h-5" />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute top-12 right-0 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[140px] animate-in fade-in slide-in-from-top-2 duration-200">
          <Link
            href="/credits"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            Credits & Sources
          </Link>
          <Link
            href="/terms"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            Terms of Use
          </Link>
          <Link
            href="/privacy"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            Privacy Policy
          </Link>
        </div>
      )}
    </div>
  );
}
