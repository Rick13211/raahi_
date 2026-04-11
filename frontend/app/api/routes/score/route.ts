import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { getRoutesFromCoordinates } from "@/lib/routing";
import { scoreRoute } from "@/lib/safetyEngine";
import type { ScoredRoute } from "@/types";

// ─── Request Validation ──────────────────────────────────────────────────────

const LatLngSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const ScoreRequestSchema = z.object({
  origin: LatLngSchema,
  destination: LatLngSchema,
});

// ─── POST /api/routes/score ──────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const parsed = ScoreRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { origin, destination } = parsed.data;

    // Fetch alternative walking routes from OSRM
    const routes = await getRoutesFromCoordinates(origin, destination);

    // Score each route in parallel
    const scored = await Promise.all(
      routes.map(async (route, idx) => {
        const { score, reasonTags } = await scoreRoute({
          coords: route.coordinates,
          time: new Date(),
        });

        return {
          // Leaflet-order coords for the map
          coordinates: route.coordinates,
          duration: route.duration,
          distance: route.distance,
          isFastest: idx === 0, // OSRM returns fastest first
          isSafest: false,      // tagged after sort below
          safetyScore: score,
          reasonTags,
          // GeoJSON geometry for any consumers that need it
          geometry: {
            type: "LineString" as const,
            coordinates: route.coordinates.map(([lat, lng]) => [lng, lat])
          },
        };
      })
    );

    // Sort descending by safety score, tag the winner
    scored.sort((a, b) => b.safetyScore - a.safetyScore);
    if (scored.length > 0) scored[0].isSafest = true;

    return NextResponse.json(scored);
  } catch (error) {
    console.error("[POST /api/routes/score]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
