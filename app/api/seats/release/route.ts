import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { releaseSeatLocks } from "@/lib/redis";
import { normalizeSeatNumbers } from "@/lib/seats";
import { isUuid } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to release seats." }, { status: 401 });

  let body: { eventId?: unknown; seatNumbers?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Choose valid seats." }, { status: 400 });
  }
  const eventId = typeof body.eventId === "string" ? body.eventId : "";
  const seatNumbers = normalizeSeatNumbers(body.seatNumbers);
  if (!isUuid(eventId) || !seatNumbers) {
    return NextResponse.json({ error: "Choose valid seats." }, { status: 400 });
  }

  try {
    await releaseSeatLocks(eventId, seatNumbers, session.user.id);
    return NextResponse.json({ released: true, seatNumbers });
  } catch (error) {
    console.error("Could not release seat locks", error);
    return NextResponse.json({ error: "Could not release the seats right now." }, { status: 503 });
  }
}