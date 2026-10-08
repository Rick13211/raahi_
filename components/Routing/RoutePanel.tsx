'use client';

// RoutePanel — container for route search results with empty/loading states

import { useRouteStore } from '@/lib/store';
import RouteCard from '@/components/Routing/RouteCard';

interface RoutePanelProps {
  isLoading: boolean;
}

export default function RoutePanel({ isLoading }: RoutePanelProps) {
  const routes = useRouteStore((state) => state.routes);
  const activeRouteIndex = useRouteStore((state) => state.activeRouteIndex);
  const setActiveRouteIndex = useRouteStore((state) => state.setActiveRouteIndex);

  return (
    <div className="flex-1 overflow-y-auto pr-2 space-y-4 -mr-2 scrollbar-thin scrollbar-thumb-[#e5e7eb]">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1.5 h-1.5 rounded-full bg-[#e5e7eb]" />
        <span className="text-[11px] font-bold text-[#6b7280] uppercase tracking-wider">
          Suggested Routes
        </span>
        {routes.length > 0 && (
          <span className="text-[10px] font-semibold text-[#9ca3af] bg-[#f3f4f6] px-1.5 py-0.5 rounded-md">
            {routes.length}
          </span>
        )}
      </div>

      {/* Loading skeleton */}
      {isLoading && routes.length === 0 && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="p-5 bg-[#f9fafb] rounded-2xl border border-[#e5e7eb] animate-pulse">
              <div className="flex justify-between items-start mb-3">
                <div className="h-5 w-20 bg-[#e5e7eb] rounded-md" />
                <div className="h-4 w-14 bg-[#e5e7eb] rounded-md" />
              </div>
              <div className="h-8 w-16 bg-[#e5e7eb] rounded-md mb-3" />
              <div className="h-1.5 w-full bg-[#e5e7eb] rounded-full" />
            </div>
          ))}
          <div className="text-center py-2">
            <span className="text-xs text-[#9ca3af] font-medium animate-pulse">
              Analyzing route safety...
            </span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && routes.length === 0 && (
        <div className="text-center py-12 px-4">
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-[#f3f4f6] border border-[#e5e7eb] flex items-center justify-center">
            <svg className="w-6 h-6 text-[#9ca3af]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-[#6b7280] mb-1">No routes yet</h3>
          <p className="text-xs text-[#9ca3af] leading-relaxed max-w-[200px] mx-auto">
            Enter a start and destination above to find safety-scored routes.
          </p>
        </div>
      )}

      {/* Route cards */}
      {routes.map((route, idx) => (
        <RouteCard
          key={idx}
          route={route}
          index={idx}
          isActive={activeRouteIndex === idx}
          onSelect={() => setActiveRouteIndex(idx)}
        />
      ))}
    </div>
  );
}
