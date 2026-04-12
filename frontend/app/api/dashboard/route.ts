import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

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

// ─── POST /api/dashboard — Upload a new report with image ───────────────────

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const formData = await request.formData();

    const city = formData.get("city") as string;
    const state = formData.get("state") as string;
    const description = formData.get("description") as string;
    const imageFile = formData.get("image") as File | null;

    if (!city?.trim() || !state?.trim()) {
      return NextResponse.json(
        { error: "City and state are required" },
        { status: 400 }
      );
    }

    if (!description?.trim()) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    let imageUrl: string | null = null;

    // Upload image to Supabase Storage if provided
    if (imageFile && imageFile.size > 0) {
      const fileExt = imageFile.name.split(".").pop() || "jpg";
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } =
        await supabaseAdmin.storage
          .from("report-images")
          .upload(fileName, imageFile, {
            contentType: imageFile.type,
            upsert: false,
          });

      if (uploadError) {
        console.error("[POST /api/dashboard] Storage upload error:", uploadError);
        // Continue without image rather than failing the whole request
      } else {
        const { data: urlData } = supabaseAdmin.storage
          .from("report-images")
          .getPublicUrl(uploadData.path);
        imageUrl = urlData.publicUrl;
      }
    }

    // Insert into dashboard_reports table
    const { data, error } = await supabaseAdmin
      .from("dashboard_reports")
      .insert({
        user_id: user.id,
        user_email: user.email ?? "",
        city: city.trim(),
        state: state.trim(),
        description: description.trim(),
        image_url: imageUrl,
      })
      .select("id, created_at")
      .single();

    if (error) {
      console.error("[POST /api/dashboard] DB insert error:", error);
      return NextResponse.json(
        { error: "Failed to create report" },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("[POST /api/dashboard]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── GET /api/dashboard — Fetch reports with optional filters ───────────────
// Query params: city, state, user_only (if true, only fetch current user's reports)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city");
    const state = searchParams.get("state");
    const userOnly = searchParams.get("user_only") === "true";

    let query = supabaseAdmin
      .from("dashboard_reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (city) {
      query = query.ilike("city", `%${city}%`);
    }

    if (state) {
      query = query.ilike("state", `%${state}%`);
    }

    // If user_only, require auth and filter by user_id
    if (userOnly) {
      const user = await getAuthUser(request);
      if (!user) {
        return NextResponse.json(
          { error: "Authentication required for user-only filter" },
          { status: 401 }
        );
      }
      query = query.eq("user_id", user.id);
    }

    const { data, error } = await query.limit(100);

    if (error) {
      console.error("[GET /api/dashboard] DB query error:", error);
      return NextResponse.json([], { status: 200 });
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error("[GET /api/dashboard]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
