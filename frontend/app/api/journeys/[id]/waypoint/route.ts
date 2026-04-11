import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { supabaseAdmin } from "@/lib/supabase";

// ─── Validation ──────────────────────────────────────────────────────────────

const WaypointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
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

// ─── PATCH /api/journeys/[id]/waypoint ───────────────────────────────────────
// Auth required. Inserts a waypoint into journey_waypoints.

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: journeyId } = await params;

    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Validate journey ID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(journeyId)) {
      return NextResponse.json(
        { error: "Invalid journey ID format" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = WaypointSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { lat, lng } = parsed.data;

    // Verify the journey exists and belongs to this user
    const { data: journey, error: journeyError } = await supabaseAdmin
      .from("journeys")
      .select("id, user_id")
      .eq("id", journeyId)
      .single();

    if (journeyError || !journey) {
      return NextResponse.json(
        { error: "Journey not found" },
        { status: 404 }
      );
    }

    if (journey.user_id !== user.id) {
      return NextResponse.json(
        { error: "Not authorized to add waypoints to this journey" },
        { status: 403 }
      );
    }

    // Insert waypoint with PostGIS point — POINT(lng lat)
    const { data, error } = await supabaseAdmin
      .from("journey_waypoints")
      .insert({
        journey_id: journeyId,
        point: `POINT(${lng} ${lat})`,
        recorded_at: new Date().toISOString(),
      })
      .select("id, recorded_at")
      .single();

    if (error) {
      console.error("[PATCH /api/journeys/[id]/waypoint] DB error:", error);
      return NextResponse.json(
        { error: "Failed to insert waypoint" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: data.id,
      journeyId,
      lat,
      lng,
      recordedAt: data.recorded_at,
    });
  } catch (error) {
    console.error("[PATCH /api/journeys/[id]/waypoint]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
