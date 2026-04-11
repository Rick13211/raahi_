'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useState } from 'react';
import { useRouteStore } from '@/lib/store';
import { fetchRouteData } from '@/lib/routing';
import { LocateFixed } from 'lucide-react';

const Map = dynamic(() => import('@/components/Map/MapCanvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-emerald-400">
      <span className="animate-pulse font-medium">Initializing Routing Engine...</span>
    </div>
  )
});

export default function MapPage() {
  const [startQuery, setStartQuery] = useState('');
  const [endQuery, setEndQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const setOrigin = useRouteStore((state) => state.setOrigin);
  const setDestination = useRouteStore((state) => state.setDestination);
  const routes = useRouteStore((state) => state.routes);
  const activeRouteIndex = useRouteStore((state) => state.activeRouteIndex);
  const setRoutes = useRouteStore((state) => state.setRoutes);
  const setActiveRouteIndex = useRouteStore((state) => state.setActiveRouteIndex);
  const userLocation = useRouteStore((state) => state.userLocation);

  const handleUseCurrentLocation = async () => {
    if (!userLocation) {
      setErrorMsg('Waiting for precise GPS location from your device...');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLocation.lat}&lon=${userLocation.lng}`);
      if (!res.ok) throw new Error('Reverse geocoding failed');
      
      const data = await res.json();
      if (data && data.display_name) {
        setStartQuery(data.display_name); // Populates the Start input with real address
      } else {
        setStartQuery(`${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}`);
      }
    } catch (err) {
      // Fallback
      setStartQuery(`${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRouteSearch = async () => {
    if (!startQuery.trim() || !endQuery.trim()) {
      setErrorMsg('Please provide both start and destination locations.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const result = await fetchRouteData(startQuery, endQuery);
      
      setOrigin(result.origin);
      setDestination(result.destination);
      
      if (result.routes && result.routes.length > 0) {
        setRoutes(result.routes);
        setActiveRouteIndex(0);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Geocoding failed. Try being more specific.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex h-[100dvh] w-screen overflow-hidden bg-[#ffffff] text-[#111827] font-sans flex-col md:flex-row">
      {/* Sidebar Panel */}
      <div className="w-full md:w-96 lg:w-[420px] h-[55vh] md:h-full bg-white border-t md:border-t-0 md:border-r border-[#e5e7eb] flex flex-col shadow-sm z-10 p-6 md:p-8 order-2 md:order-1 shrink-0 lg:rounded-r-2xl">
        <Link href="/" className="hidden md:flex items-center gap-3 mb-8 hover:opacity-80 transition-opacity">
          <span className="text-2xl font-extrabold tracking-tight text-[#111827]">Raahi</span>
        </Link>

        {/* Mobile Grab Handle */}
        <div className="w-12 h-1.5 bg-[#e5e7eb] rounded-full mx-auto mb-6 md:hidden" />

        {/* Search Bar Section */}
        <div className="space-y-4 mb-4">
          <div>
            <label className="text-[11px] font-bold text-[#6b7280] mb-1.5 block uppercase tracking-wider">Start Location</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#2563eb] ring-2 ring-[#2563eb]/20" />
              <input
                type="text"
                value={startQuery}
                onChange={(e) => setStartQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRouteSearch()}
                placeholder="Enter start point..."
                className="w-full bg-[#f9fafb] border border-[#e5e7eb] rounded-xl pl-9 pr-12 py-3.5 text-sm font-medium text-[#111827] focus:outline-none focus:bg-white focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10 transition-all placeholder:text-[#6b7280] placeholder:font-normal"
              />
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                title="Use Current Location"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-[#2563eb] hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center bg-white border border-gray-200 shadow-sm"
              >
                <LocateFixed className="w-[18px] h-[18px]" />
              </button>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold text-[#6b7280] mb-1.5 block uppercase tracking-wider">Destination</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-sm bg-[#111827] ring-2 ring-[#e5e7eb]" />
              <input
                type="text"
                value={endQuery}
                onChange={(e) => setEndQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRouteSearch()}
                placeholder="Where to?"
                className="w-full bg-[#f9fafb] border border-[#e5e7eb] rounded-xl pl-9 pr-4 py-3.5 text-sm font-medium text-[#111827] focus:outline-none focus:bg-white focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10 transition-all placeholder:text-[#6b7280] placeholder:font-normal"
              />
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl p-3.5 mb-4 font-medium flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {errorMsg}
          </div>
        )}

        <button
          onClick={handleRouteSearch}
          disabled={isLoading}
          className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] disabled:bg-[#93c5fd] disabled:cursor-not-allowed text-white font-medium tracking-normal rounded-xl py-4 transition-all shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] mb-8 flex items-center justify-center gap-2 hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] active:translate-y-0 text-base"
        >
          {isLoading ? 'Geocoding...' : 'Find Safest Route'}
          {!isLoading && (
            <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          )}
        </button>

        {/* Route Details Results Container */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-4 -mr-2 scrollbar-thin scrollbar-thumb-[#e5e7eb]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#e5e7eb]" />
            <span className="text-[11px] font-bold text-[#6b7280] uppercase tracking-wider">Suggested Routes</span>
          </div>

          {routes.map((route, idx) => {
            const isActive = activeRouteIndex === idx;
            const minutes = Math.round(route.duration / 60);
            const km = (route.distance / 1000).toFixed(1);
            const score = route.safetyScore ?? 0;

            // Border and glow: safest = green, active = blue, default = grey
            let cardBorder = 'border-[#e5e7eb] shadow-sm hover:border-[#d1d5db]';
            if (route.isSafest) cardBorder = 'border-[#16a34a] border-2 shadow-[0_0_12px_rgba(22,163,74,0.15)]';
            else if (isActive) cardBorder = 'border-[#2563eb] border-2 shadow-md';

            // Score bar colour
            const scoreColor = score >= 70 ? '#16a34a' : score >= 45 ? '#f59e0b' : '#ef4444';

            return (
              <div
                key={idx}
                onClick={() => setActiveRouteIndex(idx)}
                className={`p-5 bg-white rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${cardBorder}`}
              >
                <div className="flex justify-between items-start mb-3 relative z-10">
                  <div className="flex items-center gap-2 flex-wrap">
                    {route.isSafest && (
                      <div className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#16a34a]/10 text-[#16a34a] border border-[#16a34a]/20">
                        Safest Route
                      </div>
                    )}
                    {route.isFastest && (
                      <div className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#2563eb]/10 text-[#2563eb] border border-[#2563eb]/20">
                        Fastest
                      </div>
                    )}
                    {!route.isSafest && !route.isFastest && (
                      <span className="text-sm font-bold text-[#6b7280]">Alternative</span>
                    )}
                  </div>
                  <span className={`text-sm font-bold ${isActive ? 'text-[#111827]' : 'text-[#6b7280]'}`}>
                    {minutes > 60 ? `${(minutes % 60)} hrs ${(minutes / 60).toFixed(1)} mins` : `${minutes} mins`}
                  </span>
                </div>

                <div className="flex items-baseline gap-2 mb-3 relative z-10">
                  <span className={`text-3xl font-black tracking-tight ${isActive ? 'text-[#111827]' : 'text-[#6b7280]'}`}>
                    {km}
                  </span>
                  <span className={`text-xs font-semibold ${isActive ? 'text-[#2563eb]' : 'text-[#6b7280]'}`}>
                    km
                  </span>
                </div>

                {/* Safety Score Bar */}
                <div className="relative z-10">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">Safety Score</span>
                    <span className="text-xs font-bold" style={{ color: scoreColor }}>{score}/100</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#f3f4f6] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${score}%`, backgroundColor: scoreColor }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 w-full h-[45vh] md:h-full relative order-1 md:order-2 bg-[#f9fafb]">
        <Map />

        {/* Floating SOS Button relocated to top right to clear Zoom controls */}
        <button className="absolute top-6 right-6 md:top-8 md:right-8 z-[1000] w-12 h-12 md:w-14 md:h-14 rounded-[14px] bg-white hover:bg-[#f9fafb] border border-[#e5e7eb] flex items-center justify-center text-red-600 shadow-sm transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-red-500/20 group">
          <span className="font-extrabold text-sm md:text-base tracking-widest relative z-10">SOS</span>
        </button>
      </div>
    </main>
  );
}
