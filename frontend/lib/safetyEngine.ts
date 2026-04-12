import { supabaseAdmin, hasSupabaseKeys } from "@/lib/supabase";
import * as turf from "@turf/turf";

interface ScoreInput {
  coords: [number, number][];
  time: Date;
}

interface ScoreResult {
  score: number;
  reasonTags: string[];
}

const WEIGHTS = {
  safeZones: 0.15,
  reportDensity: 0.15,
  historicalCrime: 0.20,
  timeOfDay: 0.05,
  weather: 0.05,
  lighting: 0.40,
} as const;

const NIGHT_PENALTY = 30;
const WEATHER_PENALTY = 20;
const REPORT_RADIUS_M = 150;
const SAFE_ZONE_RADIUS_M = 300;
const LAMPS_PER_KM_FULL = 20;

const lightingCache = new Map<string, { factor: number; ts: number }>();

function getCacheKey(coords: [number, number][]) {
  const first = coords[0];
  const last = coords[coords.length - 1];
  return `${first[0].toFixed(3)},${first[1].toFixed(3)}-${last[0].toFixed(3)},${last[1].toFixed(3)}`;
}

function routeDistanceKm(coords: [number, number][]): number {
  const R = 6371;
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
  return total || 0.001;
}

function createRouteBuffer(coords: [number, number][]) {
  const line = turf.lineString(coords.map(([lat, lng]) => [lng, lat]));
  const simplified = turf.simplify(line, { tolerance: 0.0005, highQuality: false });
  return turf.buffer(simplified, 0.05, { units: "kilometers" });
}

function bufferToPoly(buffer: any): string {
  const coords =
    buffer.geometry.type === "Polygon"
      ? buffer.geometry.coordinates[0]
      : buffer.geometry.coordinates[0][0];

  return coords.map(([lng, lat]: number[]) => `${lat} ${lng}`).join(" ");
}

function isShortRoute(coords: [number, number][]) {
  return coords.length < 12;
}

async function getLightingFactor(
  coords: [number, number][]
): Promise<{ factor: number; isPoorrlyLit: boolean }> {
  const FALLBACK = { factor: 60, isPoorrlyLit: false };

  if (coords.length < 5) return FALLBACK;

  const key = getCacheKey(coords);
  const cached = lightingCache.get(key);
  if (cached && Date.now() - cached.ts < 5 * 60 * 1000) {
    return { factor: cached.factor, isPoorrlyLit: cached.factor < 40 };
  }

  try {
    let query: string;

    if (isShortRoute(coords)) {
      let minLat = Infinity, maxLat = -Infinity;
      let minLng = Infinity, maxLng = -Infinity;

      for (const [lat, lng] of coords) {
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
      }

      query = `[out:json][timeout:8];
        node["highway"="street_lamp"](${minLat},${minLng},${maxLat},${maxLng});
        out count;`;
    } else {
      const buffer = createRouteBuffer(coords);
      const poly = bufferToPoly(buffer);

      query = `[out:json][timeout:10];
        node["highway"="street_lamp"](poly:"${poly}");
        out count;`;
    }

    const res = await fetch("https://overpass.kumi.systems/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) return FALLBACK;

    const json = await res.json();
    if (!json?.elements?.length) return FALLBACK;

    const lampCount = Number(json.elements[0].tags?.total ?? 0);

    const distKm = routeDistanceKm(coords);
    const lampsPerKm = lampCount / distKm;

    const osmFactor = Math.min(
      100,
      Math.round((lampsPerKm / LAMPS_PER_KM_FULL) * 100)
    );

    const satelliteFactor = 60;

    const factor = Math.round(osmFactor * 0.7 + satelliteFactor * 0.3);

    lightingCache.set(key, { factor, ts: Date.now() });

    return {
      factor,
      isPoorrlyLit: factor < 40,
    };
  } catch {
    return FALLBACK;
  }
}

function sampleCoords(
  coords: [number, number][],
  maxPoints: number = 30
): [number, number][] {
  if (coords.length <= maxPoints) return coords;

  const sampled: [number, number][] = [];
  const step = coords.length / maxPoints;

  for (let i = 0; i < maxPoints; i++) {
    sampled.push(coords[Math.floor(i * step)]);
  }

  const last = coords[coords.length - 1];
  if (sampled[sampled.length - 1] !== last) {
    sampled.push(last);
  }
  return sampled;
}

async function countNearbyReports(lng: number, lat: number, radiusM: number) {
  if (!hasSupabaseKeys) return 0;
  try {
    const { data } = await supabaseAdmin
      .rpc("count_reports_nearby", { lng, lat, radius_m: radiusM })
      .maybeSingle();
    return typeof data === "number"
      ? data
      : typeof data === "object" && data && "count" in data
      ? (data as any).count
      : 0;
  } catch {
    return 0;
  }
}

async function countNearbySafeZones(lng: number, lat: number, radiusM: number) {
  if (!hasSupabaseKeys) return 0;
  try {
    const { data } = await supabaseAdmin.rpc("count_safe_zones_nearby", {
      lng,
      lat,
      radius_m: radiusM,
    });
    return typeof data === "number" ? data : 0;
  } catch {
    return 0;
  }
}

async function getWeatherCondition(lng: number, lat: number) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return { id: 800, main: "Clear" };

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}`
    );
    if (!res.ok) return { id: 800, main: "Clear" };
    const data = await res.json();
    return data.weather?.[0] ?? { id: 800, main: "Clear" };
  } catch {
    return { id: 800, main: "Clear" };
  }
}

function isBadWeather(id: number) {
  return id < 700 || id === 741 || id === 701 || id === 721;
}

function isNightTime(date: Date) {
  const h = date.getHours();
  return h >= 23 || h < 5;
}

async function getDistrictFromCoords(lng: number, lat: number) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=district&access_token=${token}`
    );
    const data = await res.json();
    return data.features?.[0]?.text ?? null;
  } catch {
    return null;
  }
}

