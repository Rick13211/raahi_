// 🔒 BACKEND/DB — DO NOT MODIFY (flagged for future work)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { supabaseAdmin } from "@/lib/supabase";

// ─── Validation ──────────────────────────────────────────────────────────────

const GetSafeZonesSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(1).max(50000).default(500),
});

// ─── GET /api/safe-zones ─────────────────────────────────────────────────────
// Public, no auth. Returns safe zones near a point using ST_DWithin.

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

    // Use PostGIS spatial query via RPC
    const { data, error } = await supabaseAdmin.rpc("get_nearby_safe_zones", {
      p_lng: lng,
      p_lat: lat,
      p_radius: radius,
    });

    if (error) {
      console.error("[GET /api/safe-zones] RPC error, attempting fallback:", error);

      // Fallback: fetch all and let client filter (not ideal, but functional)
      const { data: fallbackData, error: fallbackError } = await supabaseAdmin
        .from("safe_zones")
        .select("id, name, type, hours, point");

      if (fallbackError) {
        return NextResponse.json(
          { error: "Failed to fetch safe zones" },
          { status: 500 }
        );
      }

      return NextResponse.json(fallbackData ?? []);
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error("[GET /api/safe-zones]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
