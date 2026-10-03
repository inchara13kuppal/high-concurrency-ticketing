import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getBookingAgeError } from "@/lib/age";
import { pool } from "@/lib/db";
import { acquireSeatLocks, releaseSeatLocks, SEAT_LOCK_SECONDS } from "@/lib/redis";
import { normalizeSeatNumbers } from "@/lib/seats";
import { isUuid } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in before selecting seats." }, { status: 401 });
  }

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

  let locksAcquired = false;
  try {
    const ageError = await getBookingAgeError(session.user.id);
    if (ageError) return NextResponse.json({ error: ageError }, { status: 403 });

    const eventResult = await pool.query(
      `SELECT v.total_capacity, e.available_seats
         FROM events e
         JOIN venues v ON v.venue_id = e.venue_id
        WHERE e.event_id = $1
          AND e.start_time > NOW()`,
      [eventId],
    );
    const event = eventResult.rows[0];
    if (!event) return NextResponse.json({ error: "That event is not available." }, { status: 404 });
    if (
      seatNumbers.some((seat) => Number(seat) > Number(event.total_capacity)) ||
      seatNumbers.length > Number(event.available_seats)
    ) {
      return NextResponse.json({ error: "One or more seats are not available." }, { status: 409 });
    }

    const soldResult = await pool.query(
      `SELECT seat_number
         FROM bookings
        WHERE event_id = $1
          AND status = 'SUCCESS'
          AND seat_number = ANY($2::varchar[])`,
      [eventId, seatNumbers],
    );
    if (soldResult.rows.length) {
      return NextResponse.json({ error: "One or more seats have already been booked." }, { status: 409 });
    }

    const lockResult = await acquireSeatLocks(eventId, seatNumbers, session.user.id);
    if (!lockResult.locked) {
      const conflictingSeat = seatNumbers[lockResult.conflictIndex];
      return NextResponse.json(
        { error: `Seat ${conflictingSeat} is being held by someone else.`, seatNumber: conflictingSeat },
        { status: 409 },
      );
    }
    locksAcquired = true;

    const soldAfterLock = await pool.query(
      `SELECT seat_number
         FROM bookings
        WHERE event_id = $1
          AND status = 'SUCCESS'
          AND seat_number = ANY($2::varchar[])`,
      [eventId, seatNumbers],
    );
    if (soldAfterLock.rows.length) {
      await releaseSeatLocks(eventId, seatNumbers, session.user.id);
      locksAcquired = false;
      return NextResponse.json({ error: "One or more seats have just been booked." }, { status: 409 });
    }

    return NextResponse.json({
      locked: true,
      seatNumbers,
      expiresIn: SEAT_LOCK_SECONDS,
    });
  } catch (error) {
    if (locksAcquired) {
      try {
        await releaseSeatLocks(eventId, seatNumbers, session.user.id);
      } catch (releaseError) {
        console.error("Could not release seats after a failed hold request", releaseError);
      }
    }
    console.error("Could not lock seats", error);
    return NextResponse.json({ error: "Seat locking is temporarily unavailable." }, { status: 503 });
  }
}