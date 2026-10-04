import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getMongoDb } from "@/lib/mongodb";
import { pool } from "@/lib/db";
import { isUuid } from "@/lib/validation";

export const runtime = "nodejs";

type NewEventBody = {
  title?: unknown;
  venue_id?: unknown;
  start_time?: unknown;
  base_price?: unknown;
  total_capacity?: unknown;
  images?: unknown;
  director?: unknown;
  lead_artists?: unknown;
};

function parseTextList(value: unknown, maxItems: number, maxLength: number): string[] | null {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) return null;
  const items = value.map((item) => item.trim()).filter(Boolean);
  if (items.length > maxItems || items.some((item) => item.length > maxLength)) return null;
  return items;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (session.user.role !== "Admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  let body: NewEventBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send valid event details." }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const venueId = typeof body.venue_id === "string" ? body.venue_id : "";
  const startTime = typeof body.start_time === "string" ? new Date(body.start_time) : null;
  const basePriceText = typeof body.base_price === "string" || typeof body.base_price === "number"
    ? String(body.base_price)
    : "";
  const totalCapacity = body.total_capacity;
  const images = parseTextList(body.images, 10, 2048);
  const leadArtists = parseTextList(body.lead_artists, 20, 120);
  const director = typeof body.director === "string" ? body.director.trim() : "";

  if (!title || title.length > 220) {
    return NextResponse.json({ error: "Enter an event title of 1 to 220 characters." }, { status: 400 });
  }
  if (!isUuid(venueId)) return NextResponse.json({ error: "Choose a valid venue." }, { status: 400 });
  if (!startTime || !Number.isFinite(startTime.getTime()) || startTime.getTime() <= Date.now()) {
    return NextResponse.json({ error: "Choose a future start time." }, { status: 400 });
  }
  if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(basePriceText)) {
    return NextResponse.json({ error: "Enter a valid ticket price with up to two decimal places." }, { status: 400 });
  }
  if (!Number.isInteger(totalCapacity) || Number(totalCapacity) < 1 || Number(totalCapacity) > 100_000) {
    return NextResponse.json({ error: "Choose a valid event capacity." }, { status: 400 });
  }
  if (!images || !leadArtists || director.length > 180) {
    return NextResponse.json({ error: "Check the image and film credit details." }, { status: 400 });
  }
  for (const image of images) {
    try {
      const url = new URL(image);
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("invalid URL");
    } catch {
      return NextResponse.json({ error: "Each image must be a valid HTTP or HTTPS URL." }, { status: 400 });
    }
  }

  const client = await pool.connect();
  let transactionOpen = false;
  let mongoInserted = false;
  let mongoDb: Awaited<ReturnType<typeof getMongoDb>> | null = null;
  let eventId: string | null = null;

  try {
    await client.query("BEGIN");
    transactionOpen = true;

    const venueResult = await client.query<{ venue_id: string }>(
      "SELECT venue_id FROM venues WHERE venue_id = $1 FOR SHARE",
      [venueId],
    );
    const venue = venueResult.rows[0];
    if (!venue) {
      await client.query("ROLLBACK");
      transactionOpen = false;
      return NextResponse.json({ error: "The selected venue was not found." }, { status: 404 });
    }
    const eventResult = await client.query<{ event_id: string }>(
      `INSERT INTO events (venue_id, title, start_time, base_price, total_capacity, available_seats)
       VALUES ($1, $2, $3, $4, $5, $5)
       RETURNING event_id`,
      [venueId, title, startTime.toISOString(), basePriceText, totalCapacity],
    );
    eventId = eventResult.rows[0].event_id;

    mongoDb = await getMongoDb();
    await mongoDb.collection("event_details").insertOne({
      event_id: eventId,
      images,
      image_url: images[0] ?? null,
      director: director || null,
      lead_artists: leadArtists,
    });
    mongoInserted = true;

    await client.query("COMMIT");
    transactionOpen = false;
    return NextResponse.json({ event_id: eventId }, { status: 201 });
  } catch (error) {
    if (transactionOpen) await client.query("ROLLBACK").catch(() => undefined);
    if (mongoInserted && mongoDb && eventId) {
      await mongoDb.collection("event_details").deleteOne({ event_id: eventId }).catch((cleanupError) => {
        console.error("Could not remove event metadata after a failed PostgreSQL insert", cleanupError);
      });
    }
    console.error("Could not create admin event", error);
    return NextResponse.json({ error: "Event creation is temporarily unavailable." }, { status: 503 });
  } finally {
    client.release();
  }
}