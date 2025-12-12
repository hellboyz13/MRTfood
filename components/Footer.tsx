'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { IconInfo } from './Icons';

interface FooterProps {
  onHowToUseClick?: () => void;
}

export default function Footer({ onHowToUseClick }: FooterProps) {
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

  const handleHowToUseClick = () => {
    setIsOpen(false);
    if (onHowToUseClick) {
      onHowToUseClick();
    }
  };

  return (
    <div className="fixed top-3 right-3 z-[60]" ref={menuRef}>
      {/* Info button - Golden Yellow Theme */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 md:w-11 md:h-11 bg-[#E8B931] hover:bg-[#F5D251] hover:scale-[1.02] rounded-full shadow-lg border-2 border-[#1a1a1a] flex items-center justify-center text-[#1a1a1a] transition-all active:scale-95 cursor-pointer"
        aria-label="Info menu"
      >
        <IconInfo className="w-5 h-5" />
      </button>

      {/* Dropdown menu - White background */}
      {isOpen && (
        <div className="absolute top-12 right-0 bg-white rounded-xl shadow-xl border-2 border-[#E8B931] py-2 min-w-[160px] animate-in fade-in slide-in-from-top-2 duration-200">
          <button
            onClick={handleHowToUseClick}
            className="block w-full text-left px-4 py-2.5 text-sm text-[#1a1a1a] hover:bg-[#E8B931] hover:text-[#1a1a1a] transition-colors font-medium"
          >
            How to Use
          </button>
          <Link
            href="/credits"
            className="block px-4 py-2.5 text-sm text-[#1a1a1a] hover:bg-[#E8B931] hover:text-[#1a1a1a] transition-colors font-medium"
            onClick={() => setIsOpen(false)}
          >
            Credits & Sources
          </Link>
          <Link
            href="/terms"
            className="block px-4 py-2.5 text-sm text-[#1a1a1a] hover:bg-[#E8B931] hover:text-[#1a1a1a] transition-colors font-medium"
            onClick={() => setIsOpen(false)}
          >
            Terms of Use
          </Link>
          <Link
            href="/privacy"
            className="block px-4 py-2.5 text-sm text-[#1a1a1a] hover:bg-[#E8B931] hover:text-[#1a1a1a] transition-colors font-medium"
            onClick={() => setIsOpen(false)}
          >
            Privacy Policy
          </Link>
        </div>
      )}
    </div>
  );
}
