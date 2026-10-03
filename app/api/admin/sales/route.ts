import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (session.user.role !== "Admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  try {
    const { rows } = await pool.query(
      `SELECT event_id, event_title, venue_name, location, start_time, tickets_sold, total_revenue
         FROM event_sales_summary_view
        ORDER BY start_time DESC`,
    );
    return NextResponse.json({ sales: rows });
  } catch (error) {
    console.error("Could not load sales summary", error);
    return NextResponse.json({ error: "Sales summary is temporarily unavailable." }, { status: 503 });
  }
}