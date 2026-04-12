// 🔒 BACKEND/DB — DO NOT MODIFY (flagged for future work)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { supabaseAdmin } from "@/lib/supabase";
import twilio from "twilio";

// NOTE: Twilio requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER in .env.local

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
// Auth required. Sends SOS SMS to all emergency phone contacts using Twilio.

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
    const smsBody = `🚨 SOS ALERT! Your contact needs help. Their location:\n${mapsLink}\n\nPlease check on them immediately or call emergency services.`;

    // Filter to only phone numbers and ensure they have a leading '+' sign
    const phoneContacts = contacts
      .filter((contact) => !contact.includes("@"))
      .map((contact) => (contact.startsWith("+") ? contact : `+${contact}`));

    if (phoneContacts.length === 0) {
      return NextResponse.json(
        { error: "No valid phone numbers found for emergency contacts" },
        { status: 400 }
      );
    }

    // Initialize Twilio
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_FROM_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      return NextResponse.json(
        { error: "SMS service is not fully configured on the server." },
        { status: 500 }
      );
    }

    const client = twilio(accountSid, authToken);

    // Send SMS via Twilio using Promise.allSettled to not fail if one number is invalid
    const smsPromises = phoneContacts.map((contact) =>
      client.messages.create({
        body: smsBody,
        from: fromNumber,
        to: contact,
      })
    );

    const results = await Promise.allSettled(smsPromises);

    // Check if any succeeded
    const succeedCount = results.filter((r) => r.status === "fulfilled").length;

    if (succeedCount === 0) {
      console.error("[POST /api/sos] All SMS sending failed:", results);
      return NextResponse.json(
        { error: "Failed to deliver SMS to any contact." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sent: true,
      contactCount: succeedCount,
      totalAttempted: phoneContacts.length,
    });
  } catch (error) {
    console.error("[POST /api/sos]", error);
    return NextResponse.json(
      { error: "Failed to send SOS alerts" },
      { status: 500 }
    );
  }
}
