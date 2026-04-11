import { create } from 'zustand';

type Location = {
  lat: number;
  lng: number;
  address: string;
};

type RouteData = {
  duration: number;
  distance: number;
  coordinates: [number, number][];
  isFastest: boolean;
};

type RouteState = {
  origin: Location | null;
  destination: Location | null;
  setOrigin: (loc: Location) => void;
  setDestination: (loc: Location) => void;
  routes: RouteData[];
  setRoutes: (routes: RouteData[]) => void;
  activeRouteIndex: number;
  setActiveRouteIndex: (index: number) => void;
};

export const useRouteStore = create<RouteState>((set) => ({
  origin: null,
  destination: null,
  setOrigin: (loc) => set({ origin: loc }),
  setDestination: (loc) => set({ destination: loc }),
  routes: [],
  setRoutes: (routes) => set({ routes }),
  activeRouteIndex: 0,
  setActiveRouteIndex: (index) => set({ activeRouteIndex: index })
}));
