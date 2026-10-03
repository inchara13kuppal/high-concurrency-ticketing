import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getMongoDb } from "@/lib/mongodb";
import { isUuid } from "@/lib/validation";
import { pool } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  if (!isUuid(eventId)) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  try {
    const db = await getMongoDb();
    const reviews = await db.collection("reviews")
      .find({ event_id: eventId }, { projection: { _id: 0, user_id: 0 } })
      .sort({ created_at: -1 })
      .limit(50)
      .toArray();
    return NextResponse.json({ reviews });
  } catch (error) {
    console.error("Could not load reviews", error);
    return NextResponse.json({ error: "Reviews are temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to leave a review." }, { status: 401 });

  const { eventId } = await params;
  if (!isUuid(eventId)) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  let body: { rating?: unknown; comment?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter a rating and comment." }, { status: 400 });
  }
  const rating = Number(body.rating);
  const comment = typeof body.comment === "string" ? body.comment.trim() : "";
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Choose a rating from 1 to 5." }, { status: 400 });
  }
  if (comment.length < 8 || comment.length > 1000) {
    return NextResponse.json({ error: "Review comments must be 8 to 1,000 characters." }, { status: 400 });
  }

  try {
    const eventExists = await pool.query("SELECT 1 FROM events WHERE event_id = $1", [eventId]);
    if (!eventExists.rowCount) return NextResponse.json({ error: "Event not found." }, { status: 404 });
    const db = await getMongoDb();
    const review = {
      event_id: eventId,
      user_id: session.user.id,
      user_name: session.user.name || "Seatline guest",
      rating,
      comment,
      created_at: new Date(),
    };
    await db.collection("reviews").insertOne(review);
    const { user_id: _userId, ...publicReview } = review;
    return NextResponse.json({ review: publicReview }, { status: 201 });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      return NextResponse.json({ error: "You have already reviewed this event." }, { status: 409 });
    }
    console.error("Could not save review", error);
    return NextResponse.json({ error: "Your review could not be saved right now." }, { status: 503 });
  }
}