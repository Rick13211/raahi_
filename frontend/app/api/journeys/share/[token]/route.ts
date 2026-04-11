import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// ─── GET /api/journeys/share/[token] ─────────────────────────────────────────
// Public, no auth required. Returns journey waypoints from the last 24 hours.

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token: shareToken } = await params;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(shareToken)) {
      return NextResponse.json(
        { error: "Invalid share token format" },
        { status: 400 }
      );
    }

    // Look up journey by share token
    const { data: journey, error: journeyError } = await supabaseAdmin
      .from("journeys")
      .select("id, started_at, ended_at")
      .eq("share_token", shareToken)
      .single();

    if (journeyError || !journey) {
      return NextResponse.json(
        { error: "Journey not found" },
        { status: 404 }
      );
    }

    // Fetch waypoints from the last 24 hours
    const twentyFourHoursAgo = new Date(
      Date.now() - 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: waypoints, error: waypointsError } = await supabaseAdmin
      .from("journey_waypoints")
      .select("id, recorded_at, lat, lng")
      .eq("journey_id", journey.id)
      .gte("recorded_at", twentyFourHoursAgo)
      .order("recorded_at", { ascending: true });

    if (waypointsError) {
      console.error(
        "[GET /api/journeys/share/[token]] Waypoints error:",
        waypointsError
      );
      return NextResponse.json(
        { error: "Failed to fetch waypoints" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      journey: {
        id: journey.id,
        startedAt: journey.started_at,
        endedAt: journey.ended_at,
      },
      waypoints: waypoints ?? [],
    });
  } catch (error) {
    console.error("[GET /api/journeys/share/[token]]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
