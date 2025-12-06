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
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
      <form onSubmit={handleSubmit} className="relative pointer-events-auto">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search food..."
          className="w-64 px-4 py-2 pr-20 rounded-full border-2 border-gray-300
                     focus:border-red-500 focus:outline-none shadow-lg
                     text-sm bg-white"
          disabled={isSearching}
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-12 top-1/2 transform -translate-y-1/2
                       text-gray-400 hover:text-gray-600 px-1"
          >
            ✕
          </button>
        )}
        <button
          type="submit"
          disabled={!query.trim() || isSearching}
          className="absolute right-1 top-1/2 transform -translate-y-1/2
                     bg-red-500 hover:bg-red-600 disabled:bg-gray-300
                     text-white px-3 py-1 rounded-full
                     transition-colors duration-200 text-sm"
        >
          {isSearching ? '...' : '🔍'}
        </button>
      </form>
    </div>
  );
}
