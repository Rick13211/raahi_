'use client';

// ReasonTagList — renders human-readable safety score explanation tags
// Consumes: RouteData.reasonTags (string[]) from store contract
// Tags come from safetyEngine.ts: e.g. "few_safe_zones_nearby", "late_night_travel", "poor_street_lighting"

const TAG_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  few_safe_zones_nearby: { label: 'Few Safe Zones', icon: '🏠', color: '#f59e0b' },
  high_report_density: { label: 'High Reports', icon: '⚠️', color: '#ef4444' },
  late_night_travel: { label: 'Late Night', icon: '🌙', color: '#6366f1' },
  poor_street_lighting: { label: 'Poorly Lit', icon: '💡', color: '#f59e0b' },
  poor_weather_rain: { label: 'Rain', icon: '🌧️', color: '#3b82f6' },
  poor_weather_drizzle: { label: 'Drizzle', icon: '🌦️', color: '#3b82f6' },
  poor_weather_thunderstorm: { label: 'Thunderstorm', icon: '⛈️', color: '#ef4444' },
  poor_weather_snow: { label: 'Snow', icon: '❄️', color: '#3b82f6' },
  poor_weather_mist: { label: 'Mist', icon: '🌫️', color: '#6b7280' },
  poor_weather_fog: { label: 'Fog', icon: '🌫️', color: '#6b7280' },
  poor_weather_haze: { label: 'Haze', icon: '🌫️', color: '#6b7280' },
};

interface ReasonTagListProps {
  tags: string[];
  compact?: boolean;
}

export default function ReasonTagList({ tags, compact = false }: ReasonTagListProps) {
  if (!tags || tags.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1.5 ${compact ? '' : 'mt-2'}`}>
      {tags.map((tag) => {
        const config = TAG_CONFIG[tag];
        const label = config?.label ?? tag.replace(/_/g, ' ').replace(/^poor weather /, '');
        const icon = config?.icon ?? '📌';
        const color = config?.color ?? '#6b7280';

        return (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border"
            style={{
              color,
              backgroundColor: `${color}08`,
              borderColor: `${color}20`,
            }}
          >
            <span className="text-[10px]">{icon}</span>
            {label}
          </span>
        );
      })}
    </div>
  );
}
