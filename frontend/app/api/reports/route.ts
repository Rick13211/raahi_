// 🔒 BACKEND/DB — DO NOT MODIFY (flagged for future work)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { supabaseAdmin } from "@/lib/supabase";
import type { ReportCategory } from "@/types";

// ─── Validation Schemas ──────────────────────────────────────────────────────

const VALID_CATEGORIES: ReportCategory[] = [
  "dark_area",
  "harassment",
  "broken_light",
  "suspicious",
  "other",
];

const CreateReportSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  category: z.enum(["dark_area", "harassment", "broken_light", "suspicious", "other"]),
  description: z.string().max(2000).optional(),
});

const GetReportsQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(1).max(50000).default(1000),
});

// ─── Helper: extract Supabase auth user ──────────────────────────────────────

async function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) return null;
  return user;
}

// ─── POST /api/reports ───────────────────────────────────────────────────────
// Auth required. Creates a new safety report with status "pending".

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = CreateReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { lat, lng, category, description } = parsed.data;

    // Insert with PostGIS point — POINT(lng lat)
    const { data, error } = await supabaseAdmin
      .from("safety_reports")
      .insert({
        user_id: user.id,
        point: `POINT(${lng} ${lat})`,
        category,
        description: description ?? null,
        status: "pending",
      })
      .select("id, category, status, created_at")
      .single();

    if (error) {
      console.error("[POST /api/reports] DB insert error:", error);
      return NextResponse.json(
        { error: "Failed to create report" },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("[POST /api/reports]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── GET /api/reports ────────────────────────────────────────────────────────
// Public. Returns approved reports near a given point.
// Query params: lat, lng, radius (default 1000m)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const parsed = GetReportsQuerySchema.safeParse({
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

    // Use PostGIS ST_DWithin for spatial query
    const { data, error } = await supabaseAdmin.rpc("get_nearby_reports", {
      p_lng: lng,
      p_lat: lat,
      p_radius: radius,
    });

    if (error) {
      // Fallback: raw SQL via Supabase's postgrest isn't ideal for spatial,
      // so we attempt a direct query
      console.error("[GET /api/reports] RPC error, attempting fallback:", error);

      // Fallback: bounding box (±0.05° ≈ ~5 km) to avoid full-table scan
      const degOffset = 0.05;
      const { data: fallbackData, error: fallbackError } = await supabaseAdmin
        .from("safety_reports")
        .select("id, category, description, status, created_at, lat, lng")
        .eq("status", "approved")
        .gte("lat", lat - degOffset).lte("lat", lat + degOffset)
        .gte("lng", lng - degOffset).lte("lng", lng + degOffset);

      if (fallbackError) {
        return NextResponse.json(
          { error: "Failed to fetch reports" },
          { status: 500 }
        );
      }

      return NextResponse.json(fallbackData ?? []);
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error("[GET /api/reports]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
