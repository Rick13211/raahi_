import { create } from 'zustand';

// ─── Types ───────────────────────────────────────────────────────────────────

type Location = {
  lat: number;
  lng: number;
  address: string;
};

export type RouteData = {
  duration: number;            // in seconds
  distance: number;            // in meters
  coordinates: [number, number][]; // Array of [lat, lng]
  isFastest: boolean;
  isSafest: boolean;           // true for the highest safety-scored route
  safetyScore: number;         // 0–100
  reasonTags: string[];        // human-readable score explanation tags
};

export type SafeZoneData = {
  id: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  hours: string | null;
};

export type ReportData = {
  id: string;
  category: string;
  description: string | null;
  lat: number;
  lng: number;
  created_at: string;
};

type RouteState = {
  // Routing
  origin: Location | null;
  destination: Location | null;
  routes: RouteData[];
  activeRouteIndex: number;
  isLoadingRoutes: boolean;

  // Map overlays
  safeZones: SafeZoneData[];
  reports: ReportData[];

  // Modals & UI
  reportModalOpen: boolean;
  sosStatus: 'idle' | 'sending' | 'sent' | 'error';

  // Actions
  setOrigin: (loc: Location) => void;
  setDestination: (loc: Location) => void;
  setRoutes: (routes: RouteData[]) => void;
  setActiveRouteIndex: (idx: number) => void;
  setIsLoadingRoutes: (loading: boolean) => void;
  setSafeZones: (zones: SafeZoneData[]) => void;
  setReports: (reports: ReportData[]) => void;
  setReportModalOpen: (open: boolean) => void;
  setSosStatus: (status: 'idle' | 'sending' | 'sent' | 'error') => void;
};

// ─── Store ───────────────────────────────────────────────────────────────────

export const useRouteStore = create<RouteState>((set) => ({
  origin: null,
  destination: null,
  routes: [],
  activeRouteIndex: 0,
  isLoadingRoutes: false,

  safeZones: [],
  reports: [],

  reportModalOpen: false,
  sosStatus: 'idle',

  setOrigin: (loc) => set({ origin: loc }),
  setDestination: (loc) => set({ destination: loc }),
  setRoutes: (routes) => set({ routes }),
  setActiveRouteIndex: (idx) => set({ activeRouteIndex: idx }),
  setIsLoadingRoutes: (loading) => set({ isLoadingRoutes: loading }),
  setSafeZones: (zones) => set({ safeZones: zones }),
  setReports: (reports) => set({ reports }),
  setReportModalOpen: (open) => set({ reportModalOpen: open }),
  setSosStatus: (status) => set({ sosStatus: status }),
}));
