import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { redis, seatLockKey, SEAT_LOCK_SECONDS } from "@/lib/redis";
import { isUuid } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in before selecting a seat." }, { status: 401 });
  }

  let body: { eventId?: unknown; seatNumber?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Choose a valid seat." }, { status: 400 });
  }
  const eventId = typeof body.eventId === "string" ? body.eventId : "";
  const seatNumber = typeof body.seatNumber === "string" ? body.seatNumber : "";
  const seatIndex = Number(seatNumber);
  if (!isUuid(eventId) || !/^\d{1,4}$/.test(seatNumber) || !Number.isInteger(seatIndex) || seatIndex < 1) {
    return NextResponse.json({ error: "Choose a valid seat." }, { status: 400 });
  }
  const seat = String(seatIndex).padStart(3, "0");

  try {
    const { rows } = await pool.query(
      `SELECT v.total_capacity,
              EXISTS (
                SELECT 1 FROM bookings b
                 WHERE b.event_id = e.event_id
                   AND b.seat_number = $2
                   AND b.status = 'SUCCESS'
              ) AS sold
         FROM events e
         JOIN venues v ON v.venue_id = e.venue_id
        WHERE e.event_id = $1
          AND e.start_time > NOW()`,
      [eventId, seat],
    );
    const event = rows[0];
    if (!event || seatIndex > Number(event.total_capacity)) {
      return NextResponse.json({ error: "That seat is not available." }, { status: 404 });
    }
    if (event.sold) {
      return NextResponse.json({ error: "That seat has already been booked." }, { status: 409 });
    }

    const key = seatLockKey(eventId, seat);
    const result = await redis.set(key, session.user.id, { ex: SEAT_LOCK_SECONDS, nx: true });
    if (result === "OK") {
      return NextResponse.json({ locked: true, seatNumber: seat, expiresIn: SEAT_LOCK_SECONDS });
    }
    const currentOwner = await redis.get<string>(key);
    if (currentOwner === session.user.id) {
      return NextResponse.json({ locked: true, alreadyOwned: true, seatNumber: seat, expiresIn: SEAT_LOCK_SECONDS });
    }
    return NextResponse.json({ error: "Someone else is holding this seat. Choose another." }, { status: 409 });
  } catch (error) {
    console.error("Could not lock seat", error);
    return NextResponse.json({ error: "Seat locking is temporarily unavailable." }, { status: 503 });
  }
}