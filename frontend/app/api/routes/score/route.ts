import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { getRoutesFromCoordinates } from "@/lib/routing";
import { scoreRoute } from "@/lib/safetyEngine";
import type { ScoredRoute } from "@/types";

const LatLngSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const ScoreRequestSchema = z.object({
  origin: LatLngSchema,
  destination: LatLngSchema,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parsed = ScoreRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { origin, destination } = parsed.data;

    const routes = await getRoutesFromCoordinates(origin, destination);

    const scored = await Promise.all(
      routes.map(async (route, idx) => {
        const { score, reasonTags } = await scoreRoute({
          coords: route.coordinates,
          time: new Date(),
        });

        return {
          coordinates: route.coordinates,
          duration: route.duration,
          distance: route.distance,
          isFastest: idx === 0, 
          isSafest: false,      
          safetyScore: score,
          reasonTags,
          geometry: {
            type: "LineString" as const,
            coordinates: route.coordinates.map(([lat, lng]) => [lng, lat])
          },
        };
      })
    );

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
