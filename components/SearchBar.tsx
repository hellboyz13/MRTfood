'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { IconSearch, IconSpinner } from './Icons';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onClear: () => void;
  isSearching: boolean;
  noResults?: boolean;
  on24hClick?: () => void;
  is24hActive?: boolean;
}

// Rotating placeholder examples
const PLACEHOLDER_EXAMPLES = [
  'Chinese, Indian, Malay',
  'Pizza, Pasta, Fried Rice',
  'Sin Kee Seafood Soup',
];

export default function SearchBar({ onSearch, onClear, isSearching, noResults, on24hClick, is24hActive }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [showNoResults, setShowNoResults] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
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

  // Rotate placeholder text every 2 seconds with downward morph effect
  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDER_EXAMPLES.length);
        setIsAnimating(false);
      }, 300); // Match CSS transition duration
    }, 2000);
    return () => clearInterval(interval);
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
        <div className="bg-red-500 text-white px-4 py-2 rounded-full shadow-lg whitespace-nowrap flex items-center gap-2">
          <span className="text-lg">😵</span>
          <span className="text-sm font-medium">No food found</span>
        </div>
      </div>

      <div className="flex items-center gap-2 pointer-events-auto">
        {/* Supper Button */}
        {on24hClick && (
          <button
            type="button"
            onClick={on24hClick}
            className={`px-4 py-2.5 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center font-bold text-sm active:scale-95 ${
              is24hActive
                ? 'bg-purple-600 text-white shadow-purple-300'
                : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-purple-500 hover:text-purple-600 hover:bg-purple-50'
            }`}
            title="Find supper spots"
          >
            <span className="mr-1">🌙</span>
            Supper
          </button>
        )}

        <form onSubmit={handleSubmit} className="relative flex items-center">
          <div className="relative flex items-center bg-white rounded-full shadow-lg border-2 border-gray-300 focus-within:border-red-500 transition-colors">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-transparent focus:outline-none min-h-[44px] text-sm w-[200px] md:w-[240px] pl-4 pr-2"
              disabled={isSearching}
            />
            {/* Custom rotating placeholder */}
            {!query && (
              <div
                className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 flex items-center whitespace-nowrap text-xs md:text-sm"
              >
                <span className="flex-shrink-0">Search Food:&nbsp;</span>
                <span
                  className={`transition-all duration-300 ${
                    isAnimating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
                  }`}
                >
                  {PLACEHOLDER_EXAMPLES[placeholderIndex]}
                </span>
              </div>
            )}
            {/* Clear button */}
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="text-gray-400 hover:text-gray-600 active:text-gray-700 w-8 h-8 flex items-center justify-center flex-shrink-0"
              >
                ✕
              </button>
            )}
            {/* Search button - integrated inside the container */}
            <button
              type="submit"
              disabled={!query.trim() || isSearching}
              className="bg-red-500 hover:bg-red-600 active:bg-red-700 disabled:bg-gray-300
                         text-white transition-colors duration-200 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mr-0.5"
            >
              {isSearching ? (
                <IconSpinner className="w-4 h-4 text-white" />
              ) : (
                <IconSearch className="w-5 h-5" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
