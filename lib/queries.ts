import { pool } from "@/lib/db";
import { getMongoDb } from "@/lib/mongodb";

export type EventRecord = {
  event_id: string;
  venue_id: string;
  title: string;
  start_time: string;
  base_price: string;
  available_seats: number;
  total_capacity: number;
  venue_name: string;
  location: string;
  image_url?: string;
  description?: string;
  tags?: string[];
  cast?: string[];
  faqs?: { question: string; answer: string }[];
};

export async function getUpcomingEvents() {
  const { rows } = await pool.query<EventRecord>(
    `SELECT e.event_id, e.venue_id, e.title, e.start_time, e.base_price,
            e.available_seats, v.total_capacity, v.name AS venue_name, v.location
       FROM events e
       JOIN venues v ON v.venue_id = e.venue_id
      WHERE e.start_time > NOW()
      ORDER BY e.start_time ASC`,
  );
  const db = await getMongoDb();
  const details = await db
    .collection("event_details")
    .find({ event_id: { $in: rows.map((event) => event.event_id) } })
    .project({ _id: 0 })
    .toArray();
  const byEventId = new Map(details.map((item) => [String(item.event_id), item]));

  return rows.map((event) => ({
    ...event,
    ...byEventId.get(event.event_id),
    event_id: event.event_id,
  })) as EventRecord[];
}

export async function getEvent(eventId: string) {
  const { rows } = await pool.query<EventRecord>(
    `SELECT e.event_id, e.venue_id, e.title, e.start_time, e.base_price,
            e.available_seats, v.total_capacity, v.name AS venue_name, v.location
       FROM events e
       JOIN venues v ON v.venue_id = e.venue_id
      WHERE e.event_id = $1 AND e.start_time > NOW()`,
    [eventId],
  );
  if (!rows[0]) return null;
  const db = await getMongoDb();
  const details = await db
    .collection("event_details")
    .findOne({ event_id: eventId }, { projection: { _id: 0 } });
  return { ...rows[0], ...details, event_id: rows[0].event_id } as EventRecord;
}