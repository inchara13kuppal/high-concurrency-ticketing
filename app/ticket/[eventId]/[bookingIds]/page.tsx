import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarDays, Check, MapPin, Ticket } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { formatINR } from "@/lib/format";
import { isUuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

export default async function TicketConfirmationPage({
  params,
}: {
  params: Promise<{ eventId: string; bookingIds: string }>;
}) {
  const { eventId, bookingIds: bookingIdsParam } = await params;
  if (!isUuid(eventId)) notFound();

  const bookingIds = bookingIdsParam.split("~");
  if (
    bookingIds.length === 0 ||
    bookingIds.some((bookingId) => !isUuid(bookingId)) ||
    new Set(bookingIds).size !== bookingIds.length
  ) {
    notFound();
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/ticket/${eventId}/${bookingIdsParam}`)}`);
  }

  const { rows } = await pool.query<{
    booking_id: string;
    seat_number: string;
    title: string;
    start_time: string;
    base_price: string;
    venue_name: string;
    location: string;
  }>(
    `SELECT b.booking_id, b.seat_number, e.title, e.start_time, e.base_price,
            v.name AS venue_name, v.location
       FROM bookings b
       JOIN events e ON e.event_id = b.event_id
       JOIN venues v ON v.venue_id = e.venue_id
      WHERE b.booking_id = ANY($1::uuid[])
        AND b.event_id = $2
        AND b.user_id = $3
        AND b.status = 'SUCCESS'
      ORDER BY b.seat_number::INTEGER`,
    [bookingIds, eventId, session.user.id],
  );
  if (rows.length !== bookingIds.length) notFound();

  const firstTicket = rows[0];
  const totalAmount = Number(firstTicket.base_price) * rows.length;
  const seats = rows.map((ticket) => ticket.seat_number);
  const formattedDate = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(firstTicket.start_time));

  return (
    <main className="mx-auto min-h-[calc(100vh-74px)] max-w-[900px] px-5 py-12 sm:px-8 sm:py-20">
      <section className="overflow-hidden rounded-[24px] border border-black/10 bg-white shadow-sm">
        <div className="bg-ink px-6 py-8 text-white sm:px-10 sm:py-10">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-lime text-ink"><Check size={22} strokeWidth={3} /></span>
          <p className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-lime">Booking confirmed</p>
          <h1 className="mt-2 text-[clamp(2.5rem,7vw,4rem)] font-black leading-[0.9] tracking-[-0.08em]">You&apos;re going.</h1>
          <p className="mt-3 text-[13px] text-white/65">Your tickets are ready. Keep this page handy for your event details.</p>
        </div>

        <div className="grid gap-8 p-6 sm:grid-cols-[1fr_auto] sm:p-10">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-ink/40">Your event</p>
            <h2 className="mt-2 text-[clamp(1.8rem,5vw,2.8rem)] font-black leading-[0.95] tracking-[-0.07em]">{firstTicket.title}</h2>
            <div className="mt-6 space-y-3 text-[12px] font-semibold text-ink/60">
              <p className="flex items-center gap-2"><CalendarDays size={15} className="text-ink/45" /> {formattedDate}</p>
              <p className="flex items-center gap-2"><MapPin size={15} className="text-ink/45" /> {firstTicket.venue_name} · {firstTicket.location}</p>
            </div>
          </div>

          <div className="min-w-[190px] rounded-2xl bg-[#f4f3ef] p-5">
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-ink/45"><Ticket size={13} /> {rows.length} {rows.length === 1 ? "ticket" : "tickets"}</p>
            <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.12em] text-ink/45">Seats</p>
            <p className="mt-1 text-[18px] font-black">{seats.join(", ")}</p>
            <p className="mt-5 border-t border-black/10 pt-4 text-[10px] font-bold uppercase tracking-[0.12em] text-ink/45">Total paid</p>
            <p className="mt-1 text-[22px] font-black">{formatINR(totalAmount)}</p>
          </div>
        </div>

        <div className="border-t border-black/10 px-6 py-5 sm:px-10">
          <Link href="/" className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-[11px] font-black text-white transition hover:bg-black/75">
            Find another event
          </Link>
        </div>
      </section>
    </main>
  );
}