import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { AdminEventForm } from "@/components/admin-event-form";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

export const metadata: Metadata = { title: "Add event" };
export const dynamic = "force-dynamic";

type VenueOption = {
  venue_id: string;
  name: string;
  location: string;
  total_capacity: number;
};

export default async function AdminEventsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=%2Fadmin%2Fevents");
  if (session.user.role !== "Admin") redirect("/?access=restricted");

  const { rows: venues } = await pool.query<VenueOption>(
    `SELECT venue_id, name, location, total_capacity
       FROM venues
      ORDER BY name ASC`,
  );

  return <AdminEventForm venues={venues} />;
}