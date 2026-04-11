import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { supabaseAdmin } from "@/lib/supabase-admin";

// ─── Validation ──────────────────────────────────────────────────────────────

const GetSafeZonesSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(1).max(50000).default(500),
});

// ─── WKB hex point parser ────────────────────────────────────────────────────

/**
 * Parse a PostGIS WKB hex string (geography Point, SRID 4326) into {lng, lat}.
 * WKB format for Point with SRID: 
 *   01 (little-endian) + 01000020 (Point + hasSRID) + E6100000 (SRID 4326) + X (8 bytes float64) + Y (8 bytes float64)
 */
function parseWKBPoint(hex: string): { lat: number; lng: number } | null {
  try {
    // Standard WKB Point with SRID is 50 hex chars (25 bytes):
    // byte order (1) + type (4) + SRID (4) + X (8) + Y (8) = 25 bytes = 50 hex
    if (hex.length < 42) return null;

    let offset = 2; // skip byte order

    // Check if SRID is included (type & 0x20000000)
    const typeHex = hex.substring(offset, offset + 8);
    offset += 8;

    const hasSRID = typeHex === '01000020' || typeHex === '20000001';
    if (hasSRID) {
      offset += 8; // skip SRID (4 bytes)
    }

    // Read X (longitude) - 8 bytes little-endian float64
    const xHex = hex.substring(offset, offset + 16);
    offset += 16;

    // Read Y (latitude) - 8 bytes little-endian float64
    const yHex = hex.substring(offset, offset + 16);

    const lng = readFloat64LE(xHex);
    const lat = readFloat64LE(yHex);

    if (isNaN(lng) || isNaN(lat)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

function readFloat64LE(hex: string): number {
  const bytes = new Uint8Array(8);
  for (let i = 0; i < 8; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return new DataView(bytes.buffer).getFloat64(0, true); // little-endian
}

// ─── GET /api/safe-zones ─────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const parsed = GetSafeZonesSchema.safeParse({
      lat: searchParams.get("lat"),
      lng: searchParams.get("lng"),
      radius: searchParams.get("radius"),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { lat, lng, radius } = parsed.data;

    const { data, error } = await supabaseAdmin.rpc("get_nearby_safe_zones", {
      p_lng: lng,
      p_lat: lat,
      p_radius: radius,
    });

    if (error) {
      console.error("[GET /api/safe-zones] RPC error:", error);

      const { data: fallbackData, error: fallbackError } = await supabaseAdmin
        .from("safe_zones")
        .select("id, name, type, hours, point");

      if (fallbackError) {
        return NextResponse.json(
          { error: "Failed to fetch safe zones" },
          { status: 500 }
        );
      }

      // Parse WKB points into lat/lng
      const result = (fallbackData ?? []).map((z: Record<string, unknown>) => {
        const coords = typeof z.point === 'string' ? parseWKBPoint(z.point) : null;
        return {
          id: z.id,
          name: z.name,
          type: z.type,
          hours: z.hours,
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
        };
      }).filter((z: { lat: number | null }) => z.lat !== null);

      return NextResponse.json(result);
    }

    // If RPC returns lat/lng columns, pass through. Otherwise parse point column.
    const result = (data ?? []).map((z: Record<string, unknown>) => {
      if (typeof z.lat === 'number' && typeof z.lng === 'number') {
        return z; // RPC already extracted lat/lng
      }
      const coords = typeof z.point === 'string' ? parseWKBPoint(z.point) : null;
      return {
        id: z.id,
        name: z.name,
        type: z.type,
        hours: z.hours,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
      };
    }).filter((z: { lat: number | null }) => z.lat !== null);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[GET /api/safe-zones]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
