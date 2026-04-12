"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type DailyPoint = {
  date: string;
  reports: number;
  avgSafety: number;
};

type DistributionPoint = {
  bucket: number;
  count: number;
};

type SplitPoint = {
  label: string;
  value: number;
};

type AnalyticsResponse = {
  meta: {
    days: number;
    totalReports: number;
    generatedAt: string;
  };
  daily: DailyPoint[];
  crowdDistribution: DistributionPoint[];
  safetyDistribution: DistributionPoint[];
  theftSplit: SplitPoint[];
  lampSplit: SplitPoint[];
};

const PIE_COLORS = ["#ef4444", "#22c55e", "#f59e0b", "#3b82f6"];

function formatDateLabel(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7280]">{label}</p>
      <p className="mt-2 text-3xl font-bold text-[#111827]">{value}</p>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-[#111827]">{title}</h2>
      <p className="mt-1 text-sm text-[#6b7280]">{subtitle}</p>
      <div className="mt-4 h-72">{children}</div>
    </section>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadAnalytics() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/reports/analytics?days=${days}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Failed to fetch analytics");
        }

        const json: AnalyticsResponse = await res.json();
        if (mounted) setData(json);
      } catch {
        if (mounted) setError("Could not load analytics right now.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadAnalytics();
    return () => {
      mounted = false;
    };
  }, [days]);

  const avgSafetyOverall = useMemo(() => {
    if (!data || data.daily.length === 0) return "-";
    const total = data.daily.reduce((acc, cur) => acc + cur.avgSafety, 0);
    return (total / data.daily.length).toFixed(2);
  }, [data]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#e0f2fe_0,_#f8fafc_42%,_#fff_100%)] text-[#111827]">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 rounded-2xl border border-[#bfdbfe] bg-white/80 p-5 backdrop-blur sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2563eb]">Raahi Insights</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Community Safety Analytics</h1>
            <p className="mt-2 text-sm text-[#4b5563]">
              Trends from your crowd-sourced reports table in Supabase.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-[#374151]" htmlFor="days-range">
              Window
            </label>
            <select
              id="days-range"
              className="rounded-lg border border-[#d1d5db] bg-white px-3 py-2 text-sm font-medium outline-none ring-[#93c5fd] focus:ring-2"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
            </select>
            <Link
              href="/map"
              className="rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
            >
              Back to Map
            </Link>
          </div>
        </header>

        {loading && (
          <div className="rounded-2xl border border-[#e5e7eb] bg-white p-10 text-center text-sm font-medium text-[#6b7280]">
            Loading analytics...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && data && (
          <>
            <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Total Reports" value={data.meta.totalReports} />
              <StatCard label="Avg Safety" value={avgSafetyOverall} />
              <StatCard label="Date Window" value={`${data.meta.days} days`} />
              <StatCard
                label="Last Updated"
                value={new Date(data.meta.generatedAt).toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              />
            </section>

            <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <ChartCard
                title="Daily Report Volume"
                subtitle="How many reports were submitted each day"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.daily}>
                    <defs>
                      <linearGradient id="reportsFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={formatDateLabel} />
                    <YAxis allowDecimals={false} />
                    <Tooltip labelFormatter={(value) => formatDateLabel(String(value))} />
                    <Area
                      type="monotone"
                      dataKey="reports"
                      stroke="#1d4ed8"
                      fillOpacity={1}
                      fill="url(#reportsFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="Average Safety Over Time"
                subtitle="Mean safety rating from reports"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.daily}>
                    <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={formatDateLabel} />
                    <YAxis domain={[1, 5]} />
                    <Tooltip labelFormatter={(value) => formatDateLabel(String(value))} />
                    <Line
                      type="monotone"
                      dataKey="avgSafety"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ r: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="Crowd Level Distribution"
                subtitle="How crowded reported locations are"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.crowdDistribution}>
                    <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                    <XAxis dataKey="bucket" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="Theft Indicator Split"
                subtitle="Percentage of reports with theft marked"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip />
                    <Legend />
                    <Pie
                      data={data.theftSplit}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={95}
                      label
                    >
                      {data.theftSplit.map((entry, index) => (
                        <Cell key={entry.label} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="Street Lamp Status"
                subtitle="Working lights vs non-working lights"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip />
                    <Legend />
                    <Pie
                      data={data.lampSplit}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={95}
                      label
                    >
                      {data.lampSplit.map((entry, index) => (
                        <Cell key={entry.label} fill={PIE_COLORS[(index + 1) % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
