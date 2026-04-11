'use client';

// ReportModal — submit a community safety report
// Wires to: POST /api/reports { lat, lng, category, description }
// Requires: Bearer auth token from Supabase session
// Categories from types/index.ts: "dark_area" | "harassment" | "broken_light" | "suspicious" | "other"

import { useState, useCallback } from 'react';
import { useRouteStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import type { ReportCategory } from '@/types';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES: { value: ReportCategory; label: string; icon: string }[] = [
  { value: 'dark_area', label: 'Dark Area', icon: '🌑' },
  { value: 'harassment', label: 'Harassment', icon: '⚠️' },
  { value: 'broken_light', label: 'Broken Light', icon: '💡' },
  { value: 'suspicious', label: 'Suspicious Activity', icon: '👁️' },
  { value: 'other', label: 'Other', icon: '📌' },
];

export default function ReportModal({ isOpen, onClose }: ReportModalProps) {
  const userLocation = useRouteStore((state) => state.userLocation);

  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = useCallback(async () => {
    if (!category) {
      setErrorMsg('Please select a category.');
      return;
    }
    if (!userLocation) {
      setErrorMsg('Location unavailable. Please enable GPS.');
      return;
    }

    setStatus('submitting');
    setErrorMsg('');

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        setErrorMsg('Please log in to submit a report.');
        setStatus('error');
        return;
      }

      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          lat: userLocation.lat,
          lng: userLocation.lng,
          category,
          description: description.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to submit report');
      }

      setStatus('success');
      setTimeout(() => {
        onClose();
        // Reset form
        setCategory(null);
        setDescription('');
        setStatus('idle');
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Submission failed. Please try again.');
      setStatus('error');
    }
  }, [category, description, userLocation, onClose]);

  const handleClose = () => {
    if (status === 'submitting') return; // don't close while submitting
    onClose();
    setCategory(null);
    setDescription('');
    setStatus('idle');
    setErrorMsg('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl border border-[#e5e7eb] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#111827]">Report Safety Issue</h2>
            <p className="text-xs text-[#6b7280] mt-0.5">
              {userLocation
                ? `📍 at ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`
                : '📍 Location unavailable'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg bg-[#f3f4f6] hover:bg-[#e5e7eb] flex items-center justify-center text-[#6b7280] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Success state */}
        {status === 'success' ? (
          <div className="px-6 pb-8 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-green-50 border border-green-200 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-[#111827] mb-1">Report Submitted</h3>
            <p className="text-sm text-[#6b7280]">Thank you — your report is pending review.</p>
          </div>
        ) : (
          <>
            {/* Category Selection */}
            <div className="px-6 pb-4">
              <label className="text-[11px] font-bold text-[#6b7280] mb-2 block uppercase tracking-wider">
                Category
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setCategory(cat.value)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-left
                      ${category === cat.value
                        ? 'border-[#2563eb] bg-[#2563eb]/5 text-[#2563eb] shadow-sm'
                        : 'border-[#e5e7eb] bg-[#f9fafb] text-[#6b7280] hover:border-[#d1d5db]'
                      }`}
                  >
                    <span className="text-base">{cat.icon}</span>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="px-6 pb-4">
              <label className="text-[11px] font-bold text-[#6b7280] mb-1.5 block uppercase tracking-wider">
                Description <span className="font-normal text-[#9ca3af]">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue..."
                maxLength={2000}
                rows={3}
                className="w-full bg-[#f9fafb] border border-[#e5e7eb] rounded-xl px-4 py-3 text-sm text-[#111827] placeholder:text-[#9ca3af] resize-none focus:outline-none focus:bg-white focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10 transition-all"
              />
            </div>

            {/* Error */}
            {errorMsg && (
              <div className="mx-6 mb-4 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 font-medium flex items-center gap-2">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {errorMsg}
              </div>
            )}

            {/* Submit Button */}
            <div className="px-6 pb-6">
              <button
                onClick={handleSubmit}
                disabled={status === 'submitting' || !category}
                className="w-full bg-[#111827] hover:bg-[#1f2937] disabled:bg-[#9ca3af] disabled:cursor-not-allowed text-white font-medium rounded-xl py-3.5 transition-all flex items-center justify-center gap-2 text-sm"
              >
                {status === 'submitting' ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Submitting...
                  </>
                ) : (
                  'Submit Report'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
