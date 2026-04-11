'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useState } from 'react';
import { useRouteStore } from '@/lib/store';
import { fetchRouteData } from '@/lib/routing';
import { LocateFixed } from 'lucide-react';
import RoutePanel from '@/components/Routing/RoutePanel';
import SOSButton from '@/components/UI/SOSButton';
import ReportModal from '@/components/Modals/ReportModal';

const Map = dynamic(() => import('@/components/Map/MapCanvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#f9fafb]">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 mx-auto border-2 border-[#e5e7eb] border-t-[#2563eb] rounded-full animate-spin" />
        <span className="text-sm font-medium text-[#6b7280] animate-pulse block">
          Initializing Map Engine...
        </span>
      </div>
    </div>
  )
});

export default function MapPage() {
  const [startQuery, setStartQuery] = useState('');
  const [endQuery, setEndQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const setOrigin = useRouteStore((state) => state.setOrigin);
  const setDestination = useRouteStore((state) => state.setDestination);
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
        setStartQuery(data.display_name);
      } else {
        setStartQuery(`${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}`);
      }
    } catch (err) {
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
      } else {
        setErrorMsg('No routes found between these locations.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Routing failed. Try being more specific with location names.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex h-[100dvh] w-screen overflow-hidden bg-[#ffffff] text-[#111827] font-sans flex-col md:flex-row">
      {/* Sidebar Panel */}
      <div className="w-full md:w-96 lg:w-[420px] h-[55vh] md:h-full bg-white border-t md:border-t-0 md:border-r border-[#e5e7eb] flex flex-col shadow-sm z-10 p-6 md:p-8 order-2 md:order-1 shrink-0 lg:rounded-r-2xl">
        {/* Logo */}
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

        {/* Error Banner */}
        {errorMsg && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl p-3.5 mb-4 font-medium flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{errorMsg}</span>
            <button
              onClick={() => setErrorMsg('')}
              className="ml-auto text-red-400 hover:text-red-600 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Search Button */}
        <button
          onClick={handleRouteSearch}
          disabled={isLoading}
          className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] disabled:bg-[#93c5fd] disabled:cursor-not-allowed text-white font-medium tracking-normal rounded-xl py-4 transition-all shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] mb-8 flex items-center justify-center gap-2 hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] active:translate-y-0 text-base"
        >
          {isLoading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Analyzing Routes...</span>
            </>
          ) : (
            <>
              Find Safest Route
              <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </>
          )}
        </button>

        {/* Route Results Panel */}
        <RoutePanel isLoading={isLoading} />

        {/* Report Button at bottom of sidebar */}
        <button
          onClick={() => setIsReportModalOpen(true)}
          className="mt-4 w-full py-3 rounded-xl border border-[#e5e7eb] bg-[#f9fafb] hover:bg-white text-sm font-medium text-[#6b7280] hover:text-[#111827] transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
          </svg>
          Report Safety Issue
        </button>
      </div>

      {/* Map Area */}
      <div className="flex-1 w-full h-[45vh] md:h-full relative order-1 md:order-2 bg-[#f9fafb]">
        <Map />

        {/* Floating SOS Button */}
        <div className="absolute top-6 right-6 md:top-8 md:right-8 z-[1000]">
          <SOSButton className="w-12 h-12 md:w-14 md:h-14" />
        </div>
      </div>

      {/* Report Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </main>
  );
}
