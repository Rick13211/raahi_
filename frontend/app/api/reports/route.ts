import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { supabaseAdmin } from "@/lib/supabase-admin";
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

// ─── WKB hex point parser ────────────────────────────────────────────────────

function parseWKBPoint(hex: string): { lat: number; lng: number } | null {
  try {
    if (hex.length < 42) return null;
    let offset = 2;
    const typeHex = hex.substring(offset, offset + 8);
    offset += 8;
    const hasSRID = typeHex === '01000020' || typeHex === '20000001';
    if (hasSRID) offset += 8;
    const xHex = hex.substring(offset, offset + 16);
    offset += 16;
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
  return new DataView(bytes.buffer).getFloat64(0, true);
}

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

export async function POST(request: NextRequest) {
  try {
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

    const { data, error } = await supabaseAdmin.rpc("get_nearby_reports", {
      p_lng: lng,
      p_lat: lat,
      p_radius: radius,
    });

    if (error) {
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

      // Parse WKB points into lat/lng
      const result = (fallbackData ?? []).map((r: Record<string, unknown>) => {
        const coords = typeof r.point === 'string' ? parseWKBPoint(r.point) : null;
        return {
          id: r.id,
          category: r.category,
          description: r.description,
          status: r.status,
          created_at: r.created_at,
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
        };
      }).filter((r: { lat: number | null }) => r.lat !== null);

      return NextResponse.json(result);
    }

    // Parse the response — handle both RPC with lat/lng and RPC with point column
    const result = (data ?? []).map((r: Record<string, unknown>) => {
      if (typeof r.lat === 'number' && typeof r.lng === 'number') {
        return r;
      }
      const coords = typeof r.point === 'string' ? parseWKBPoint(r.point) : null;
      return {
        id: r.id,
        category: r.category,
        description: r.description,
        status: r.status,
        created_at: r.created_at,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
      };
    }).filter((r: { lat: number | null }) => r.lat !== null);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[GET /api/reports]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
