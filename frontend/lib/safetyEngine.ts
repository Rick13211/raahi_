import { supabaseAdmin, hasSupabaseKeys } from "@/lib/supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ScoreInput {
  /** Ordered route coordinates as [lat, lng] pairs (Leaflet/OSRM order) */
  coords: [number, number][];
  /** The time of travel (used for time-of-day & weather scoring) */
  time: Date;
}

interface ScoreResult {
  /** 0 – 100, higher is safer */
  score: number;
  /** Human-readable explanations for score deductions */
  reasonTags: string[];
}

// ─── Weight configuration ────────────────────────────────────────────────────

const WEIGHTS = {
  safeZones: 0.2,
  reportDensity: 0.2,
  timeOfDay: 0.1,
  weather: 0.05,
  lighting: 0.45,
} as const;

const NIGHT_PENALTY = 30; // penalty points during 23:00 – 05:00
const WEATHER_PENALTY = 20; // penalty for rain / fog conditions
const REPORT_RADIUS_M = 150;
const SAFE_ZONE_RADIUS_M = 300;

// Overpass: lamps per km of route to reach a "fully lit" score of 100
const LAMPS_PER_KM_FULL = 20;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Compute a bounding box (min/max lat/lng) around all route coordinates.
 */
function routeBBox(coords: [number, number][]): [number, number, number, number] {
  let minLat = Infinity, maxLat = -Infinity;
  let minLng = Infinity, maxLng = -Infinity;
  for (const [lat, lng] of coords) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }
  // Add a small padding buffer (~50 m in degrees)
  const pad = 0.0005;
  return [minLat - pad, minLng - pad, maxLat + pad, maxLng + pad];
}

/**
 * Estimate total route distance in km from ordered [lat, lng] pairs.
 * Uses the Haversine formula for accuracy.
 */
function routeDistanceKm(coords: [number, number][]): number {
  const R = 6371; // Earth radius in km
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const [lat1, lng1] = coords[i - 1];
    const [lat2, lng2] = coords[i];
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    total += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  return total || 0.001; // avoid division by zero
}

/**
 * Query the Overpass API for street lamp density along the route.
 * Returns a 0–100 score: 100 = well-lit (≥ LAMPS_PER_KM_FULL lamps/km).
 * Falls back to 60 (neutral) if the API is unreachable.
 */
async function getLightingFactor(
  coords: [number, number][]
): Promise<{ factor: number; isPoorrlyLit: boolean }> {
  const FALLBACK = { factor: 60, isPoorrlyLit: false };

  try {
    const [south, west, north, east] = routeBBox(coords);
    // Overpass QL: count all nodes/ways tagged as street lamps within bbox
    const query = `[out:json][timeout:10];
(
  node["highway"="street_lamp"](${south},${west},${north},${east});
  node["lit"="yes"](${south},${west},${north},${east});
);
out count;`;

    const overpassUrl = "https://overpass-api.de/api/interpreter";
    const res = await fetch(overpassUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(12_000), // 12 s hard timeout
    });

    if (!res.ok) return FALLBACK;

    const json = await res.json();
    const lampCount: number = json?.elements?.[0]?.tags?.total ?? 0;

    const distKm = routeDistanceKm(coords);
    const lampsPerKm = lampCount / distKm;

    // Normalise: at LAMPS_PER_KM_FULL the score is 100
    const factor = Math.min(100, Math.round((lampsPerKm / LAMPS_PER_KM_FULL) * 100));
    const isPoorrlyLit = factor < 40;

    return { factor, isPoorrlyLit };
  } catch {
    // Overpass unreachable or timed out — degrade gracefully
    return FALLBACK;
  }
}

/** Pick every Nth coordinate from a route to limit PostGIS queries */
function sampleCoords(
  coords: [number, number][],
  n: number
): [number, number][] {
  const sampled: [number, number][] = [];
  for (let i = 0; i < coords.length; i += n) {
    sampled.push(coords[i]);
  }
  const last = coords[coords.length - 1];
  if (sampled[sampled.length - 1] !== last) {
    sampled.push(last);
  }
  return sampled;
}

/** Count approved safety reports within `radius` metres of a point */
async function countNearbyReports(
  lng: number,
  lat: number,
  radiusM: number
): Promise<number> {
  if (!hasSupabaseKeys) return 0;
  
  try {
    // Primary: PostGIS RPC spatial query
    const { data, error: rpcError } = await supabaseAdmin
      .rpc("count_reports_nearby", { lng, lat, radius_m: radiusM })
      .maybeSingle();

    if (!rpcError) {
      return typeof data === "number" ? data
        : typeof data === "object" && data !== null && "count" in data
          ? (data as { count: number }).count
          : 0;
    }

    // Fallback: bounding-box filter (~radius in degrees) if RPC unavailable
    const degOffset = radiusM / 111_000; // rough metres → degrees
    const { data: fallback, error: fallbackError } = await supabaseAdmin
      .from("safety_reports")
      .select("id")
      .eq("status", "approved")
      .gte("lat", lat - degOffset).lte("lat", lat + degOffset)
      .gte("lng", lng - degOffset).lte("lng", lng + degOffset);

    if (fallbackError) return 0;
    return fallback?.length ?? 0;
  } catch (err) {
    console.error("DB Error in countNearbyReports:", err);
    return 0;
  }
}

