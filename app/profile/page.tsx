'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// ── Indian states list for the dropdown ──────────────────────────────────────
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Chandigarh', 'Puducherry',
];

interface DashboardReport {
  id: string;
  user_id: string;
  user_email: string;
  city: string;
  state: string;
  description: string;
  image_url: string | null;
  created_at: string;
}

export default function UserDashboard() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auth
  const [accessToken, setAccessToken] = useState('');
  const [userEmail, setUserEmail] = useState('');

  // Upload form
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadError, setUploadError] = useState('');

  // Reports list
  const [reports, setReports] = useState<DashboardReport[]>([]);
  const [filterCity, setFilterCity] = useState('');
  const [filterState, setFilterState] = useState('');
  const [isLoadingReports, setIsLoadingReports] = useState(false);

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setAccessToken(session.access_token);
      setUserEmail(session.user.email ?? '');
    };
    checkAuth();
  }, [router]);

  // Fetch reports
  const fetchReports = useCallback(async () => {
    if (!accessToken) return;
    setIsLoadingReports(true);
    try {
      const params = new URLSearchParams({ user_only: 'true' });
      if (filterCity.trim()) params.set('city', filterCity.trim());
      if (filterState) params.set('state', filterState);

      const res = await fetch(`/api/dashboard?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setIsLoadingReports(false);
    }
  }, [accessToken, filterCity, filterState]);

  useEffect(() => {
    if (accessToken) fetchReports();
  }, [accessToken, fetchReports]);

  // ── Image handling ─────────────────────────────────────────────────────────
  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file (JPG, PNG, etc.)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be under 5MB.');
      return;
    }
    setImageFile(file);
    setUploadError('');
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!city.trim() || !state || !description.trim()) {
      setUploadError('Please fill in city, state, and description.');
      return;
    }

    setUploadStatus('uploading');
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('city', city.trim());
      formData.append('state', state);
      formData.append('description', description.trim());
      if (imageFile) formData.append('image', imageFile);

      const res = await fetch('/api/dashboard', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Upload failed');
      }

      setUploadStatus('success');
      // Reset form
      setCity('');
      setState('');
      setDescription('');
      clearImage();
      fetchReports();

      setTimeout(() => setUploadStatus('idle'), 3000);
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed. Please try again.');
      setUploadStatus('error');
    }
  };

  return (
    <main className="min-h-screen bg-[#f9fafb]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#e5e7eb] shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/map" className="text-2xl font-extrabold tracking-tight text-[#111827] hover:opacity-80 transition-opacity">
              Raahi
            </Link>
            <span className="text-sm text-[#6b7280] font-medium hidden sm:inline">/ User Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#6b7280] hidden sm:inline">{userEmail}</span>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#2563eb] to-[#7c3aed] flex items-center justify-center text-white text-sm font-bold">
              {userEmail.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* ── Upload Section (left 2 cols) ──────────────────────────────── */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-sm overflow-hidden">
              <div className="px-6 pt-6 pb-4">
                <h2 className="text-lg font-bold text-[#111827]">Submit a Report</h2>
                <p className="text-xs text-[#6b7280] mt-1">Upload an image and provide safety details</p>
              </div>

              <div className="px-6 pb-6 space-y-4">
                {/* Image Upload / Drag-Drop Zone */}
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    relative rounded-xl border-2 border-dashed transition-all cursor-pointer
                    flex flex-col items-center justify-center min-h-[180px] overflow-hidden
                    ${isDragging
                      ? 'border-[#2563eb] bg-[#2563eb]/5'
                      : imagePreview
                        ? 'border-[#e5e7eb] bg-[#f9fafb]'
                        : 'border-[#d1d5db] bg-[#f9fafb] hover:border-[#2563eb] hover:bg-[#2563eb]/5'
                    }
                  `}
                >
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                      <button
                        onClick={(e) => { e.stopPropagation(); clearImage(); }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </>
                  ) : (
                    <div className="text-center p-6">
                      <svg className="w-10 h-10 mx-auto text-[#9ca3af] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v13.5A1.5 1.5 0 003.75 21z" />
                      </svg>
                      <p className="text-sm font-medium text-[#374151]">
                        Drop an image here or <span className="text-[#2563eb]">click to browse</span>
                      </p>
                      <p className="text-xs text-[#9ca3af] mt-1">JPG, PNG up to 5MB</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageFile(file);
                    }}
                  />
                </div>

                {/* City */}
                <div>
                  <label className="text-[11px] font-bold text-[#6b7280] mb-1.5 block uppercase tracking-wider">City</label>
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Patna"
                    className="w-full bg-[#f9fafb] border border-[#e5e7eb] rounded-xl px-4 py-3 text-sm text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:bg-white focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10 transition-all"
                  />
                </div>

                {/* State */}
                <div>
                  <label className="text-[11px] font-bold text-[#6b7280] mb-1.5 block uppercase tracking-wider">State</label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full bg-[#f9fafb] border border-[#e5e7eb] rounded-xl px-4 py-3 text-sm text-[#111827] focus:outline-none focus:bg-white focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10 transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Select state...</option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="text-[11px] font-bold text-[#6b7280] mb-1.5 block uppercase tracking-wider">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the safety concern, road condition, etc..."
                    maxLength={2000}
                    rows={4}
                    className="w-full bg-[#f9fafb] border border-[#e5e7eb] rounded-xl px-4 py-3 text-sm text-[#111827] placeholder:text-[#9ca3af] resize-none focus:outline-none focus:bg-white focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10 transition-all"
                  />
                </div>

                {/* Error */}
                {uploadError && (
                  <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 font-medium flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {uploadError}
                  </div>
                )}

                {/* Success */}
                {uploadStatus === 'success' && (
                  <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-xl p-3 font-medium flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Report submitted successfully!
                  </div>
                )}

                {/* Submit Button */}
                <button
                  onClick={handleSubmit}
                  disabled={uploadStatus === 'uploading'}
                  className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] disabled:bg-[#93c5fd] disabled:cursor-not-allowed text-white font-medium rounded-xl py-3.5 transition-all shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] flex items-center justify-center gap-2 text-sm"
                >
                  {uploadStatus === 'uploading' ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      Submit Report
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* ── Reports List (right 3 cols) ───────────────────────────────── */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-sm overflow-hidden">
              <div className="px-6 pt-6 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-[#111827]">My Reports</h2>
                  <p className="text-xs text-[#6b7280] mt-0.5">{reports.length} report{reports.length !== 1 ? 's' : ''} found</p>
                </div>
              </div>

              {/* Filters */}
              <div className="px-6 pb-4 flex flex-col sm:flex-row gap-3">
                <input
                  value={filterCity}
                  onChange={(e) => setFilterCity(e.target.value)}
                  placeholder="Filter by city..."
                  className="flex-1 bg-[#f9fafb] border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-sm text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:bg-white focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10 transition-all"
                />
                <select
                  value={filterState}
                  onChange={(e) => setFilterState(e.target.value)}
                  className="flex-1 bg-[#f9fafb] border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-sm text-[#111827] focus:outline-none focus:bg-white focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10 transition-all appearance-none cursor-pointer"
                >
                  <option value="">All states</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button
                  onClick={fetchReports}
                  className="px-5 py-2.5 bg-[#111827] hover:bg-[#1f2937] text-white text-sm font-medium rounded-xl transition-all flex items-center gap-2 shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  Search
                </button>
              </div>

              {/* Reports Grid */}
              <div className="px-6 pb-6">
                {isLoadingReports ? (
                  <div className="text-center py-12">
                    <div className="w-8 h-8 mx-auto border-2 border-[#e5e7eb] border-t-[#2563eb] rounded-full animate-spin" />
                    <p className="text-sm text-[#6b7280] mt-3">Loading reports...</p>
                  </div>
                ) : reports.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-12 h-12 mx-auto text-[#d1d5db] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    <p className="text-sm font-medium text-[#6b7280]">No reports yet</p>
                    <p className="text-xs text-[#9ca3af] mt-1">Submit your first report using the form</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {reports.map((report) => (
                      <ReportCard key={report.id} report={report} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ── Report Card ──────────────────────────────────────────────────────────── */

function ReportCard({ report }: { report: DashboardReport }) {
  return (
    <div className="rounded-xl border border-[#e5e7eb] bg-[#f9fafb] overflow-hidden hover:shadow-md transition-shadow group">
      {report.image_url && (
        <div className="h-36 overflow-hidden">
          <img
            src={report.image_url}
            alt="Report"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#2563eb]/10 text-[#2563eb] text-[11px] font-semibold rounded-lg">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            {report.city}
          </span>
          <span className="text-[11px] text-[#9ca3af] font-medium">{report.state}</span>
        </div>
        <p className="text-sm text-[#374151] line-clamp-3 leading-relaxed">{report.description}</p>
        <p className="text-[10px] text-[#9ca3af] mt-3">
          {new Date(report.created_at).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
          })}
        </p>
      </div>
    </div>
  );
}
