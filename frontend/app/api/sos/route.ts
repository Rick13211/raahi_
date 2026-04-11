import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { supabaseAdmin } from "@/lib/supabase";

// NOTE: Twilio & SendGrid are stubbed until credentials are configured.
// Install when ready: npm install twilio @sendgrid/mail
// Then add to .env.local: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
//   TWILIO_FROM_NUMBER, SENDGRID_API_KEY

// ─── Validation ──────────────────────────────────────────────────────────────

const SOSRequestSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  userId: z.string().uuid(),
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

// ─── POST /api/sos ───────────────────────────────────────────────────────────
// Auth required. Sends SOS SMS + email to all emergency contacts.

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
    const parsed = SOSRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { lat, lng, userId } = parsed.data;

    // Verify the auth user matches the userId in the request
    if (user.id !== userId) {
      return NextResponse.json(
        { error: "User ID mismatch" },
        { status: 403 }
      );
    }

    // Fetch emergency contacts
    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("emergency_contacts")
      .eq("id", userId)
      .single();

    if (userError || !userData) {
      console.error("[POST /api/sos] User fetch error:", userError);
      return NextResponse.json(
        { error: "User not found or no emergency contacts configured" },
        { status: 404 }
      );
    }

    const contacts: string[] = userData.emergency_contacts ?? [];
    if (contacts.length === 0) {
      return NextResponse.json(
        { error: "No emergency contacts configured" },
        { status: 400 }
      );
    }

    const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`;
    const smsBody = `🚨 SOS ALERT from SafeStep AI!\nYour contact needs help. Their current location:\n${mapsLink}\n\nPlease check on them immediately or call emergency services.`;

    // ── STUB: Replace with real Twilio/SendGrid when credentials are ready ────
    console.warn("[SOS STUB] Would send alerts to:", contacts);
    console.warn("[SOS STUB] Message:", smsBody);
    for (const contact of contacts) {
      if (contact.includes("@")) {
        console.log(`[SOS STUB] Email → ${contact}`);
      } else {
        console.log(`[SOS STUB] SMS → ${contact}`);
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    return NextResponse.json({
      sent: true,
      contactCount: contacts.length,
    });
  } catch (error) {
    console.error("[POST /api/sos]", error);
    return NextResponse.json(
      { error: "Failed to send SOS alerts" },
      { status: 500 }
    );
  }
}