/** Count safe zones within `radius` metres of a point */
async function countNearbySafeZones(
  lng: number,
  lat: number,
  radiusM: number
): Promise<number> {
  if (!hasSupabaseKeys) return 0;

  try {
    const { data, error } = await supabaseAdmin.rpc("count_safe_zones_nearby", {
      lng,
      lat,
      radius_m: radiusM,
    });

    if (error) {
      // Fallback if RPC doesn't exist
      const { data: fallbackData, error: fallbackError } = await supabaseAdmin
        .rpc("nearby_safe_zone_count", { p_lng: lng, p_lat: lat, p_radius: radiusM });
      if (fallbackError) return 0;
      return typeof fallbackData === "number" ? fallbackData : 0;
    }

    return typeof data === "number" ? data : 0;
  } catch (err) {
    console.error("DB Error in countNearbySafeZones:", err);
    return 0;
  }
}

/** Fetch current weather conditions from OpenWeatherMap */
async function getWeatherCondition(
  lng: number,
  lat: number
): Promise<{ id: number; main: string }> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return { id: 800, main: "Clear" }; // safe default
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 600 } }); // cache 10 min
    if (!res.ok) return { id: 800, main: "Clear" };

    const data = await res.json();
    const weather = data.weather?.[0];
    return weather
      ? { id: weather.id as number, main: weather.main as string }
      : { id: 800, main: "Clear" };
  } catch {
    return { id: 800, main: "Clear" };
  }
}

/** Check if a weather condition ID indicates rain or fog */
function isBadWeather(weatherId: number): boolean {
  // OpenWeatherMap condition codes:
  // 2xx = Thunderstorm, 3xx = Drizzle, 5xx = Rain, 6xx = Snow
  // 741 = Fog, 762 = Volcanic ash, 781 = Tornado
  return (
    weatherId < 700 || // all precipitation
    weatherId === 741 || // fog
    weatherId === 701 || // mist
    weatherId === 721 // haze
  );
}

/** Check if a given hour is in the "night" window (23:00 – 05:00) */
function isNightTime(date: Date): boolean {
  const hour = date.getHours();
  return hour >= 23 || hour < 5;
}

// ─── Main Scoring Function ──────────────────────────────────────────────────

/**
 * Compute a safety score (0–100) for a route.
 *
 * Scoring formula:
 *   score = safeZoneFactor × 0.20
 *         + reportFactor   × 0.20
 *         + timeFactor     × 0.10
 *         + weatherFactor  × 0.05
 *         + lightingFactor × 0.45
 *
 * Each factor is scored 0–100 independently, then the weighted sum is clamped.
 */
export async function scoreRoute(input: ScoreInput): Promise<ScoreResult> {
  const { coords, time } = input;
  const reasonTags: string[] = [];

  // Sample every 5th coordinate to limit DB queries
  const sampled = sampleCoords(coords, 5);

  // ── 1. Query PostGIS for reports & safe zones at sampled points ──────────

  let totalReports = 0;
  let totalSafeZones = 0;

  const queryPromises = sampled.map(async ([lat, lng]) => {
    const [reports, zones] = await Promise.all([
      countNearbyReports(lng, lat, REPORT_RADIUS_M),
      countNearbySafeZones(lng, lat, SAFE_ZONE_RADIUS_M),
    ]);
    return { reports, zones };
  });

  const results = await Promise.all(queryPromises);
  for (const r of results) {
    totalReports += r.reports;
    totalSafeZones += r.zones;
  }

  // ── 2. Safe Zone Factor ──────────────────────────────────────────────────
  // More safe zones = higher score. Cap at 100.
  // Each safe zone contributes 15 points; having ~7 zones along a route = 100.
  const safeZoneFactor = Math.min(100, totalSafeZones * 15);
  if (safeZoneFactor < 40) {
    reasonTags.push("few_safe_zones_nearby");
  }

  // ── 3. Report Density Factor (inverted — more reports = worse) ───────────
  // Each report subtracts 10 points from a base of 100.
  const reportFactor = Math.max(0, 100 - totalReports * 10);
  if (reportFactor < 60) {
    reasonTags.push("high_report_density");
  }

  // ── 4. Time of Day Factor ────────────────────────────────────────────────
  let timeFactor = 100;
  if (isNightTime(time)) {
    timeFactor = 100 - NIGHT_PENALTY; // 70
    reasonTags.push("late_night_travel");
  }

  // ── 5. Weather Factor ────────────────────────────────────────────────────
  // Use the midpoint of the route for weather lookup
  const midIdx = Math.floor(sampled.length / 2);
  const [midLat, midLng] = sampled[midIdx];
  const weather = await getWeatherCondition(midLng, midLat);
  let weatherFactor = 100;
  if (isBadWeather(weather.id)) {
    weatherFactor = 100 - WEATHER_PENALTY; // 80
    reasonTags.push(`poor_weather_${weather.main.toLowerCase()}`);
  }

  // ── 6. Lighting Factor (Overpass street lamp density) ────────────────────
  const { factor: lightingFactor, isPoorrlyLit } = await getLightingFactor(sampled);
  if (isPoorrlyLit) {
    reasonTags.push("poor_street_lighting");
  }

  // ── Weighted Sum ─────────────────────────────────────────────────────────
  const raw =
    safeZoneFactor * WEIGHTS.safeZones +
    reportFactor * WEIGHTS.reportDensity +
    timeFactor * WEIGHTS.timeOfDay +
    weatherFactor * WEIGHTS.weather +
    lightingFactor * WEIGHTS.lighting;

  const score = Math.round(Math.max(0, Math.min(100, raw)));

  return { score, reasonTags };
}
