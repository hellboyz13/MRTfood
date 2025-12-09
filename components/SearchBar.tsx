'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onClear: () => void;
  isSearching: boolean;
  noResults?: boolean;
  on24hClick?: () => void;
  is24hActive?: boolean;
}

export default function SearchBar({ onSearch, onClear, isSearching, noResults, on24hClick, is24hActive }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [showNoResults, setShowNoResults] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0 });

  // Show no results animation when noResults prop changes
  useEffect(() => {
    if (noResults) {
      setShowNoResults(true);
      const timer = setTimeout(() => {
        setShowNoResults(false);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setShowNoResults(false);
    }
  }, [noResults]);

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
      {/* No Results Popup Animation */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 transition-all duration-500 ease-out pointer-events-none ${
          showNoResults
            ? 'opacity-100 -translate-y-14'
            : 'opacity-0 translate-y-0'
        }`}
        style={{
          bottom: '100%',
        }}
      >
        <div className="bg-gray-800 text-white px-4 py-2 rounded-full shadow-lg whitespace-nowrap flex items-center gap-2">
          <span className="text-lg">(x.x)</span>
          <span className="text-sm font-medium">No food found</span>
        </div>
      </div>

      <div className="flex items-center gap-2 pointer-events-auto">
        {/* 24/7 Button */}
        {on24hClick && (
          <button
            type="button"
            onClick={on24hClick}
            className={`px-4 py-2.5 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center font-bold text-sm active:scale-95 ${
              is24hActive
                ? 'bg-purple-600 text-white shadow-purple-300'
                : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-purple-500 hover:text-purple-600 hover:bg-purple-50'
            }`}
            title="Find 24/7 restaurants"
          >
            <span className="mr-1">🌙</span>
            24/7
          </button>
        )}

        <form onSubmit={handleSubmit} className="relative">
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
    </div>
  );
}
