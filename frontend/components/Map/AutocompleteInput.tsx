'use client';

import { useState, useEffect, useRef } from 'react';

// --- Local Debounce Hook to protect Nominatim API ---
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

interface Suggestion {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface AutocompleteInputProps {
  value: string;
  onChange: (val: string) => void;
  onEnter: () => void;
  placeholder: string;
  isStart?: boolean;
  children?: React.ReactNode; // For passing in the Locate button
}

export default function AutocompleteInput({
  value,
  onChange,
  onEnter,
  placeholder,
  isStart = false,
  children
}: AutocompleteInputProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const wrapperRef = useRef<HTMLDivElement>(null);

  // We only fetch when the user stops typing (debounced)
  const debouncedSearchTerm = useDebounce(value, 600);

  // 1. Fetch suggestions from OpenStreetMap Nominatim
  useEffect(() => {
    // Don't search if it's too short, or if the dropdown is closed (meaning they just selected something)
    if (debouncedSearchTerm.trim().length < 3 || !isOpen) {
      setSuggestions([]);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const fetchSuggestions = async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(debouncedSearchTerm)}&limit=4&addressdetails=1`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
        if (!res.ok) return;
        
        const data = await res.json();
        if (isMounted) {
          setSuggestions(data);
        }
      } catch (error) {
        console.error("Geocoding autocomplete failed", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchSuggestions();

    return () => { isMounted = false; };
  }, [debouncedSearchTerm, isOpen]);

  // 2. Handle clicks outside the dropdown to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (suggestion: Suggestion) => {
    // Fill the input with the clicked suggestion
    onChange(suggestion.display_name);
    setIsOpen(false);
    // Optional: Could automatically trigger search here, but we wait for user to hit enter or click search
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      {/* Icon Decorator */}
      {isStart ? (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#2563eb] ring-2 ring-[#2563eb]/20 z-10" />
      ) : (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-sm bg-[#111827] ring-2 ring-[#e5e7eb] z-10" />
      )}
      
      {/* Input Field */}
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true); // Open dropdown when typing
        }}
        onFocus={() => {
          if (value.length >= 3) setIsOpen(true);
        }}
        onKeyDown={(e) => e.key === 'Enter' && onEnter()}
        placeholder={placeholder}
        className="w-full relative z-0 bg-[#f9fafb] border border-[#e5e7eb] rounded-xl pl-9 pr-12 py-3.5 text-sm font-medium text-[#111827] focus:outline-none focus:bg-white focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10 transition-all placeholder:text-[#6b7280] placeholder:font-normal"
      />
      
      {/* Optional Children (Like the GPS Location Button) */}
      {children}

      {/* Auto-suggest Dropdown */}
      {isOpen && (suggestions.length > 0 || isLoading) && (
        <ul className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-lg max-h-60 overflow-auto divide-y divide-gray-50 top-full">
          {isLoading ? (
            <li className="px-4 py-3 text-sm text-gray-500 font-medium">Searching OpenStreetMap...</li>
          ) : (
            suggestions.map((suggestion) => {
              // Extract the main name vs the extended address for better UI readability
              const parts = suggestion.display_name.split(', ');
              const mainTitle = parts[0];
              const subTitle = parts.slice(1).join(', ');

              return (
                <li 
                  key={suggestion.place_id}
                  onClick={() => handleSelect(suggestion)}
                  className="px-4 py-3 cursor-pointer hover:bg-[#f9fafb] transition-colors flex flex-col gap-0.5 group"
                >
                  <span className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">{mainTitle}</span>
                  <span className="text-[11px] font-medium text-gray-500 line-clamp-1">{subTitle}</span>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
