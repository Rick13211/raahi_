import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { getRoutes } from "@/lib/routing";
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
    const routes = await getRoutes(origin, destination);

    // Score each route in parallel
    const scoredRoutes: ScoredRoute[] = await Promise.all(
      routes.map(async (route) => {
        const { score, reasonTags } = await scoreRoute({
          coords: route.coords,
          time: new Date(),
        });

        return {
          geometry: route.geometry,
          eta: Math.round(route.duration / 60), // seconds → minutes
          safetyScore: score,
          reasonTags,
        };
      })
    );

    // Sort by safety score descending (safest first)
    scoredRoutes.sort((a, b) => b.safetyScore - a.safetyScore);

    return NextResponse.json(scoredRoutes);
  } catch (error) {
    console.error("[POST /api/routes/score]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
