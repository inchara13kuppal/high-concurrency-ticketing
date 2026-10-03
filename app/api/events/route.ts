import { NextResponse } from "next/server";
import { getUpcomingEvents } from "@/lib/queries";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json({ events: await getUpcomingEvents() });
  } catch (error) {
    console.error("Could not load events", error);
    return NextResponse.json({ error: "Event listings are temporarily unavailable." }, { status: 503 });
  }
}