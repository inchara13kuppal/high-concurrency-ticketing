import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

export const runtime = "nodejs";

function csvField(value: unknown) {
  let text = value instanceof Date ? value.toISOString() : String(value ?? "");
  if (/^[\s]*[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (session.user.role !== "Admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  try {
    const { rows } = await pool.query(
      `SELECT event_title, venue_name, location, start_time, tickets_sold, total_revenue
         FROM event_sales_summary_view
        ORDER BY start_time DESC`,
    );
    const header = ["Event", "Venue", "Location", "Start time", "Tickets sold", "Total revenue (INR)"];
    const csv = [
      header.map(csvField).join(","),
      ...rows.map((row) =>
        [
          row.event_title,
          row.venue_name,
          row.location,
          row.start_time,
          row.tickets_sold,
          row.total_revenue,
        ].map(csvField).join(","),
      ),
    ].join("\r\n");

    return new NextResponse(`\uFEFF${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="seatline-event-sales.csv"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Could not export sales summary", error);
    return NextResponse.json({ error: "Sales export is temporarily unavailable." }, { status: 503 });
  }
}