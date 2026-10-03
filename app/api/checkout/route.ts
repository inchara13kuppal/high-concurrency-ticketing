import { getServerSession } from "next-auth";
import type { PoolClient } from "pg";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getBookingAgeError } from "@/lib/age";
import { sendConfirmationEmail } from "@/lib/email";
import { pool } from "@/lib/db";
import { refreshSeatLocks, releaseSeatLocks } from "@/lib/redis";
import { normalizeSeatNumbers } from "@/lib/seats";
import { isUuid } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in before checking out." }, { status: 401 });
  }

  let body: { eventId?: unknown; seatNumbers?: unknown; paymentResult?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Choose valid seats and a payment result." }, { status: 400 });
  }
  const eventId = typeof body.eventId === "string" ? body.eventId : "";
  const seatNumbers = normalizeSeatNumbers(body.seatNumbers);
  const paymentResult = body.paymentResult;
  if (
    !isUuid(eventId) ||
    !seatNumbers ||
    !["SUCCESS", "FAILURE"].includes(String(paymentResult))
  ) {
    return NextResponse.json({ error: "Choose valid seats and a payment result." }, { status: 400 });
  }

  let client: PoolClient | undefined;
  let transactionStarted = false;
  let locksReleased = false;

  try {
    const ageError = await getBookingAgeError(session.user.id);
    if (ageError) return NextResponse.json({ error: ageError }, { status: 403 });

    const lockResult = await refreshSeatLocks(eventId, seatNumbers, session.user.id);
    if (!lockResult.owned) {
      return NextResponse.json(
        { error: "One or more seat holds expired. Select the seats again." },
        { status: 409 },
      );
    }

    client = await pool.connect();
    await client.query("BEGIN");
    transactionStarted = true;

    if (paymentResult === "FAILURE") {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return NextResponse.json(
        { status: "FAILED", message: "Payment was not completed. Your seats have been released." },
        { status: 402 },
      );
    }

    const { rows: bookings } = await client.query<{ booking_id: string; seat_number: string }>(
      "SELECT booking_id, seat_number FROM create_bookings($1::uuid, $2::uuid, $3::varchar[])",
      [session.user.id, eventId, seatNumbers],
    );
    const { rows: eventRows } = await client.query<{ title: string; base_price: string }>(
      "SELECT title, base_price FROM events WHERE event_id = $1",
      [eventId],
    );
    const event = eventRows[0];
    if (!event || bookings.length !== seatNumbers.length) {
      throw new Error("The booking transaction returned an incomplete result.");
    }

    const orderedBookings = bookings.sort((left, right) => Number(left.seat_number) - Number(right.seat_number));
    const orderedSeatNumbers = orderedBookings.map((booking) => booking.seat_number);
    const bookingIds = orderedBookings.map((booking) => booking.booking_id);
    const totalAmount = Number(event.base_price) * orderedBookings.length;

    await client.query("COMMIT");
    transactionStarted = false;
    try {
      await releaseSeatLocks(eventId, seatNumbers, session.user.id);
      locksReleased = true;
    } catch (releaseError) {
      console.error("Booking committed, but the Redis locks could not be cleared", releaseError);
    }

    if (session.user.email) {
      try {
        await sendConfirmationEmail({
          to: session.user.email,
          recipientName: session.user.name ?? "",
          eventTitle: event.title,
          seatNumbers: orderedSeatNumbers,
          totalAmount,
        });
      } catch (emailError) {
        console.error("Tickets were confirmed, but the demo email could not be sent", emailError);
      }
    }

    return NextResponse.json({
      status: "SUCCESS",
      bookingIds,
      seatNumbers: orderedSeatNumbers,
      totalAmount,
      message: "Your tickets are confirmed.",
    });
  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Checkout rollback failed", rollbackError);
      }
    }
    const code = (error as { code?: string }).code;
    if (code === "42501") {
      return NextResponse.json(
        { error: (error as Error).message || "You must be 18 or older to book tickets." },
        { status: 403 },
      );
    }
    if (code === "23505") {
      return NextResponse.json({ error: "One or more seats have just been booked by someone else." }, { status: 409 });
    }
    if (code === "23514") {
      return NextResponse.json({ error: "Not enough seats remain for this event." }, { status: 409 });
    }
    if (code === "P0002") {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }
    if (code === "22023") {
      return NextResponse.json({ error: (error as Error).message || "Choose valid seats." }, { status: 400 });
    }
    console.error("Checkout failed", error);
    return NextResponse.json({ error: "Checkout could not be completed. Your seat holds were released." }, { status: 500 });
  } finally {
    client?.release();
    if (!locksReleased) {
      try {
        await releaseSeatLocks(eventId, seatNumbers, session.user.id);
      } catch (releaseError) {
        console.error("Could not release seats after checkout", releaseError);
      }
    }
  }
}