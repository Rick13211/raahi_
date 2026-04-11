'use client';

// LocationAutocomplete — Google Maps-style autosuggest input
// Uses Mapbox Geocoding API v5 with autocomplete mode
// Debounces input to avoid hammering the API

import { useState, useEffect, useRef, useCallback } from 'react';
import { LocateFixed } from 'lucide-react';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

export interface SuggestionResult {
  place_name: string;
  center: [number, number]; // [lng, lat]
  text: string;             // short name
  context?: Array<{ text: string; id: string }>;
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: SuggestionResult) => void;
  placeholder?: string;
  label: string;
  icon: 'start' | 'end';
  showLocateButton?: boolean;
  onLocateClick?: () => void;
  disabled?: boolean;
  /** Bias results near this point [lng, lat] */
  proximity?: [number, number];
  onEnter?: () => void;
}

export default function LocationAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Search a location...',
  label,
  icon,
  showLocateButton = false,
  onLocateClick,
  disabled = false,
  proximity,
  onEnter,
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<SuggestionResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const skipNextFetch = useRef(false);

  // ── Fetch suggestions from Mapbox Geocoding API ─────────────────────────
  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query || query.length < 2 || !MAPBOX_TOKEN) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        access_token: MAPBOX_TOKEN,
        autocomplete: 'true',
        limit: '6',
        language: 'en',
        types: 'country,region,district,place,locality,neighborhood,address,poi',
      });

      // Bias results near user's location or a default center
      if (proximity) {
        params.set('proximity', `${proximity[0]},${proximity[1]}`);
      }

      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params}`
      );

      if (!res.ok) throw new Error('Geocoding failed');

      const data = await res.json();
      const results: SuggestionResult[] = (data.features ?? []).map((f: any) => ({
        place_name: f.place_name,
        center: f.center,
        text: f.text,
        context: f.context,
      }));

      setSuggestions(results);
      setIsOpen(results.length > 0);
      setActiveIndex(-1);
    } catch (err) {
      console.warn('Autocomplete fetch error:', err);
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, [proximity]);

  // ── Debounced input handler ─────────────────────────────────────────────
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // If the change was from selecting a suggestion, skip the fetch
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }

    // Debounce: wait 300ms after user stops typing
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 300);
  };

  // ── Select a suggestion ─────────────────────────────────────────────────
  const handleSelect = (suggestion: SuggestionResult) => {
    skipNextFetch.current = true;
    onChange(suggestion.place_name);
    setSuggestions([]);
    setIsOpen(false);
    setActiveIndex(-1);
    onSelect(suggestion);
  };

  // ── Keyboard navigation ─────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        onEnter?.();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          handleSelect(suggestions[activeIndex]);
        } else {
          setIsOpen(false);
          onEnter?.();
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setActiveIndex(-1);
        break;
    }
  };

  // ── Close dropdown when clicking outside ────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Cleanup debounce timer ──────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // ── Parse suggestion into primary + secondary text ──────────────────────
  const parseSuggestion = (s: SuggestionResult) => {
    const parts = s.place_name.split(', ');
    const primary = parts[0];
    const secondary = parts.slice(1).join(', ');
    return { primary, secondary };
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="text-[11px] font-bold text-[#6b7280] mb-1.5 block uppercase tracking-wider">
        {label}
      </label>
      <div className="relative">
        {/* Icon indicator */}
        {icon === 'start' ? (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#2563eb] ring-2 ring-[#2563eb]/20" />
        ) : (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-sm bg-[#111827] ring-2 ring-[#e5e7eb]" />
        )}

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          className={`w-full bg-[#f9fafb] border border-[#e5e7eb] rounded-xl pl-9 ${showLocateButton ? 'pr-12' : 'pr-4'} py-3.5 text-sm font-medium text-[#111827] focus:outline-none focus:bg-white focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10 transition-all placeholder:text-[#6b7280] placeholder:font-normal`}
        />

        {/* Loading spinner in input */}
        {isLoading && (
          <div className={`absolute ${showLocateButton ? 'right-14' : 'right-4'} top-1/2 -translate-y-1/2`}>
            <div className="w-4 h-4 border-2 border-[#e5e7eb] border-t-[#2563eb] rounded-full animate-spin" />
          </div>
        )}

        {/* Locate button */}
        {showLocateButton && onLocateClick && (
          <button
            type="button"
            onClick={onLocateClick}
            title="Use Current Location"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-[#2563eb] hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center bg-white border border-gray-200 shadow-sm"
          >
            <LocateFixed className="w-[18px] h-[18px]" />
          </button>
        )}
      </div>

      {/* ── Suggestion Dropdown ──────────────────────────────────────────── */}
      {isOpen && suggestions.length > 0 && (
        <div
          className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-[#e5e7eb] rounded-xl shadow-lg overflow-hidden z-50"
          role="listbox"
        >
          {suggestions.map((suggestion, idx) => {
            const { primary, secondary } = parseSuggestion(suggestion);
            const isActive = idx === activeIndex;

            return (
              <button
                key={idx}
                onClick={() => handleSelect(suggestion)}
                onMouseEnter={() => setActiveIndex(idx)}
                role="option"
                aria-selected={isActive}
                className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors border-b border-[#f3f4f6] last:border-b-0
                  ${isActive ? 'bg-[#f0f4ff]' : 'hover:bg-[#f9fafb]'}`}
              >
                {/* Location pin icon */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${isActive ? 'bg-[#2563eb]/10' : 'bg-[#f3f4f6]'}`}>
                  <svg
                    className={`w-4 h-4 ${isActive ? 'text-[#2563eb]' : 'text-[#9ca3af]'}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                    />
                  </svg>
                </div>

                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-semibold truncate ${isActive ? 'text-[#111827]' : 'text-[#374151]'}`}>
                    {primary}
                  </div>
                  {secondary && (
                    <div className="text-xs text-[#9ca3af] truncate mt-0.5">
                      {secondary}
                    </div>
                  )}
                </div>
              </button>
            );
          })}

          {/* Mapbox attribution (required by ToS) */}
          <div className="px-4 py-2 bg-[#f9fafb] border-t border-[#e5e7eb]">
            <span className="text-[9px] text-[#9ca3af] font-medium">
              Powered by Mapbox
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
