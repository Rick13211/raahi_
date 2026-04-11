'use client';

import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useRouteStore } from '@/lib/store';
import { useEffect } from 'react';

// Custom icons
const safeZoneIcon = L.divIcon({
  html: `<div style="background-color: #10b981; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(16,185,129,0.5);"></div>`,
  className: 'custom-leaflet-icon',
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

const hazardIcon = L.divIcon({
  html: `<div style="background-color: #f59e0b; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(245,158,11,0.5);"></div>`,
  className: 'custom-leaflet-icon',
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

// For user origin and destination points
const startPointIcon = L.divIcon({
  html: `<div style="background-color: #10b981; width: 20px; height: 20px; border-radius: 50%; border: 3px solid #064e3b; box-shadow: 0 0 15px rgba(16,185,129,0.8);"></div>`,
  className: 'custom-leaflet-icon cursor-pointer',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const endPointIcon = L.divIcon({
  html: `<div style="background-color: #06b6d4; width: 20px; height: 20px; border-radius: 4px; border: 3px solid #164e63; box-shadow: 0 0 15px rgba(6,182,212,0.8); transform: rotate(45deg);"></div>`,
  className: 'custom-leaflet-icon cursor-pointer',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

// Component to dynamically fit bounds when origin/destination changes
function MapBoundsManager() {
  const map = useMap();
  const origin = useRouteStore((state) => state.origin);
  const destination = useRouteStore((state) => state.destination);
  const routes = useRouteStore((state) => state.routes);
  const activeRouteIndex = useRouteStore((state) => state.activeRouteIndex);

useEffect(() => {
  let bounds: L.LatLngBounds | null = null;
  
  if (routes.length > 0 && routes[activeRouteIndex]?.coordinates?.length > 0) {
    console.log(routes[activeRouteIndex].coordinates);
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
    }
  }, 100);

  return () => clearTimeout(timer); // Critical cleanup
}, [origin, destination, routes, activeRouteIndex, map]);

  return null;
}

export default function MapCanvas() {
  const origin = useRouteStore((state) => state.origin);
  const destination = useRouteStore((state) => state.destination);
  const routes = useRouteStore((state) => state.routes);
  const activeRouteIndex = useRouteStore((state) => state.activeRouteIndex);
  return (
    <div className="w-full h-full relative z-0 bg-zinc-950">
      <MapContainer 
        center={[28.6139, 77.2090]}
        zoom={12} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        zoomControl={false}
      >
        <MapBoundsManager />
        
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <ZoomControl position="bottomright" />
        
        {/* Origin Marker */}
        {origin && (
          <Marker position={[origin.lat, origin.lng]} icon={startPointIcon}>
             <Popup className="font-sans text-sm font-medium">
                <span className="text-zinc-500 text-xs block uppercase">Start</span>
                <span className="text-black block max-w-xs">{origin.address}</span>
             </Popup>
          </Marker>
        )}

        {/* Destination Marker */}
        {destination && (
          <Marker position={[destination.lat, destination.lng]} icon={endPointIcon}>
             <Popup className="font-sans text-sm font-medium">
                <span className="text-zinc-500 text-xs block uppercase">Destination</span>
                <span className="text-black block max-w-xs">{destination.address}</span>
             </Popup>
          </Marker>
        )}

        {/* Render Generated Routes */}
        {
          [...routes].sort((a,b)=>{
            if (routes.indexOf(a) === activeRouteIndex) return 1;
            if (routes.indexOf(b) === activeRouteIndex) return -1;
            return 0;})
            .map((route, idx) => {
            const isActive = idx === activeRouteIndex;
          return (
            <Polyline 
              key={idx}
              positions={route.coordinates}
              pathOptions={{
                color: isActive ? '#06b6d4' : '#52525b', // Cyan for active, Zinc for alt
                weight: isActive ? 6 : 4,
                opacity: isActive ? 0.9 : 0.6,
                lineCap: 'round',
                lineJoin: 'round',
                dashArray: isActive ? undefined : '10, 10' // Dashed for alternatives
              }}
              // Ensure active route renders on top
              eventHandlers={{
                add: (e) => {
                  if (isActive) e.target.bringToFront();
                  else e.target.bringToBack();
                }
              }}
            />
          );
        })}

        {/* Existing demo markers just for aesthetics */}
        {/* <Marker position={[28.62, 77.21]} icon={safeZoneIcon}>
          <Popup className="font-sans font-medium text-sm">
            <span className="text-emerald-600 block mb-1">Safe Zone</span>
            <span className="text-zinc-600 font-normal">24/7 Security Present</span>
          </Popup>
        </Marker>
        <Marker position={[28.615, 77.2]} icon={hazardIcon}>
          <Popup className="font-sans font-medium text-sm">
            <span className="text-amber-600 block mb-1">Community Alert</span>
            <span className="text-zinc-600 font-normal">Broken streetlights reported</span>
          </Popup>
        </Marker> */}
      </MapContainer>
    </div>
  );
}