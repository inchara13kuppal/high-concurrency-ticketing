import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { redis, seatLockKey } from "@/lib/redis";
import { isUuid } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  if (!isUuid(eventId)) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  try {
    const result = await pool.query(
      `SELECT v.total_capacity
         FROM events e
         JOIN venues v ON v.venue_id = e.venue_id
        WHERE e.event_id = $1`,
      [eventId],
    );
    const capacity = result.rows[0]?.total_capacity as number | undefined;
    if (!capacity) return NextResponse.json({ error: "Event not found." }, { status: 404 });

    const [session, soldResult] = await Promise.all([
      getServerSession(authOptions),
      pool.query(
        "SELECT seat_number FROM bookings WHERE event_id = $1 AND status = 'SUCCESS'",
        [eventId],
      ),
    ]);
    const seatLabels = Array.from({ length: capacity }, (_, index) =>
      String(index + 1).padStart(3, "0"),
    );
    const lockKeys = seatLabels.map((seat) => seatLockKey(eventId, seat));
    const lockOwners = await redis.mget<(string | null)[]>(...lockKeys);
    const soldSeats = new Set(
      soldResult.rows.map((row) => String(row.seat_number).padStart(3, "0")),
    );
    const lockedSeats = seatLabels
      .map((seat, index) => {
        const owner = lockOwners[index];
        return owner ? { seatNumber: seat, ownedByYou: owner === session?.user?.id } : null;
      })
      .filter((seat): seat is { seatNumber: string; ownedByYou: boolean } => Boolean(seat));

    return NextResponse.json({
      capacity,
      soldSeats: Array.from(soldSeats),
      lockedSeats,
    });
  } catch (error) {
    console.error("Could not load seat status", error);
    return NextResponse.json({ error: "Seat availability is temporarily unavailable." }, { status: 503 });
  }
}