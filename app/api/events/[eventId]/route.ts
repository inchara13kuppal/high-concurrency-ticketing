import { NextResponse } from "next/server";
import { getEvent } from "@/lib/queries";
import { isUuid } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  if (!isUuid(eventId)) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }
  try {
    const event = await getEvent(eventId);
    if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });
    return NextResponse.json({ event });
  } catch (error) {
    console.error("Could not load event", error);
    return NextResponse.json({ error: "Event details are temporarily unavailable." }, { status: 503 });
  }
}