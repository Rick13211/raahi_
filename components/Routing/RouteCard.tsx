'use client';

// RouteCard — displays a single scored route with safety badge and reason tags
// Consumes: RouteData from store contract

import type { RouteData } from '@/lib/store';
import SafetyScoreBadge from '@/components/UI/SafetyScoreBadge';
import ReasonTagList from '@/components/UI/ReasonTagList';

interface RouteCardProps {
  route: RouteData;
  index: number;
  isActive: boolean;
  onSelect: () => void;
}

export default function RouteCard({ route, index, isActive, onSelect }: RouteCardProps) {
  const minutes = Math.round(route.duration / 60);
  const km = (route.distance / 1000).toFixed(1);
  const score = route.safetyScore ?? 0;

  // Border and glow: safest = green, active = blue, default = grey
  let cardBorder = 'border-[#e5e7eb] shadow-sm hover:border-[#d1d5db]';
  if (route.isSafest) cardBorder = 'border-[#16a34a] border-2 shadow-[0_0_12px_rgba(22,163,74,0.15)]';
  else if (isActive) cardBorder = 'border-[#2563eb] border-2 shadow-md';

  // Format time display
  const timeDisplay = minutes >= 60
    ? `${Math.floor(minutes / 60)} hr ${minutes % 60} min`
    : `${minutes} min`;

  return (
    <div
      onClick={onSelect}
      className={`p-5 bg-white rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${cardBorder}`}
    >
      {/* Header — badges + time */}
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
          {timeDisplay}
        </span>
      </div>

      {/* Distance */}
      <div className="flex items-baseline gap-2 mb-3 relative z-10">
        <span className={`text-3xl font-black tracking-tight ${isActive ? 'text-[#111827]' : 'text-[#6b7280]'}`}>
          {km}
        </span>
        <span className={`text-xs font-semibold ${isActive ? 'text-[#2563eb]' : 'text-[#6b7280]'}`}>
          km
        </span>
      </div>

      {/* Safety Score Bar */}
      <SafetyScoreBadge score={score} />

      {/* Reason Tags */}
      {route.reasonTags && route.reasonTags.length > 0 && (
        <ReasonTagList tags={route.reasonTags} />
      )}
    </div>
  );
}
