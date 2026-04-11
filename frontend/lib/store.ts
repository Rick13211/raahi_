import { create } from 'zustand';

type Location = {
  lat: number;
  lng: number;
  address: string;
};

export type RouteData = {
  duration: number; // in seconds
  distance: number; // in meters
  coordinates: [number, number][]; // Array of [lat, lng]
  isFastest: boolean;
};

type RouteState = {
  origin: Location | null;
  destination: Location | null;
  routes: RouteData[];
  setOrigin: (loc: Location) => void;
  setDestination: (loc: Location) => void;
  setRoutes: (routes: RouteData[]) => void;
  activeRouteIndex: number;
  setActiveRouteIndex: (idx: number) => void;
};

export const useRouteStore = create<RouteState>((set) => ({
  origin: null,
  destination: null,
  routes: [],
  setOrigin: (loc) => set({ origin: loc }),
  setDestination: (loc) => set({ destination: loc }),
  setRoutes: (routes) => set({ routes }),
  activeRouteIndex: 0,
  setActiveRouteIndex: (idx) => set({ activeRouteIndex: idx })
}));

