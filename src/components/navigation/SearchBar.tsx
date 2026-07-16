import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useGeocoding } from '../../hooks/useGeocoding';
import type { NominatimResult } from '../../services/nominatim';

interface SearchBarProps {
  onSelectLocation: (lat: number, lng: number, name: string) => void;
  placeholder?: string;
  compact?: boolean;
}

export function SearchBar({
  onSelectLocation,
  placeholder = '搜索地點...',
  compact = false,
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { results, loading, search, clear } = useGeocoding();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setQuery(val);
      if (val.trim()) {
        search(val);
        setIsOpen(true);
      } else {
        clear();
        setIsOpen(false);
      }
    },
    [search, clear]
  );

  const handleSelect = useCallback(
    (result: NominatimResult) => {
      onSelectLocation(
        parseFloat(result.lat),
        parseFloat(result.lon),
        result.display_name
      );
      setQuery(result.display_name.split(',')[0]);
      setIsOpen(false);
    },
    [onSelectLocation]
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFocus = useCallback(() => {
    if (query.trim() && results.length > 0) setIsOpen(true);
  }, [query, results]);

  if (compact) {
    return (
      <div ref={containerRef} className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={handleFocus}
          placeholder="📍"
          className="w-full px-3 py-2 text-sm bg-white/90 rounded-lg shadow-sm border-0 focus:ring-2 focus:ring-blue-500 outline-none"
        />
        {isOpen && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg max-h-60 overflow-y-auto z-50">
            {results.map((r) => (
              <button
                key={r.place_id}
                onClick={() => handleSelect(r)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 border-b border-gray-100 last:border-0"
              >
                <div className="font-medium truncate">
                  {r.display_name.split(',')[0]}
                </div>
                <div className="text-gray-500 text-xs truncate">
                  {r.display_name}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="flex items-center bg-white/90 rounded-lg shadow-md px-4 py-3">
        <svg
          className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={handleFocus}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-sm"
        />
        {loading && (
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin ml-2" />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg max-h-72 overflow-y-auto z-50">
          {results.map((r) => (
            <button
              key={r.place_id}
              onClick={() => handleSelect(r)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors"
            >
              <div className="font-medium text-sm">
                {r.display_name.split(',')[0]}
              </div>
              <div className="text-gray-500 text-xs mt-0.5 truncate">
                {r.display_name}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
