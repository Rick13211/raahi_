// 🔒 BACKEND/DB — DO NOT MODIFY (flagged for future work)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { supabaseAdmin } from "@/lib/supabase";
import { randomUUID } from "crypto";

// ─── Validation ──────────────────────────────────────────────────────────────

const CreateJourneySchema = z.object({
  geometry: z.record(z.string(), z.unknown()).optional(),
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

// ─── POST /api/journeys ──────────────────────────────────────────────────────
// Auth required. Creates a journey with a generated share_token.

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is acceptable — geometry is optional
    }

    const parsed = CreateJourneySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const shareToken = randomUUID();

    const { data, error } = await supabaseAdmin
      .from("journeys")
      .insert({
        user_id: user.id,
        geometry: parsed.data.geometry ?? null,
        share_token: shareToken,
        started_at: new Date().toISOString(),
      })
      .select("id, share_token, started_at")
      .single();

    if (error) {
      console.error("[POST /api/journeys] DB insert error:", error);
      return NextResponse.json(
        { error: "Failed to create journey" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        id: data.id,
        shareToken: data.share_token,
        startedAt: data.started_at,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/journeys]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
