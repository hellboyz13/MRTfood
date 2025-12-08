'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onClear: () => void;
  isSearching: boolean;
}

export default function SearchBar({ onSearch, onClear, isSearching }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0 });

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  }, [query, onSearch]);

  const handleClear = useCallback(() => {
    setQuery('');
    onClear();
  }, [onClear]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;
    const touch = e.touches[0];
    startPos.current = { x: touch.clientX - position.x, y: touch.clientY - position.y };
    setIsDragging(true);
  }, [isMobile, position]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || !isMobile) return;
    e.preventDefault();
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - startPos.current.x,
      y: touch.clientY - startPos.current.y,
    });
  }, [isDragging, isMobile]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div
      className="fixed left-1/2 transform -translate-x-1/2 z-50 pointer-events-none bottom-4"
    >
      <form onSubmit={handleSubmit} className="relative pointer-events-auto">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search food..."
          className="border-2 border-gray-300
                     focus:border-red-500 focus:outline-none shadow-lg
                     bg-white min-h-[44px]"
          disabled={isSearching}
          style={{
            width: 'clamp(240px, 70vw, 280px)',
            paddingLeft: 'clamp(12px, 4vw, 16px)',
            paddingRight: 'clamp(70px, 20vw, 80px)',
            paddingTop: 'clamp(8px, 2vw, 10px)',
            paddingBottom: 'clamp(8px, 2vw, 10px)',
            fontSize: 'clamp(13px, 3.5vw, 14px)',
            borderRadius: 'clamp(20px, 6vw, 24px)',
          }}
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-1/2 transform -translate-y-1/2
                       text-gray-400 hover:text-gray-600 active:text-gray-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
            style={{
              right: 'clamp(40px, 12vw, 48px)',
              fontSize: 'clamp(14px, 4vw, 16px)',
            }}
          >
            ✕
          </button>
        )}
        <button
          type="submit"
          disabled={!query.trim() || isSearching}
          className="absolute top-1/2 transform -translate-y-1/2
                     bg-red-500 hover:bg-red-600 active:bg-red-700 disabled:bg-gray-300
                     text-white transition-colors duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
          style={{
            right: 'clamp(2px, 0.5vw, 4px)',
            paddingLeft: 'clamp(10px, 3vw, 12px)',
            paddingRight: 'clamp(10px, 3vw, 12px)',
            paddingTop: 'clamp(6px, 1.5vw, 8px)',
            paddingBottom: 'clamp(6px, 1.5vw, 8px)',
            fontSize: 'clamp(12px, 3.5vw, 14px)',
            borderRadius: 'clamp(18px, 5vw, 20px)',
          }}
        >
          {isSearching ? '...' : '🔍'}
        </button>
      </form>
    </div>
  );
}
