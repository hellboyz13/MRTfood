'use client';

import { useState, useCallback } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onClear: () => void;
  isSearching: boolean;
}

export default function SearchBar({ onSearch, onClear, isSearching }: SearchBarProps) {
  const [query, setQuery] = useState('');

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

  return (
    <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-3">
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
