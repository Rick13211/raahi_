import { create } from 'zustand';

type Location = {
  lat: number;
  lng: number;
  address: string;
};

type RouteState = {
  origin: Location | null;
  destination: Location | null;
  setOrigin: (loc: Location) => void;
  setDestination: (loc: Location) => void;
  activeRoute: any | null;
  setActiveRoute: (route: any) => void;
};

export const useRouteStore = create<RouteState>((set) => ({
  origin: null,
  destination: null,
  setOrigin: (loc) => set({ origin: loc }),
  setDestination: (loc) => set({ destination: loc }),
  activeRoute: null,
  setActiveRoute: (route) => set({ activeRoute: route })
}));
