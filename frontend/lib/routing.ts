import type { RouteData } from '@/lib/store';

export interface LocationData {
  lat: number;
  lng: number;
  address: string;
}

export async function fetchRouteData(startQuery: string, endQuery: string): Promise<{
  origin: LocationData;
  destination: LocationData;
  routes: RouteData[];
}> {
  // 1. Geocode Start Location
  const startRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(startQuery)}`);
  const startData = await startRes.json();

  // 2. Geocode Destination Location
  const endRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endQuery)}`);
  const endData = await endRes.json();

  if (!startData || startData.length === 0) {
    throw new Error('Could not find start location.');
  }
  if (!endData || endData.length === 0) {
    throw new Error('Could not find destination.');
  }

  const origin = {
    lat: parseFloat(startData[0].lat),
    lng: parseFloat(startData[0].lon),
    address: startData[0].display_name
  };

  const destination = {
    lat: parseFloat(endData[0].lat),
    lng: parseFloat(endData[0].lon),
    address: endData[0].display_name
  };

  // Call our safety scoring API — it handles OSRM + safety engine internally
  const scoreRes = await fetch('/api/routes/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ origin, destination }),
  });

  if (!scoreRes.ok) {
    throw new Error('Failed to fetch scored routes from safety engine.');
  }

  const scored: RouteData[] = await scoreRes.json();

  return { origin, destination, routes: scored };
}

export async function getRoutesFromCoordinates(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<Omit<RouteData, 'isSafest' | 'safetyScore' | 'reasonTags'>[]> {
  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?alternatives=true&geometries=geojson&overview=full`;

  console.log('Fetching from OSRM URL:', osrmUrl);

  const osrmRes = await fetch(osrmUrl);
  const osrmData = await osrmRes.json();
  console.log('OSRM Raw Response:', osrmData);

  if (!osrmData?.routes) {
    console.warn('No routes found in OSRM response');
    return [];
  }

  return osrmData.routes.map((r: any, idx: number) => ({
    duration: Math.round(r.duration),
    distance: Math.round(r.distance),
    coordinates: r.geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]]) as [number, number][],
    isFastest: idx === 0,
  }));
}
