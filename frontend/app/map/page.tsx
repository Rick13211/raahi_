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
        throw new Error("Could not find start location.");
      }
      if (!endData || endData.length === 0) {
        throw new Error("Could not find destination.");
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
        
        // Use Zustand properties to update DOM
        useRouteStore.getState().setRoutes(parsedRoutes);
        useRouteStore.getState().setActiveRouteIndex(0);
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
    <main className="flex h-[100dvh] w-screen overflow-hidden bg-black text-white font-sans flex-col md:flex-row">
      {/* Sidebar Panel */}
      <div className="w-full md:w-96 lg:w-[420px] h-[55vh] md:h-full bg-zinc-950 border-t md:border-t-0 md:border-r border-white/10 flex flex-col shadow-2xl z-10 p-6 md:p-8 order-2 md:order-1 shrink-0">
        <Link href="/" className="hidden md:flex items-center gap-3 mb-8 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L3 9h3v10h12V9h3L12 2z" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight">SafeStep</span>
        </Link>

        {/* Mobile Grab Handle */}
        <div className="w-12 h-1.5 bg-zinc-800 rounded-full mx-auto mb-6 md:hidden" />

        {/* Search Bar Section */}
        <div className="space-y-4 mb-4">
          <div>
            <label className="text-[10px] font-bold text-zinc-500 mb-1.5 block uppercase tracking-wider">Start Location</label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-500 border border-emerald-900" />
              <input
                type="text"
                value={startQuery}
                onChange={(e) => setStartQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRouteSearch()}
                placeholder="Enter start point..."
                className="w-full bg-zinc-900 border border-white/5 rounded-xl pl-9 pr-4 py-3.5 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:text-zinc-600"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-zinc-500 mb-1.5 block uppercase tracking-wider">Destination</label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-sm bg-cyan-500 border border-cyan-900" />
              <input
                type="text"
                value={endQuery}
                onChange={(e) => setEndQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRouteSearch()}
                placeholder="Where to?"
                className="w-full bg-zinc-900 border border-white/5 rounded-xl pl-9 pr-4 py-3.5 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-zinc-600"
              />
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
            {errorMsg}
          </div>
        )}

        <button
          onClick={handleRouteSearch}
          disabled={isLoading}
          className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 disabled:cursor-not-allowed text-black font-semibold tracking-wide rounded-xl py-4 transition-all shadow-lg shadow-emerald-500/20 mb-8 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
        >
          {isLoading ? 'Geocoding...' : 'Find Safest Route'}
          {!isLoading && (
            <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          )}
        </button>

        {/* Route Details Results Container */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Suggested Routes</span>
          </div>

          {routes.map((route, idx) => {
            const isActive = activeRouteIndex === idx;
            const minutes = Math.round(route.duration / 60);
            const km = (route.distance / 1000).toFixed(1);
            
            return (
              <div 
                key={idx}
                onClick={() => setActiveRouteIndex(idx)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden ${
                  isActive 
                  ? 'bg-zinc-900/40 border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]' 
                  : 'bg-zinc-900/20 border-white/5 hover:border-cyan-500/20 hover:bg-zinc-800/40'
                }`}
              >
                {isActive && (
                  <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl -mr-8 -mt-8" />
                )}
                
                <div className="flex justify-between items-start mb-3 relative z-10">
                  <div className="flex items-center gap-2">
                    {route.isFastest ? (
                      <div className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-400">
                        Fastest Choice
                      </div>
                    ) : (
                      <span className="text-sm font-medium text-zinc-300">Alternative Route</span>
                    )}
                  </div>
                  <span className={`text-sm font-semibold ${route.isFastest ? 'text-white' : 'text-zinc-400'}`}>
                    {minutes} mins
                  </span>
                </div>
                
                <div className="flex items-baseline gap-2 mb-2 relative z-10">
                   <span className="text-2xl font-bold text-white tracking-tight">{km}</span>
                   <span className="text-xs font-medium text-zinc-400">km Distance</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 w-full h-[45vh] md:h-full relative order-1 md:order-2">
        <Map />

        {/* Floating SOS Button */}
        <button className="absolute bottom-6 right-6 md:bottom-8 md:right-8 z-[1000] w-16 h-16 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center text-white shadow-xl shadow-red-500/30 transition-all hover:scale-105 active:scale-95 border-2 border-red-400/50 focus:outline-none focus:ring-4 focus:ring-red-500/50">
          <span className="font-bold text-base tracking-widest">SOS</span>
        </button>
      </div>
    </main>
  );
}