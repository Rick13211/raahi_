import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { supabaseAdmin } from "@/lib/supabase";
import twilio from "twilio";
import sgMail from "@sendgrid/mail";

// ─── Validation ──────────────────────────────────────────────────────────────

const SOSRequestSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  userId: z.string().uuid(),
});

// ─── Config ──────────────────────────────────────────────────────────────────

function getTwilioClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error("Twilio credentials not configured");
  return twilio(sid, token);
}

function initSendGrid() {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) throw new Error("SendGrid API key not configured");
  sgMail.setApiKey(apiKey);
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

    // Initialize external services
    const twilioClient = getTwilioClient();
    initSendGrid();
    const fromNumber = process.env.TWILIO_FROM_NUMBER!;

    // Fire SMS and email in parallel for all contacts
    const sendPromises: Promise<unknown>[] = [];

    for (const contact of contacts) {
      // Determine if contact is phone or email
      if (contact.includes("@")) {
        // Send email via SendGrid
        sendPromises.push(
          sgMail.send({
            to: contact,
            from: "sos@safestep.ai", // Must be a verified sender in SendGrid
            subject: "🚨 SOS Alert — SafeStep AI Emergency",
            text: smsBody,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
                <h2 style="color: #dc2626;">🚨 SOS Emergency Alert</h2>
                <p>Your contact has triggered an SOS alert on SafeStep AI and may need immediate help.</p>
                <p><strong>📍 Their current location:</strong></p>
                <p><a href="${mapsLink}" style="color: #2563eb; font-size: 16px;">${mapsLink}</a></p>
                <p>Please check on them immediately or call emergency services.</p>
                <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
                <p style="color: #6b7280; font-size: 12px;">This is an automated alert from SafeStep AI.</p>
              </div>
            `,
          })
        );
      } else {
        // Send SMS via Twilio
        sendPromises.push(
          twilioClient.messages.create({
            body: smsBody,
            from: fromNumber,
            to: contact,
          })
        );
      }
    }

    await Promise.all(sendPromises);

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
