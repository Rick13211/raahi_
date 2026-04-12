// 🔒 BACKEND/DB — DO NOT MODIFY (flagged for future work)
import { create } from 'zustand';

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
};

type RouteState = {
  origin: Location | null;
  destination: Location | null;
  userLocation: { lat: number; lng: number } | null;
  routes: RouteData[];
  safeZones: SafeZoneData[];
  setUserLocation: (loc: { lat: number; lng: number } | null) => void;
  setOrigin: (loc: Location) => void;
  setDestination: (loc: Location) => void;
  setRoutes: (routes: RouteData[]) => void;
  setSafeZones: (zones: SafeZoneData[]) => void;
  activeRouteIndex: number;
  setActiveRouteIndex: (idx: number) => void;
};

export const useRouteStore = create<RouteState>((set) => ({
  origin: null,
  destination: null,
  userLocation: null,
  routes: [],
  safeZones: [],
  setUserLocation: (loc) => set({ userLocation: loc }),
  setOrigin: (loc) => set({ origin: loc }),
  setDestination: (loc) => set({ destination: loc }),
  setRoutes: (routes) => set({ routes }),
  setSafeZones: (zones) => set({ safeZones: zones }),
  activeRouteIndex: 0,
  setActiveRouteIndex: (idx) => set({ activeRouteIndex: idx })
}));
