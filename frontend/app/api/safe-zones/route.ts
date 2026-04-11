// GET safe zones API
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ zones: [] });
}
