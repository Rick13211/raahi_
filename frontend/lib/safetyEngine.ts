import { supabaseAdmin } from "@/lib/supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ScoreInput {
  /** Ordered route coordinates as [lng, lat] pairs */
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

const LIGHTING_PLACEHOLDER = 70; // 0-100 — will be replaced when real data exists
const NIGHT_PENALTY = 30; // penalty points during 23:00 – 05:00
const WEATHER_PENALTY = 20; // penalty for rain / fog conditions
const REPORT_RADIUS_M = 150;
const SAFE_ZONE_RADIUS_M = 300;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Pick every Nth coordinate from a route to limit PostGIS queries */
function sampleCoords(
  coords: [number, number][],
  n: number
): [number, number][] {
  const sampled: [number, number][] = [];
  for (let i = 0; i < coords.length; i += n) {
    sampled.push(coords[i]);
  }
  // Always include the last point
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
  const { count, error } = await supabaseAdmin
    .from("safety_reports")
    .select("id", { count: "exact", head: true })
    .eq("status", "approved")
    .filter(
      "point",
      "not.is",
      null
    );

  // Fallback: use RPC for spatial query
  const { data, error: rpcError } = await supabaseAdmin.rpc(
    "count_reports_nearby",
    { lng, lat, radius_m: radiusM }
  ).maybeSingle();

  if (rpcError) {
    // If the RPC doesn't exist yet, fall back to raw SQL via postgrest
    const { data: rawData, error: rawError } = await supabaseAdmin
      .from("safety_reports")
      .select("id")
      .eq("status", "approved")
      .filter(
        `ST_DWithin(point, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${radiusM})` as never,
        "is" as never,
        "true" as never
      );

    // If that also fails, use a raw query approach
    if (rawError) {
      const { data: sqlData, error: sqlError } = await supabaseAdmin
        .rpc("nearby_report_count", { p_lng: lng, p_lat: lat, p_radius: radiusM });
      if (sqlError) return 0;
      return typeof sqlData === "number" ? sqlData : 0;
    }
    return rawData?.length ?? 0;
  }

  return typeof data === "object" && data !== null && "count" in data
    ? (data as { count: number }).count
    : typeof data === "number"
      ? data
      : 0;
}

/** Count safe zones within `radius` metres of a point */
async function countNearbySafeZones(
  lng: number,
  lat: number,
  radiusM: number
): Promise<number> {
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

  const queryPromises = sampled.map(async ([lng, lat]) => {
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
  const [midLng, midLat] = sampled[midIdx];
  const weather = await getWeatherCondition(midLng, midLat);
  let weatherFactor = 100;
  if (isBadWeather(weather.id)) {
    weatherFactor = 100 - WEATHER_PENALTY; // 80
    reasonTags.push(`poor_weather_${weather.main.toLowerCase()}`);
  }

  // ── 6. Lighting Factor (placeholder) ─────────────────────────────────────
  const lightingFactor = LIGHTING_PLACEHOLDER;
  // No tag — placeholder data, always constant

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
