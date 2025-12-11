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

// Quick witty no-results messages for the popup
function getQuickNoResultsMessage(query: string): { emoji: string; text: string } {
  const q = query.toLowerCase().trim();

  // Absurd searches
  if (['human', 'people', 'person', 'child', 'baby'].some(p => q.includes(p))) {
    return { emoji: '👀', text: 'Uhh... you okay?' };
  }
  if (['dog', 'cat', 'pet'].some(p => q.includes(p))) {
    return { emoji: '🐕', text: 'Not that kind of food!' };
  }
  if (['shit', 'poop', 'crap'].some(p => q.includes(p))) {
    return { emoji: '💩', text: 'Very funny...' };
  }
  if (['drugs', 'weed', 'cocaine'].some(p => q.includes(p))) {
    return { emoji: '🚫', text: 'Sir, this is a food app' };
  }

  // Generic
  const messages = [
    { emoji: '🤔', text: 'Hmm, not found' },
    { emoji: '😅', text: 'No luck there' },
    { emoji: '🔍', text: 'Try another search' },
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

export default function SearchBar({ onSearch, onClear, isSearching, noResults, on24hClick, is24hActive, onDessertClick, isDessertActive }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [showNoResults, setShowNoResults] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const dragRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const noResultsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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

  // Show no results when noResults prop changes
  useEffect(() => {
    if (noResults) {
      setShowNoResults(true);
    }
  }, [noResults]);

  // Animate after showNoResults renders the element
  useEffect(() => {
    if (showNoResults && noResultsRef.current) {
      // Animate popup rising from below
      noResultsRef.current.animate(
        [
          { transform: 'translateX(-50%) translateY(20px)', opacity: 0 },
          { transform: 'translateX(-50%) translateY(-14px)', opacity: 1 },
        ],
        { duration: 400, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'forwards' }
      );

      const timer = setTimeout(() => {
        // Animate popup dropping back down
        noResultsRef.current?.animate(
          [
            { transform: 'translateX(-50%) translateY(-14px)', opacity: 1 },
            { transform: 'translateX(-50%) translateY(20px)', opacity: 0 },
          ],
          { duration: 300, easing: 'cubic-bezier(0.36, 0, 0.66, -0.56)', fill: 'forwards' }
        );
        setTimeout(() => setShowNoResults(false), 300);
      }, 2700);
      return () => clearTimeout(timer);
    }
  }, [showNoResults]);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle keyboard visibility on mobile using VisualViewport API
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const handleViewportResize = () => {
      const viewport = window.visualViewport;
      if (!viewport) return;

      // Calculate keyboard height: difference between window height and viewport height
      const keyboardH = window.innerHeight - viewport.height;
      // Only set if keyboard is actually open (more than 100px difference to filter out URL bar changes)
      const isKeyboardOpen = keyboardH > 100;
      setKeyboardHeight(isKeyboardOpen ? keyboardH : 0);

      // Close filter menu when keyboard opens to prevent overlap
      if (isKeyboardOpen) {
        setIsFilterOpen(false);
      }
    };

    window.visualViewport.addEventListener('resize', handleViewportResize);
    window.visualViewport.addEventListener('scroll', handleViewportResize);

    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportResize);
      window.visualViewport?.removeEventListener('scroll', handleViewportResize);
    };
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
      className="fixed left-0 right-0 flex justify-center z-50 pointer-events-none transition-all duration-200 px-4"
      style={{ bottom: keyboardHeight > 0 ? `${keyboardHeight + 16}px` : '16px' }}
    >
      {/* No Results Popup Animation - rises from below search bar, drops back down */}
      {showNoResults && (
        <div
          ref={noResultsRef}
          className="absolute left-1/2 pointer-events-none"
          style={{
            bottom: '100%',
            marginBottom: '8px',
            transform: 'translateX(-50%) translateY(20px)',
            opacity: 0,
          }}
        >
          <div className="bg-[#E8B931] text-[#1a1a1a] px-4 py-2 rounded-full shadow-lg whitespace-nowrap flex items-center gap-2 border-2 border-[#1a1a1a]">
            <span className="text-lg">{getQuickNoResultsMessage(query).emoji}</span>
            <span className="text-sm font-bold">{getQuickNoResultsMessage(query).text}</span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 pointer-events-auto">
        {/* Filter Button with Expandable Menu - Hide when keyboard is open */}
        {(on24hClick || onDessertClick) && keyboardHeight === 0 && (
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
                  className={`px-4 py-2.5 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center font-bold text-sm active:scale-95 whitespace-nowrap border-2 border-[#1a1a1a] ${
                    isDessertActive
                      ? 'bg-pink-500 text-white shadow-pink-300'
                      : 'bg-white text-[#1a1a1a] hover:bg-pink-50 hover:text-pink-600'
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
                  className={`px-4 py-2.5 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center font-bold text-sm active:scale-95 whitespace-nowrap border-2 border-[#1a1a1a] ${
                    is24hActive
                      ? 'bg-purple-600 text-white shadow-purple-300'
                      : 'bg-white text-[#1a1a1a] hover:bg-purple-50 hover:text-purple-600'
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
              ref={inputRef}
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
