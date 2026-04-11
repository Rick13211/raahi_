'use client';

import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix typical Next.js Leaflet icon bug with SVG inline to avoid requiring file-loader
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

export default function MapCanvas() {
  return (
    <div className="w-full h-full relative z-0 bg-zinc-950">
      <MapContainer 
        center={[51.52, -0.1]} 
        zoom={14} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <ZoomControl position="bottomright" />
        
        {/* Sample Safe Zone Marker */}
        <Marker position={[51.52, -0.1]} icon={safeZoneIcon}>
          <Popup className="font-sans font-medium text-sm">
            <span className="text-emerald-600 block mb-1">Safe Zone</span>
            <span className="text-zinc-600 font-normal">24/7 Security Present</span>
          </Popup>
        </Marker>
        
        {/* Sample Hazard Marker */}
        <Marker position={[51.525, -0.09]} icon={hazardIcon}>
          <Popup className="font-sans font-medium text-sm">
            <span className="text-amber-600 block mb-1">Community Alert</span>
            <span className="text-zinc-600 font-normal">Broken streetlights reported</span>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}