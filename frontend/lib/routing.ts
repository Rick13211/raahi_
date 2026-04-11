import type { LatLng } from "@/types";

/** A parsed route returned by OSRM */
export interface OSRMRoute {
  /** Full GeoJSON geometry for the route */
  geometry: GeoJSON.Geometry;
  /** Travel time in seconds */
  duration: number;
  /** Ordered array of [lng, lat] coordinate pairs */
  coords: [number, number][];
}

/**
 * Fetch walking routes from the public OSRM foot-routing API.
 * Returns up to 3 alternative routes with full GeoJSON geometries.
 */
export async function getRoutes(
  origin: LatLng,
  destination: LatLng
): Promise<OSRMRoute[]> {
  const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const url = `https://router.project-osrm.org/route/v1/foot/${coords}?alternatives=true&geometries=geojson&overview=full`;

  const response = await fetch(url, {
    headers: { "User-Agent": "SafeStepAI/1.0" },
    next: { revalidate: 0 }, // never cache routing results
  });

  if (!response.ok) {
    throw new Error(`OSRM request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (data.code !== "Ok" || !data.routes?.length) {
    throw new Error(`OSRM returned no routes (code: ${data.code})`);
  }

  return data.routes.map(
    (route: { geometry: GeoJSON.Geometry; duration: number }) => ({
      geometry: route.geometry,
      duration: route.duration,
      coords: (route.geometry as GeoJSON.LineString).coordinates as [number, number][],
    })
  );
}
