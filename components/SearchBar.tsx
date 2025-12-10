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
  onDessertClick?: () => void;
  isDessertActive?: boolean;
}

// Rotating placeholder examples
const PLACEHOLDER_EXAMPLES = [
  'Chinese, Indian, Malay',
  'Pizza, Pasta, Fried Rice',
  'Sin Kee Seafood Soup',
];

export default function SearchBar({ onSearch, onClear, isSearching, noResults, on24hClick, is24hActive, onDessertClick, isDessertActive }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [showNoResults, setShowNoResults] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0 });

  // Close filter menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        {/* Filter Button with Expandable Menu */}
        {(on24hClick || onDessertClick) && (
          <div ref={filterRef} className="relative">
            {/* Expandable Filter Options - Opens Upward */}
            <div
              className={`absolute bottom-full left-0 mb-2 flex flex-col gap-2 transition-all duration-300 ease-out origin-bottom ${
                isFilterOpen
                  ? 'opacity-100 scale-y-100 translate-y-0'
                  : 'opacity-0 scale-y-0 translate-y-4 pointer-events-none'
              }`}
            >
              {/* Dessert Button */}
              {onDessertClick && (
                <button
                  type="button"
                  onClick={() => {
                    onDessertClick();
                    setIsFilterOpen(false);
                  }}
                  className={`px-4 py-2.5 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center font-bold text-sm active:scale-95 whitespace-nowrap ${
                    isDessertActive
                      ? 'bg-pink-500 text-white shadow-pink-300'
                      : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-pink-500 hover:text-pink-600 hover:bg-pink-50'
                  }`}
                  title="Find dessert spots"
                >
                  <span className="mr-1">🍰</span>
                  Dessert
                </button>
              )}

              {/* Supper Button */}
              {on24hClick && (
                <button
                  type="button"
                  onClick={() => {
                    on24hClick();
                    setIsFilterOpen(false);
                  }}
                  className={`px-4 py-2.5 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center font-bold text-sm active:scale-95 whitespace-nowrap ${
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
            </div>

            {/* Filter Toggle Button - Golden Yellow Theme */}
            <button
              type="button"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`px-4 py-2.5 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center font-bold text-sm active:scale-95 border-2 cursor-pointer ${
                is24hActive || isDessertActive
                  ? 'bg-[#E8B931] border-[#1a1a1a] text-[#1a1a1a] shadow-[0_4px_12px_rgba(232,185,49,0.4)] hover:scale-[1.02]'
                  : isFilterOpen
                    ? 'bg-[#F5D251] border-[#1a1a1a] text-[#1a1a1a]'
                    : 'bg-[#E8B931] border-[#1a1a1a] text-[#1a1a1a] hover:bg-[#F5D251] hover:shadow-[0_6px_16px_rgba(232,185,49,0.5)] hover:scale-[1.02]'
              }`}
              title="Filter options"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
              </svg>
              Filter
              <span className={`ml-1 transition-transform duration-200 text-xs ${isFilterOpen ? 'rotate-180' : ''}`}>
                ▲
              </span>
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative flex items-center">
          <div className="relative flex items-center bg-white rounded-full shadow-lg border-2 border-[#1a1a1a] focus-within:border-[#E8B931] focus-within:shadow-[0_4px_12px_rgba(232,185,49,0.3)] transition-all">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-transparent focus:outline-none min-h-[44px] text-sm w-[240px] md:w-[280px] pl-4 pr-2"
              disabled={isSearching}
            />
            {/* Custom rotating placeholder */}
            {!query && (
              <div
                className="absolute left-4 right-12 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 flex items-center text-xs md:text-sm overflow-hidden"
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
            {/* Search button - Golden Yellow Theme */}
            <button
              type="submit"
              disabled={!query.trim() || isSearching}
              className="bg-[#1a1a1a] hover:bg-[#2a2a2a] active:bg-[#0a0a0a] disabled:bg-gray-300
                         text-[#E8B931] transition-all duration-200 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mr-0.5"
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
