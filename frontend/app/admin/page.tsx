'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

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

export default function AdminDashboard() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState('');
  const [userEmail, setUserEmail] = useState('');

  // Reports
  const [reports, setReports] = useState<DashboardReport[]>([]);
  const [filterCity, setFilterCity] = useState('');
  const [filterState, setFilterState] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Image preview modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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

  // Fetch ALL reports (admin view — no user_only filter)
  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCity.trim()) params.set('city', filterCity.trim());
      if (filterState) params.set('state', filterState);

      const res = await fetch(`/api/dashboard?${params}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filterCity, filterState]);

  useEffect(() => {
    if (accessToken) fetchReports();
  }, [accessToken, fetchReports]);

  // Stats
  const uniqueCities = new Set(reports.map((r) => r.city.toLowerCase())).size;
  const uniqueStates = new Set(reports.map((r) => r.state)).size;
  const uniqueUsers = new Set(reports.map((r) => r.user_id)).size;

  return (
    <main className="min-h-screen bg-[#f9fafb]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#e5e7eb] shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/map" className="text-2xl font-extrabold tracking-tight text-[#111827] hover:opacity-80 transition-opacity">
              Raahi
            </Link>
            <span className="text-sm text-[#6b7280] font-medium hidden sm:inline">/ Admin Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="text-sm text-[#2563eb] hover:underline font-medium hidden sm:inline"
            >
              User Dashboard
            </Link>
            <span className="text-sm text-[#6b7280] hidden sm:inline">{userEmail}</span>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#111827] to-[#374151] flex items-center justify-center text-white text-sm font-bold">
              {userEmail.charAt(0).toUpperCase() || 'A'}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Reports" value={reports.length} icon="📊" color="blue" />
          <StatCard label="Cities" value={uniqueCities} icon="🏙️" color="purple" />
          <StatCard label="States" value={uniqueStates} icon="🗺️" color="green" />
          <StatCard label="Users" value={uniqueUsers} icon="👥" color="amber" />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="text-[11px] font-bold text-[#6b7280] mb-1.5 block uppercase tracking-wider">City</label>
              <input
                value={filterCity}
                onChange={(e) => setFilterCity(e.target.value)}
                placeholder="Search by city..."
                className="w-full bg-[#f9fafb] border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-sm text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:bg-white focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10 transition-all"
              />
            </div>
            <div className="flex-1">
              <label className="text-[11px] font-bold text-[#6b7280] mb-1.5 block uppercase tracking-wider">State</label>
              <select
                value={filterState}
                onChange={(e) => setFilterState(e.target.value)}
                className="w-full bg-[#f9fafb] border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-sm text-[#111827] focus:outline-none focus:bg-white focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10 transition-all appearance-none cursor-pointer"
              >
                <option value="">All states</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={fetchReports}
                className="px-6 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-medium rounded-xl transition-all flex items-center gap-2 shadow-[0_4px_14px_0_rgba(37,99,235,0.39)]"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                </svg>
                Filter
              </button>
              {(filterCity || filterState) && (
                <button
                  onClick={() => { setFilterCity(''); setFilterState(''); }}
                  className="px-4 py-2.5 bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#374151] text-sm font-medium rounded-xl transition-all"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Reports Table */}
        <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-[#f3f4f6]">
            <h2 className="text-lg font-bold text-[#111827]">All Reports</h2>
            <p className="text-xs text-[#6b7280] mt-0.5">{reports.length} report{reports.length !== 1 ? 's' : ''} found</p>
          </div>

          {isLoading ? (
            <div className="text-center py-16">
              <div className="w-8 h-8 mx-auto border-2 border-[#e5e7eb] border-t-[#2563eb] rounded-full animate-spin" />
              <p className="text-sm text-[#6b7280] mt-3">Loading reports...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-16">
              <svg className="w-14 h-14 mx-auto text-[#d1d5db] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
              <p className="text-sm font-medium text-[#6b7280]">No reports found</p>
              <p className="text-xs text-[#9ca3af] mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#f9fafb]">
                      <th className="text-left text-[11px] font-bold text-[#6b7280] uppercase tracking-wider px-6 py-3">Image</th>
                      <th className="text-left text-[11px] font-bold text-[#6b7280] uppercase tracking-wider px-6 py-3">City / State</th>
                      <th className="text-left text-[11px] font-bold text-[#6b7280] uppercase tracking-wider px-6 py-3">Description</th>
                      <th className="text-left text-[11px] font-bold text-[#6b7280] uppercase tracking-wider px-6 py-3">User</th>
                      <th className="text-left text-[11px] font-bold text-[#6b7280] uppercase tracking-wider px-6 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f3f4f6]">
                    {reports.map((report) => (
                      <tr key={report.id} className="hover:bg-[#f9fafb] transition-colors">
                        <td className="px-6 py-4">
                          {report.image_url ? (
                            <img
                              src={report.image_url}
                              alt=""
                              className="w-14 h-14 rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity border border-[#e5e7eb]"
                              onClick={() => setPreviewImage(report.image_url)}
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-lg bg-[#f3f4f6] flex items-center justify-center">
                              <svg className="w-5 h-5 text-[#9ca3af]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v13.5A1.5 1.5 0 003.75 21z" />
                              </svg>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-[#111827]">{report.city}</p>
                          <p className="text-xs text-[#6b7280]">{report.state}</p>
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <p className="text-sm text-[#374151] line-clamp-2">{report.description}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs text-[#6b7280] font-medium">{report.user_email}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-xs text-[#9ca3af]">
                            {new Date(report.created_at).toLocaleDateString('en-IN', {
                              day: 'numeric', month: 'short', year: 'numeric'
                            })}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden px-4 pb-4 space-y-3">
                {reports.map((report) => (
                  <div key={report.id} className="rounded-xl border border-[#e5e7eb] bg-[#f9fafb] overflow-hidden">
                    {report.image_url && (
                      <img
                        src={report.image_url}
                        alt=""
                        className="w-full h-40 object-cover cursor-pointer"
                        onClick={() => setPreviewImage(report.image_url)}
                      />
                    )}
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#2563eb]/10 text-[#2563eb] text-[11px] font-semibold rounded-lg">
                          {report.city}
                        </span>
                        <span className="text-[11px] text-[#9ca3af]">{report.state}</span>
                      </div>
                      <p className="text-sm text-[#374151] line-clamp-3 mb-2">{report.description}</p>
                      <div className="flex items-center justify-between text-[10px] text-[#9ca3af]">
                        <span>{report.user_email}</span>
                        <span>
                          {new Date(report.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh]">
            <img src={previewImage} alt="Full preview" className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain" />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center text-[#374151] hover:bg-[#f3f4f6] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

/* ── Stat Card ────────────────────────────────────────────────────────────── */

function StatCard({ label, value, icon, color }: {
  label: string;
  value: number;
  icon: string;
  color: 'blue' | 'purple' | 'green' | 'amber';
}) {
  const bgMap = {
    blue: 'bg-[#2563eb]/5 border-[#2563eb]/20',
    purple: 'bg-[#7c3aed]/5 border-[#7c3aed]/20',
    green: 'bg-[#16a34a]/5 border-[#16a34a]/20',
    amber: 'bg-[#d97706]/5 border-[#d97706]/20',
  };
  const textMap = {
    blue: 'text-[#2563eb]',
    purple: 'text-[#7c3aed]',
    green: 'text-[#16a34a]',
    amber: 'text-[#d97706]',
  };

  return (
    <div className={`rounded-2xl border p-5 ${bgMap[color]}`}>
      <div className="text-xl mb-1">{icon}</div>
      <p className={`text-2xl font-bold ${textMap[color]}`}>{value}</p>
      <p className="text-xs text-[#6b7280] font-medium mt-0.5">{label}</p>
    </div>
  );
}
