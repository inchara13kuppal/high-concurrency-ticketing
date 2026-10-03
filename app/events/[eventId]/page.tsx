import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, MapPin, Sparkles, Ticket } from "lucide-react";
import { SeatBooking } from "@/components/seat-booking";
import { getEvent } from "@/lib/queries";
import { formatINR } from "@/lib/format";
import { isUuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventId: string }>;
}): Promise<Metadata> {
  const { eventId } = await params;
  if (!isUuid(eventId)) return { title: "Event not found" };
  try {
    const event = await getEvent(eventId);
    return event ? { title: event.title, description: event.description } : { title: "Event not found" };
  } catch {
    return { title: "Event" };
  }
}

export default async function EventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  if (!isUuid(eventId)) notFound();
  let event;
  try {
    event = await getEvent(eventId);
  } catch (error) {
    console.error("Event detail query failed", error);
    throw error;
  }
  if (!event) notFound();

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(event.start_time));

  return (
    <main className="mx-auto max-w-[1440px] px-5 pb-20 sm:px-8 sm:pb-28 lg:px-12">
      <Link href="/#events" className="my-7 inline-flex items-center gap-2 text-[11px] font-bold text-ink/55 transition hover:text-ink">
        <ArrowLeft size={14} /> All events
      </Link>
      <section className="grid overflow-hidden rounded-[22px] bg-ink text-white md:grid-cols-[1.05fr_0.95fr]">
        <div className="relative min-h-[300px] bg-[#292925] sm:min-h-[400px]">
          {event.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.image_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-85" />
          ) : (
            <div className="grain absolute inset-0 bg-[radial-gradient(ellipse_at_75%_25%,#708238,transparent_36%),linear-gradient(145deg,#272821,#171719)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
          <span className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full bg-paper px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-ink">
            <Sparkles size={12} /> Live event
          </span>
        </div>
        <div className="flex flex-col justify-between p-6 sm:p-9 lg:p-12">
          <div>
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-lime">Make a night of it</p>
            <h1 className="text-[clamp(2.5rem,6vw,5.5rem)] font-black leading-[0.89] tracking-[-0.08em]">{event.title}</h1>
            <div className="mt-7 space-y-3 text-[12px] font-semibold text-white/70">
              <p className="flex items-center gap-2"><CalendarDays size={15} className="text-lime" /> {formattedDate}</p>
              <p className="flex items-center gap-2"><MapPin size={15} className="text-lime" /> {event.venue_name} · {event.location}</p>
              <p className="flex items-center gap-2"><Ticket size={15} className="text-lime" /> From {formatINR(event.base_price)} · {event.available_seats} seats available</p>
            </div>
          </div>
          {event.tags?.length ? (
            <div className="mt-8 flex flex-wrap gap-2">
              {event.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-white/20 px-3 py-1.5 text-[10px] font-bold text-white/65">{tag}</span>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-7">
          <section className="rounded-[22px] border border-black/10 bg-white p-6 sm:p-8">
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-ink/40">About the event</p>
            <h2 className="text-[24px] font-black tracking-[-0.06em]">The details.</h2>
            <p className="mt-4 text-[13px] leading-7 text-ink/65">
              {event.description || `${event.title} is coming to ${event.venue_name}. Make plans, pick your seat, and be there when it happens.`}
            </p>
            {(event.director || event.lead_artists?.length || event.music_director) && (
              <div className="mt-6 rounded-2xl bg-[#f4f3ef] p-4 sm:p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-ink/40">Film credits</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  {event.director && (
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-ink/40">Director</p>
                      <p className="mt-1 text-[12px] font-bold">{event.director}</p>
                    </div>
                  )}
                  {event.lead_artists?.length ? (
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-ink/40">Lead artists</p>
                      <p className="mt-1 text-[12px] font-bold">{event.lead_artists.join(" · ")}</p>
                    </div>
                  ) : null}
                  {event.music_director && (
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-ink/40">Music director</p>
                      <p className="mt-1 text-[12px] font-bold">{event.music_director}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
          {event.faqs?.length ? (
            <section className="rounded-[22px] border border-black/10 bg-white p-6 sm:p-8">
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-ink/40">Before you go</p>
              <h2 className="text-[24px] font-black tracking-[-0.06em]">Good to know.</h2>
              <div className="mt-5 divide-y divide-black/10">
                {event.faqs.map((faq, index) => (
                  <details key={`${faq.question}-${index}`} className="group py-4" open={index === 0}>
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[12px] font-bold">
                      {faq.question}
                      <span className="text-lg font-normal text-ink/40 transition group-open:rotate-45">+</span>
                    </summary>
                    <p className="mt-3 pr-6 text-[12px] leading-6 text-ink/55">{faq.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          ) : null}
        </div>
        <SeatBooking event={event} />
      </div>
    </main>
  );
}