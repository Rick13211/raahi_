'use client';

// SafetyScoreBadge — displays a 0–100 safety score with color-coded bar
// Consumes: RouteData.safetyScore from store (0–100 integer)

interface SafetyScoreBadgeProps {
  score: number;        // 0–100
  size?: 'sm' | 'md';   // sm = compact inline, md = full bar
}

export default function SafetyScoreBadge({ score, size = 'md' }: SafetyScoreBadgeProps) {
  const scoreColor = score >= 70 ? '#16a34a' : score >= 45 ? '#f59e0b' : '#ef4444';
  const scoreLabel = score >= 70 ? 'Safe' : score >= 45 ? 'Moderate' : 'Caution';

  if (size === 'sm') {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border"
        style={{
          color: scoreColor,
          backgroundColor: `${scoreColor}10`,
          borderColor: `${scoreColor}30`,
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: scoreColor }}
        />
        {score}
      </span>
    );
  }

  return (
    <div className="relative z-10">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">
          Safety Score
        </span>
        <div className="flex items-center gap-1.5">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: scoreColor }}
          >
            {scoreLabel}
          </span>
          <span className="text-xs font-bold" style={{ color: scoreColor }}>
            {score}/100
          </span>
        </div>
      </div>
      <div className="w-full h-1.5 bg-[#f3f4f6] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, backgroundColor: scoreColor }}
        />
      </div>
    </div>
  );
}
