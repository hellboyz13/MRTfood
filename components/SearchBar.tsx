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
      ref={dragRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`z-50 w-full max-w-md px-3 transition-all ${
        isMobile
          ? 'fixed'
          : 'absolute bottom-3 left-1/2 transform -translate-x-1/2'
      } ${isDragging && isMobile ? 'ring-4 ring-blue-500' : ''}`}
      style={
        isMobile
          ? {
              left: position.x || '50%',
              bottom: position.y || '120px',
              transform: position.x ? 'none' : 'translateX(-50%)',
              cursor: isDragging ? 'grabbing' : 'grab',
              touchAction: 'none',
            }
          : undefined
      }
    >
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for food (e.g., Thai, Bak Kut Teh)"
          className="w-full px-4 py-2.5 pr-24 rounded-full border-2 border-gray-300
                     focus:border-red-500 focus:outline-none shadow-lg
                     text-sm md:text-base bg-white"
          disabled={isSearching}
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-16 top-1/2 transform -translate-y-1/2
                       text-gray-400 hover:text-gray-600 px-2"
          >
            ✕
          </button>
        )}
        <button
          type="submit"
          disabled={!query.trim() || isSearching}
          className="absolute right-1 top-1/2 transform -translate-y-1/2
                     bg-red-500 hover:bg-red-600 disabled:bg-gray-300
                     text-white px-4 py-1.5 rounded-full
                     transition-colors duration-200 text-sm md:text-base"
        >
          {isSearching ? '...' : '🔍'}
        </button>
      </form>
    </div>
  );
}
