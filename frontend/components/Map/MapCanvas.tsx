'use client';

import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useRouteStore } from '@/lib/store';
import { useEffect, useState } from 'react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { LocateFixed } from 'lucide-react';

// Custom icons
const safeZoneIcon = L.divIcon({
  html: `<div style="background-color: #ffffff; width: 24px; height: 24px; border-radius: 50%; border: 2px solid #e5e7eb; box-shadow: 0 4px 12px rgba(0,0,0,0.05); display: flex; align-items: center; justify-content: center;"><div style="background-color: #059669; width: 10px; height: 10px; border-radius: 50%;"></div></div>`,
  className: 'custom-leaflet-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const hazardIcon = L.divIcon({
  html: `<div style="background-color: #ffffff; width: 24px; height: 24px; border-radius: 50%; border: 2px solid #e5e7eb; box-shadow: 0 4px 12px rgba(0,0,0,0.05); display: flex; align-items: center; justify-content: center;"><div style="background-color: #f59e0b; width: 10px; height: 10px; border-radius: 50%;"></div></div>`,
  className: 'custom-leaflet-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

// For user origin and destination points
const liveLocationIcon = L.divIcon({
  html: `
    <div class="relative w-5 h-5 flex items-center justify-center">
      <div class="absolute inset-0 bg-blue-500 rounded-full opacity-40 animate-ping"></div>
      <div class="absolute w-3 h-3 bg-blue-600 border-[2px] border-white rounded-full shadow-md z-10"></div>
    </div>
  `,
  className: 'custom-leaflet-icon',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

// For user origin and destination points
const startPointIcon = L.divIcon({
  html: `<div style="background-color: #ffffff; width: 28px; height: 28px; border-radius: 50%; border: 2px solid #e5e7eb; box-shadow: 0 4px 15px rgba(0,0,0,0.08); display: flex; align-items: center; justify-content: center;"><div style="background-color: #2563eb; width: 12px; height: 12px; border-radius: 50%;"></div></div>`,
  className: 'custom-leaflet-icon cursor-pointer',
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

const endPointIcon = L.divIcon({
  html: `<div style="background-color: #111827; width: 28px; height: 28px; border-radius: 50%; border: 2px solid #ffffff; box-shadow: 0 4px 15px rgba(0,0,0,0.12); display: flex; align-items: center; justify-content: center;"><div style="background-color: #ffffff; width: 8px; height: 8px; border-radius: 2px;"></div></div>`,
  className: 'custom-leaflet-icon cursor-pointer',
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

// Component to dynamically fit bounds when origin/destination changes
function MapBoundsManager() {
  const map = useMap();
  const origin = useRouteStore((state) => state.origin);
  const destination = useRouteStore((state) => state.destination);
  const routes = useRouteStore((state) => state.routes);
  const activeRouteIndex = useRouteStore((state) => state.activeRouteIndex);
  const userLocation = useRouteStore((state) => state.userLocation);

  const [hasInitialPanned, setHasInitialPanned] = useState(false);

  useEffect(() => {
    let bounds: L.LatLngBounds | null = null;

    if (routes.length > 0 && routes[activeRouteIndex]?.coordinates?.length > 0) {
      bounds = L.latLngBounds(routes[activeRouteIndex].coordinates);
    } else if (origin && destination) {
      bounds = L.latLngBounds([
        [origin.lat, origin.lng],
        [destination.lat, destination.lng]
      ]);
    }

    const timer = setTimeout(() => {
      if (bounds && map) {
        map.fitBounds(bounds, { padding: [50, 50], animate: true, duration: 1.5 });
      } else if (origin) {
        map.flyTo([origin.lat, origin.lng], 14, { animate: true, duration: 1.5 });
      } else if (userLocation && !hasInitialPanned) {
        // First boot with geolocation
        map.flyTo([userLocation.lat, userLocation.lng], 14, { animate: true, duration: 1.5 });
        setHasInitialPanned(true);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [origin, destination, routes, activeRouteIndex, map, userLocation, hasInitialPanned]);

  return null;
}

// Locate Me Button
function LocateControl() {
  const map = useMap();
  const userLocation = useRouteStore((state) => state.userLocation);

  if (!userLocation) return null;

  return (
    <button
      onClick={() => map.flyTo([userLocation.lat, userLocation.lng], 16, { animate: true, duration: 1 })}
      className="absolute bottom-28 right-3 z-[1000] w-10 h-10 bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.1)] border border-gray-200 flex items-center justify-center text-gray-700 hover:text-blue-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all active:scale-95"
      title="Locate Me"
    >
      <LocateFixed className="w-5 h-5" />
    </button>
  );
}

export default function MapCanvas() {
  const origin = useRouteStore((state) => state.origin);
  const destination = useRouteStore((state) => state.destination);
  const routes = useRouteStore((state) => state.routes);
  const activeRouteIndex = useRouteStore((state) => state.activeRouteIndex);
  const userLocation = useRouteStore((state) => state.userLocation);

  // Mount the geolocation listener
  useGeolocation();

  return (
    <div className="w-full h-full relative z-0 bg-[#f9fafb]">
      <MapContainer
        center={[28.6139, 77.2090]}
        zoom={12}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        zoomControl={false}
      >
        <MapBoundsManager />

        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <ZoomControl position="bottomright" />
        <LocateControl />

        {/* Live User Location Marker */}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={liveLocationIcon}>
            <Popup className="font-sans shadow-lg rounded-xl border-0">
              <div className="px-1 py-0.5">
                <span className="text-blue-600 text-[10px] font-bold block uppercase tracking-wider mb-1">Live</span>
                <span className="text-slate-800 font-semibold text-sm block max-w-[200px] leading-tight">Your exact position</span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Origin Marker */}
        {origin && (
          <Marker position={[origin.lat, origin.lng]} icon={startPointIcon}>
            <Popup className="font-sans shadow-lg rounded-xl border-0">
              <div className="px-1 py-0.5">
                <span className="text-slate-400 text-[10px] font-bold block uppercase tracking-wider mb-1">Start</span>
                <span className="text-slate-800 font-semibold text-sm block max-w-[200px] leading-tight">{origin.address}</span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Destination Marker */}
        {destination && (
          <Marker position={[destination.lat, destination.lng]} icon={endPointIcon}>
            <Popup className="font-sans shadow-lg rounded-xl border-0">
              <div className="px-1 py-0.5">
                <span className="text-slate-400 text-[10px] font-bold block uppercase tracking-wider mb-1">Destination</span>
                <span className="text-slate-800 font-semibold text-sm block max-w-[200px] leading-tight">{destination.address}</span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Render Generated Routes */}
        {
          routes
            .map((route, originalIndex) => ({ route, originalIndex }))
            .sort((a, b) => {
              // Render order: alternatives first, then active, safest on top
              if (a.route.isSafest) return 1;
              if (b.route.isSafest) return -1;
              if (a.originalIndex === activeRouteIndex) return 1;
              if (b.originalIndex === activeRouteIndex) return -1;
              return 0;
            })
            .map(({ route, originalIndex }) => {
              const isActive = originalIndex === activeRouteIndex;

              // Color priority: safest → green, active → blue, alt → grey
              let color = '#9ca3af';   // grey for alternatives
              let weight = 3;
              let dashArray: string | undefined = '8, 8';

              if (isActive) {
                color = '#2563eb';     // blue for user-selected
                weight = 6;
                dashArray = undefined;
              }
              if (route.isSafest) {
                color = '#16a34a';     // green always wins for safest
                weight = 6;
                dashArray = undefined;
              }

              return (
                <Polyline
                  key={`route-${originalIndex}`}
                  positions={route.coordinates as [number, number][]}
                  pathOptions={{ color, weight, opacity: 0.9, lineCap: 'round', lineJoin: 'round', dashArray }}
                />
              );
            })
        }
      </MapContainer>
    </div>
  );
}
