import { NextRequest, NextResponse } from "next/server";

const GOV_API_KEY = "579b464db66ec23bdd00000128653ff8a9e1453c50a294e90a505a29";
const GOV_RESOURCE_ID = "adbf8d4e-f7cb-44b7-bc14-13f655bf078d";
const GOV_API_BASE = `https://api.data.gov.in/resource/${GOV_RESOURCE_ID}`;

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name");

  if (!name || !name.trim()) {
    return NextResponse.json(
      { error: "Missing 'name' query parameter" },
      { status: 400 }
    );
  }

  try {
    const url = `${GOV_API_BASE}?api-key=${GOV_API_KEY}&format=json&filters[state_ut_city]=${encodeURIComponent(name.trim())}&limit=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Upstream API error", status: res.status },
        { status: 502 }
      );
    }

    const data = await res.json();
    const rec = data.records?.[0];

    if (!rec) {
      return NextResponse.json({ record: null });
    }

    // Validate that the returned record actually matches the queried name
    const returnedName = (rec.state_ut_city ?? "").toLowerCase().trim();
    const queriedName = name.toLowerCase().trim();
    if (returnedName && returnedName !== queriedName) {
      // The API filter didn't match — returned a different record
      return NextResponse.json({ record: null });
    }

    return NextResponse.json({
      record: {
        state_ut_city: rec.state_ut_city ?? name,
        cases: Number(rec.total_traffic_accidents___cases) || 0,
        injured: Number(rec.total_traffic_accidents___injured) || 0,
        died: Number(rec.total_traffic_accidents___died) || 0,
      },
    });
  } catch (err: any) {
    console.error("[GET /api/accident]", err.message);
    return NextResponse.json(
      { error: "Failed to fetch accident data" },
      { status: 500 }
    );
  }
}
