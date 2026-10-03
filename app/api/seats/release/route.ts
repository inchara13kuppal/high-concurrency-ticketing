import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { redis, releaseSeatLock, seatLockKey } from "@/lib/redis";
import { isUuid } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to release a seat." }, { status: 401 });

  let body: { eventId?: unknown; seatNumber?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Choose a valid seat." }, { status: 400 });
  }
  const eventId = typeof body.eventId === "string" ? body.eventId : "";
  const seatNumber = typeof body.seatNumber === "string" ? body.seatNumber : "";
  if (!isUuid(eventId) || !/^\d{1,4}$/.test(seatNumber)) {
    return NextResponse.json({ error: "Choose a valid seat." }, { status: 400 });
  }

  try {
    const key = seatLockKey(eventId, String(Number(seatNumber)).padStart(3, "0"));
    await releaseSeatLock(key, session.user.id);
    return NextResponse.json({ released: true });
  } catch (error) {
    console.error("Could not release seat lock", error);
    return NextResponse.json({ error: "Could not release the seat right now." }, { status: 503 });
  }
}