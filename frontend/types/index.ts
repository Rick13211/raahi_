// ─── Shared TypeScript interfaces for SafeStep AI ───

/** A geographic coordinate pair */
export interface LatLng {
  lat: number;
  lng: number;
}

/** A route scored by the SafetyEngine */
export interface ScoredRoute {
  geometry: GeoJSON.Geometry;
  /** Estimated travel time in minutes */
  eta: number;
  /** 0 – 100, higher is safer */
  safetyScore: number;
  /** Human-readable tags explaining the score */
  reasonTags: string[];
}

/** Categories a user can assign when filing a report */
export type ReportCategory =
  | "dark_area"
  | "harassment"
  | "broken_light"
  | "suspicious"
  | "other";

/** A community safety report */
export interface SafetyReport {
  id: string;
  user_id: string;
  lat: number;
  lng: number;
  category: ReportCategory;
  description: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

/** A verified safe zone (police station, hospital, etc.) */
export interface SafeZone {
  id: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  hours: string | null;
}

/** A live-tracked journey */
export interface Journey {
  id: string;
  user_id: string;
  geometry: GeoJSON.Geometry | null;
  share_token: string;
  started_at: string;
  ended_at: string | null;
}

/** A single breadcrumb in a tracked journey */
export interface JourneyWaypoint {
  id: string;
  journey_id: string;
  lat: number;
  lng: number;
  recorded_at: string;
}
