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

type RouteState = {
  origin: Location | null;
  destination: Location | null;
  userLocation: { lat: number; lng: number } | null;
  routes: RouteData[];
  setUserLocation: (loc: { lat: number; lng: number } | null) => void;
  setOrigin: (loc: Location) => void;
  setDestination: (loc: Location) => void;
  setRoutes: (routes: RouteData[]) => void;
  activeRouteIndex: number;
  setActiveRouteIndex: (idx: number) => void;
};

export const useRouteStore = create<RouteState>((set) => ({
  origin: null,
  destination: null,
  userLocation: null,
  routes: [],
  setUserLocation: (loc) => set({ userLocation: loc }),
  setOrigin: (loc) => set({ origin: loc }),
  setDestination: (loc) => set({ destination: loc }),
  setRoutes: (routes) => set({ routes }),
  activeRouteIndex: 0,
  setActiveRouteIndex: (idx) => set({ activeRouteIndex: idx })
}));
