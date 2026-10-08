'use client';

// SOSButton — sends SOS alert with current GPS location
// Consumes: POST /api/sos { lat, lng, userId }
// Requires: Bearer auth token from Supabase session
// The backend stub logs alerts; real Twilio/SendGrid will be wired later

import { useState, useCallback } from 'react';
import { useRouteStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';

interface SOSButtonProps {
  className?: string;
}

export default function SOSButton({ className = '' }: SOSButtonProps) {
  const userLocation = useRouteStore((state) => state.userLocation);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSOS = useCallback(async () => {
    if (status === 'sending') return;

    // Confirm action
    const confirmed = window.confirm(
      '🚨 Emergency SOS\n\nThis will alert your emergency contacts with your current location.\n\nAre you sure you want to send an SOS?'
    );
    if (!confirmed) return;

    if (!userLocation) {
      setErrorMsg('Unable to get your location. Please enable GPS.');
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
      return;
    }

    setStatus('sending');
    setErrorMsg('');

    try {
      // Get current auth session
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        setErrorMsg('Please log in to use SOS.');
        setStatus('error');
        setTimeout(() => setStatus('idle'), 3000);
        return;
      }

      const res = await fetch('/api/sos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          lat: userLocation.lat,
          lng: userLocation.lng,
          userId: session.user.id,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send SOS');
      }

      setStatus('sent');
      setTimeout(() => setStatus('idle'), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'SOS failed. Call emergency services directly.');
      setStatus('error');
      setTimeout(() => setStatus('idle'), 5000);
    }
  }, [userLocation, status]);

  // Visual states
  const isIdle = status === 'idle';
  const isSending = status === 'sending';
  const isSent = status === 'sent';
  const isError = status === 'error';

  return (
    <div className="relative">
      <button
        onClick={handleSOS}
        disabled={isSending}
        className={`
          rounded-[14px] flex items-center justify-center transition-all
          focus:outline-none focus:ring-4 focus:ring-red-500/20
          ${isIdle ? 'bg-white hover:bg-[#f9fafb] border border-[#e5e7eb] text-red-600 shadow-sm hover:scale-105 active:scale-95' : ''}
          ${isSending ? 'bg-red-50 border-2 border-red-200 text-red-500 animate-pulse cursor-wait' : ''}
          ${isSent ? 'bg-green-50 border-2 border-green-300 text-green-600' : ''}
          ${isError ? 'bg-red-50 border-2 border-red-300 text-red-600' : ''}
          ${className}
        `}
        title={isSent ? 'SOS Sent' : isError ? errorMsg : 'Emergency SOS'}
      >
        {isSending ? (
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : isSent ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <span className="font-extrabold text-sm md:text-base tracking-widest relative z-10">SOS</span>
        )}
      </button>

      {/* Error tooltip */}
      {isError && errorMsg && (
        <div className="absolute top-full right-0 mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 font-medium whitespace-nowrap shadow-lg z-50">
          {errorMsg}
        </div>
      )}
    </div>
  );
}
