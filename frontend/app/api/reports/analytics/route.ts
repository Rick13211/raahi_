import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { supabaseAdmin } from "@/lib/supabase";

const AnalyticsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(180).default(30),
});

type ReportRow = {
  created_at: string;
  safety_rating: number;
  street_lamp_status: boolean;
  crowd: number;
  theft: boolean;
};

type DailyBucket = {
  date: string;
  reports: number;
  avgSafety: number;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const parsed = AnalyticsQuerySchema.safeParse({
      days: searchParams.get("days") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { days } = parsed.data;
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabaseAdmin
      .from("user_reports")
      .select("created_at, safety_rating, street_lamp_status, crowd, theft")
      .gte("created_at", sinceDate)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[GET /api/reports/analytics] DB error:", error);
      return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
    }

    const rows = (data ?? []) as ReportRow[];

    const dailyMap = new Map<string, { reports: number; safetySum: number }>();
    const crowdMap = new Map<number, number>([
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
      [5, 0],
    ]);
    const safetyMap = new Map<number, number>([
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
      [5, 0],
    ]);

    let theftTrue = 0;
    let theftFalse = 0;
    let lampTrue = 0;
    let lampFalse = 0;

    for (const row of rows) {
      const day = row.created_at.slice(0, 10);
      const existing = dailyMap.get(day) ?? { reports: 0, safetySum: 0 };
      existing.reports += 1;
      existing.safetySum += row.safety_rating;
      dailyMap.set(day, existing);

      const crowdValue = Number.isInteger(row.crowd) ? row.crowd : 0;
      if (crowdMap.has(crowdValue)) {
        crowdMap.set(crowdValue, (crowdMap.get(crowdValue) ?? 0) + 1);
      }

      const safetyValue = Number.isInteger(row.safety_rating) ? row.safety_rating : 0;
      if (safetyMap.has(safetyValue)) {
        safetyMap.set(safetyValue, (safetyMap.get(safetyValue) ?? 0) + 1);
      }

      if (row.theft) theftTrue += 1;
      else theftFalse += 1;

      if (row.street_lamp_status) lampTrue += 1;
      else lampFalse += 1;
    }

    const daily: DailyBucket[] = [...dailyMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, agg]) => ({
        date,
        reports: agg.reports,
        avgSafety: Number((agg.safetySum / Math.max(agg.reports, 1)).toFixed(2)),
      }));

    const crowdDistribution = [...crowdMap.entries()].map(([bucket, count]) => ({
      bucket,
      count,
    }));

    const safetyDistribution = [...safetyMap.entries()].map(([bucket, count]) => ({
      bucket,
      count,
    }));

    return NextResponse.json({
      meta: {
        days,
        totalReports: rows.length,
        generatedAt: new Date().toISOString(),
      },
      daily,
      crowdDistribution,
      safetyDistribution,
      theftSplit: [
        { label: "Theft Reported", value: theftTrue },
        { label: "No Theft", value: theftFalse },
      ],
      lampSplit: [
        { label: "Lamp Working", value: lampTrue },
        { label: "Lamp Not Working", value: lampFalse },
      ],
    });
  } catch (error) {
    console.error("[GET /api/reports/analytics]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
