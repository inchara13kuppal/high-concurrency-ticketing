import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { redis, releaseSeatLock, seatLockKey } from "@/lib/redis";
import { isUuid } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in before checking out." }, { status: 401 });
  }

  let body: { eventId?: unknown; seatNumber?: unknown; paymentResult?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Choose a valid seat and payment result." }, { status: 400 });
  }
  const eventId = typeof body.eventId === "string" ? body.eventId : "";
  const seatNumber = typeof body.seatNumber === "string" ? body.seatNumber : "";
  const paymentResult = body.paymentResult;
  if (
    !isUuid(eventId) ||
    !/^\d{1,4}$/.test(seatNumber) ||
    !["SUCCESS", "FAILURE"].includes(String(paymentResult))
  ) {
    return NextResponse.json({ error: "Choose a valid seat and payment result." }, { status: 400 });
  }

  const seat = String(Number(seatNumber)).padStart(3, "0");
  const key = seatLockKey(eventId, seat);
  let client;
  let transactionStarted = false;
  let lockReleased = false;

  try {
    const lockOwner = await redis.get<string>(key);
    if (lockOwner !== session.user.id) {
      return NextResponse.json({ error: "Your seat lock expired. Select the seat again." }, { status: 409 });
    }

    client = await pool.connect();
    await client.query("BEGIN");
    transactionStarted = true;

    if (paymentResult === "FAILURE") {
      await client.query("ROLLBACK");
      transactionStarted = false;
      await releaseSeatLock(key, session.user.id);
      lockReleased = true;
      return NextResponse.json(
        { status: "FAILED", message: "Payment was not completed. The seat has been released." },
        { status: 402 },
      );
    }

    const lockStillOwned = await redis.get<string>(key);
    if (lockStillOwned !== session.user.id) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return NextResponse.json({ error: "Your seat lock expired. Select the seat again." }, { status: 409 });
    }

    const { rows } = await client.query(
      "SELECT create_booking($1::uuid, $2::uuid, $3::varchar) AS booking_id",
      [session.user.id, eventId, seat],
    );
    await client.query("COMMIT");
    transactionStarted = false;
    lockReleased = true;
    try {
      await releaseSeatLock(key, session.user.id);
    } catch (releaseError) {
      console.error("Booking committed, but the Redis lock could not be cleared", releaseError);
    }
    return NextResponse.json({
      status: "SUCCESS",
      bookingId: rows[0].booking_id,
      seatNumber: seat,
      message: "Your ticket is confirmed.",
    });
  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Checkout rollback failed", rollbackError);
      }
    }
    if ((error as { code?: string }).code === "23505") {
      return NextResponse.json({ error: "That seat has just been booked by someone else." }, { status: 409 });
    }
    if ((error as { code?: string }).code === "23514") {
      return NextResponse.json({ error: "No seats remain for this event." }, { status: 409 });
    }
    if ((error as { code?: string }).code === "P0002") {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }
    console.error("Checkout failed", error);
    return NextResponse.json({ error: "Checkout could not be completed. Your seat lock was released." }, { status: 500 });
  } finally {
    client?.release();
    if (!lockReleased) {
      try {
        await releaseSeatLock(key, session.user.id);
      } catch (releaseError) {
        console.error("Could not release seat after checkout", releaseError);
      }
    }
  }
}