'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useState } from 'react';
import { useRouteStore } from '@/lib/store';

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

  const handleRouteSearch = async () => {
    if (!startQuery.trim() || !endQuery.trim()) {
      setErrorMsg('Please provide both start and destination locations.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      // 1. Geocode Start Location
      const startRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(startQuery)}`);
      const startData = await startRes.json();

      // 2. Geocode Destination Location
      const endRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endQuery)}`);
      const endData = await endRes.json();

      if (!startData || startData.length === 0) {
        throw new Error('Could not find start location.');
      }
      if (!endData || endData.length === 0) {
        throw new Error('Could not find destination.');
      }

      setOrigin({
        lat: parseFloat(startData[0].lat),
        lng: parseFloat(startData[0].lon),
        address: startData[0].display_name
      });

      setDestination({
        lat: parseFloat(endData[0].lat),
        lng: parseFloat(endData[0].lon),
        address: endData[0].display_name
      });

      // 3. Fetch Route from OSRM
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startData[0].lon},${startData[0].lat};${endData[0].lon},${endData[0].lat}?alternatives=true&geometries=geojson&overview=full`;
      console.log('Fetching from OSRM URL:', osrmUrl);

      const osrmRes = await fetch(osrmUrl);
      const osrmData = await osrmRes.json();
      console.log('OSRM Raw Response:', osrmData);

      if (osrmData && osrmData.routes) {
        const parsedRoutes = osrmData.routes.map((r: any, idx: number) => ({
          duration: Math.round(r.duration),
          distance: Math.round(r.distance),
          coordinates: r.geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]]),
          isFastest: idx === 0
        }));

        console.log('Parsed Routes saved to store:', parsedRoutes);
        setRoutes(parsedRoutes);
        setActiveRouteIndex(0);
      } else {
        console.warn('No routes found in OSRM response');
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
                className="w-full bg-[#f9fafb] border border-[#e5e7eb] rounded-xl pl-9 pr-4 py-3.5 text-sm font-medium text-[#111827] focus:outline-none focus:bg-white focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10 transition-all placeholder:text-[#6b7280] placeholder:font-normal"
              />
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

            return (
              <div
                key={idx}
                onClick={() => setActiveRouteIndex(idx)}
                className={`p-5 bg-white rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                  isActive 
                  ? 'border-[#2563eb] shadow-md border-2' 
                  : 'border-[#e5e7eb] shadow-sm hover:border-[#d1d5db]'
                }`}
              >
                <div className="flex justify-between items-start mb-3 relative z-10">
                  <div className="flex items-center gap-2">
                    {route.isFastest ? (
                      <div className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#059669]/10 text-[#059669] border border-[#059669]/20">
                        Fastest Choice
                      </div>
                    ) : (
                      <span className="text-sm font-bold text-[#6b7280]">Alternative Route</span>
                    )}
                  </div>
                  <span className={`text-sm font-bold ${isActive ? 'text-[#111827]' : 'text-[#6b7280]'}`}>
                    {minutes} mins
                  </span>
                </div>

                <div className="flex items-baseline gap-2 mb-2.5 relative z-10">
                  <span className={`text-3xl font-black tracking-tight ${isActive ? 'text-[#111827]' : 'text-[#6b7280]'}`}>
                    {km}
                  </span>
                  <span className={`text-xs font-semibold ${isActive ? 'text-[#2563eb]' : 'text-[#6b7280]'}`}>
                    km Distance
                  </span>
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
