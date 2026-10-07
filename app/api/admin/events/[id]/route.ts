import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { getMongoDb } from "@/lib/mongodb";
import { isUuid } from "@/lib/validation";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

type EventInput = {
  title: string;
  venueId: string;
  startTime: Date;
  basePrice: string;
  totalCapacity: number;
  images: string[];
  director: string;
  leadArtists: string[];
};

async function authorizationError() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (session.user.role !== "Admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  return null;
}

function parseTextList(value: unknown, maxItems: number, maxLength: number): string[] | null {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) return null;
  const items = value.map((item) => item.trim()).filter(Boolean);
  if (items.length > maxItems || items.some((item) => item.length > maxLength)) return null;
  return items;
}

async function parseEventInput(request: Request): Promise<EventInput | NextResponse> {
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Send valid event details." }, { status: 400 });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Send valid event details." }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const venueId = typeof body.venue_id === "string" ? body.venue_id : "";
  const startTime = typeof body.start_time === "string" ? new Date(body.start_time) : null;
  const basePriceText =
    typeof body.base_price === "string" || typeof body.base_price === "number"
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
  if (!startTime || !Number.isFinite(startTime.getTime())) {
    return NextResponse.json({ error: "Choose a valid start time." }, { status: 400 });
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

  return {
    title,
    venueId,
    startTime,
    basePrice: basePriceText,
    totalCapacity: Number(totalCapacity),
    images,
    director,
    leadArtists,
  };
}

function isEventInput(value: EventInput | NextResponse): value is EventInput {
  return !(value instanceof NextResponse);
}

export async function GET(_request: Request, { params }: RouteContext) {
  const denied = await authorizationError();
  if (denied) return denied;

  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  try {
    const { rows } = await pool.query<{
      event_id: string;
      venue_id: string;
      title: string;
      start_time: Date;
      base_price: string;
      total_capacity: number;
      venue_name: string;
      location: string;
    }>(
      `SELECT e.event_id, e.venue_id, e.title, e.start_time, e.base_price,
              e.total_capacity, v.name AS venue_name, v.location
         FROM events e
         JOIN venues v ON v.venue_id = e.venue_id
        WHERE e.event_id = $1`,
      [id],
    );
    const event = rows[0];
    if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });

    const db = await getMongoDb();
    const details = await db.collection("event_details").findOne(
      { event_id: id },
      { projection: { _id: 0 } },
    );
    const images = Array.isArray(details?.images)
      ? details.images.filter((image): image is string => typeof image === "string")
      : typeof details?.image_url === "string"
        ? [details.image_url]
        : [];
    const leadArtists = Array.isArray(details?.lead_artists)
      ? details.lead_artists.filter((artist): artist is string => typeof artist === "string")
      : [];

    return NextResponse.json({
      event: {
        ...event,
        images,
        image_url: images[0] ?? null,
        director: typeof details?.director === "string" ? details.director : "",
        lead_artists: leadArtists,
      },
    });
  } catch (error) {
    console.error("Could not load admin event details", error);
    return NextResponse.json({ error: "Event details are temporarily unavailable." }, { status: 503 });
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  const denied = await authorizationError();
  if (denied) return denied;

  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  const input = await parseEventInput(request);
  if (!isEventInput(input)) return input;

  const client = await pool.connect();
  let transactionOpen = false;
  let mongoDb: Awaited<ReturnType<typeof getMongoDb>> | null = null;
  let previousDetails: Record<string, unknown> | null = null;
  let mongoUpdated = false;

  try {
    await client.query("BEGIN");
    transactionOpen = true;

    const existing = await client.query<{ tickets_sold: number }>(
      `SELECT (
                SELECT COUNT(*)::INTEGER
                  FROM bookings b
                 WHERE b.event_id = e.event_id
                   AND b.status = 'SUCCESS'
              ) AS tickets_sold
         FROM events e
        WHERE e.event_id = $1
        FOR UPDATE`,
      [id],
    );
    if (!existing.rows[0]) {
      await client.query("ROLLBACK");
      transactionOpen = false;
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    const venue = await client.query<{ venue_id: string }>(
      "SELECT venue_id FROM venues WHERE venue_id = $1 FOR KEY SHARE",
      [input.venueId],
    );
    if (!venue.rows[0]) {
      await client.query("ROLLBACK");
      transactionOpen = false;
      return NextResponse.json({ error: "The selected venue was not found." }, { status: 404 });
    }

    const ticketsSold = Number(existing.rows[0].tickets_sold);
    if (input.totalCapacity < ticketsSold) {
      await client.query("ROLLBACK");
      transactionOpen = false;
      return NextResponse.json(
        { error: `Capacity cannot be lower than the ${ticketsSold} tickets already sold.` },
        { status: 409 },
      );
    }

    await client.query(
      `UPDATE events
          SET venue_id = $2,
              title = $3,
              start_time = $4,
              base_price = $5,
              total_capacity = $6,
              available_seats = $6::int - $7::int
        WHERE event_id = $1`,
      [id, input.venueId, input.title, input.startTime.toISOString(), input.basePrice, input.totalCapacity, ticketsSold],
    );

    mongoDb = await getMongoDb();
    const collection = mongoDb.collection("event_details");
    previousDetails = await collection.findOne({ event_id: id }) as Record<string, unknown> | null;
    await collection.updateOne(
      { event_id: id },
      {
        $set: {
          images: input.images,
          image_url: input.images[0] ?? null,
          director: input.director || null,
          lead_artists: input.leadArtists,
        },
      },
      { upsert: true },
    );
    mongoUpdated = true;

    await client.query("COMMIT");
    transactionOpen = false;
    return NextResponse.json({ updated: true, event_id: id });
  } catch (error) {
    if (transactionOpen && client) await client.query("ROLLBACK").catch(() => undefined);
    if (mongoUpdated && mongoDb) {
      const collection = mongoDb.collection("event_details");
      const restore = previousDetails
        ? collection.replaceOne({ event_id: id }, previousDetails as never, { upsert: true })
        : collection.deleteOne({ event_id: id });
      await restore.catch((restoreError) => {
        console.error("Could not restore event metadata after a failed PostgreSQL update", restoreError);
      });
    }
    console.error("Could not update admin event", error);
    return NextResponse.json({ error: "Event update is temporarily unavailable." }, { status: 503 });
  } finally {
    client.release();
  }
}

export const PATCH = PUT;

export async function DELETE(_request: Request, { params }: RouteContext) {
  const denied = await authorizationError();
  if (denied) return denied;

  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  const client = await pool.connect();
  let transactionOpen = false;
  try {
    await client.query("BEGIN");
    transactionOpen = true;
    const deleted = await client.query<{ event_id: string }>(
      "DELETE FROM events WHERE event_id = $1 RETURNING event_id",
      [id],
    );
    if (!deleted.rows[0]) {
      await client.query("ROLLBACK");
      transactionOpen = false;
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    const db = await getMongoDb();
    const metadata = await db.collection("event_details").deleteOne({ event_id: id });
    await client.query("COMMIT");
    transactionOpen = false;
    return NextResponse.json({ deleted: true, metadata_deleted: metadata.deletedCount === 1 });
  } catch (error) {
    if (transactionOpen && client) await client.query("ROLLBACK").catch(() => undefined);
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23503") {
      return NextResponse.json(
        { error: "This event has bookings and cannot be deleted." },
        { status: 409 },
      );
    }
    console.error("Could not delete admin event", error);
    return NextResponse.json({ error: "Event deletion is temporarily unavailable." }, { status: 503 });
  } finally {
    client.release();
  }
}