async function getHistoricalCrimeFactor(district: string | null) {
  const FALLBACK = { factor: 80, hasSevereCrime: false };
  if (!district || !hasSupabaseKeys) return FALLBACK;

  try {
    const { data } = await supabaseAdmin
      .from("crime_stats")
      .select("*")
      .ilike("district", `%${district}%`)
      .maybeSingle();

    if (!data) return FALLBACK;

    const raw =
      data.murder * 15 +
      data.attempt_to_murder * 10 +
      data.kidnapping * 12 +
      data.rape * 20 +
      data.attempt_to_rape * 12 +
      data.acid_attack * 20 +
      data.sexual_harras * 8 +
      data.stalking * 5 +
      data.hit_and_run * 5;

    return {
      factor: Math.max(0, Math.min(100, 100 - raw / 5)),
      hasSevereCrime:
        data.murder > 10 || data.rape > 5 || data.acid_attack > 2,
    };
  } catch {
    return FALLBACK;
  }
}

export async function scoreRoute(input: ScoreInput): Promise<ScoreResult> {
  const { coords, time } = input;
  const reasonTags: string[] = [];

  const sampled = sampleCoords(coords, 30);

  let totalReports = 0;
  let totalSafeZones = 0;

  const results = await Promise.all(
    sampled.map(async ([lat, lng]) => {
      const [r, z] = await Promise.all([
        countNearbyReports(lng, lat, REPORT_RADIUS_M),
        countNearbySafeZones(lng, lat, SAFE_ZONE_RADIUS_M),
      ]);
      return { r, z };
    })
  );

  for (const x of results) {
    totalReports += x.r;
    totalSafeZones += x.z;
  }

  const safeZoneFactor = Math.min(100, totalSafeZones * 15);
  if (safeZoneFactor < 40) reasonTags.push("few_safe_zones_nearby");

  const reportFactor = Math.max(0, 100 - totalReports * 10);
  if (reportFactor < 60) reasonTags.push("high_report_density");

  let timeFactor = isNightTime(time) ? 70 : 100;
  if (timeFactor < 100) reasonTags.push("late_night_travel");

  const mid = sampled[Math.floor(sampled.length / 2)];

  const [weather, district] = await Promise.all([
    getWeatherCondition(mid[1], mid[0]),
    getDistrictFromCoords(mid[1], mid[0]),
  ]);

  let weatherFactor = 100;
  if (isBadWeather(weather.id)) {
    weatherFactor = 80;
    reasonTags.push(`poor_weather_${weather.main.toLowerCase()}`);
  }

  const { factor: crimeFactor, hasSevereCrime } =
    await getHistoricalCrimeFactor(district);

  if (hasSevereCrime || crimeFactor < 50) {
    reasonTags.push("high_historical_crime_rate");
  }

  const { factor: lightingFactor, isPoorrlyLit } =
    await getLightingFactor(sampled);

  if (isPoorrlyLit) reasonTags.push("poor_street_lighting");

  const score = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        safeZoneFactor * WEIGHTS.safeZones +
          reportFactor * WEIGHTS.reportDensity +
          crimeFactor * WEIGHTS.historicalCrime +
          timeFactor * WEIGHTS.timeOfDay +
          weatherFactor * WEIGHTS.weather +
          lightingFactor * WEIGHTS.lighting
      )
    )
  );

  return { score, reasonTags };
}