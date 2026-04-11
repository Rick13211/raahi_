// GET route scoring API
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ score: 85 });
}
