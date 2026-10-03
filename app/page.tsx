import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, CalendarDays, MoveRight, Sparkles } from "lucide-react";
import { EventCard } from "@/components/event-card";
import { getUpcomingEvents, type EventRecord } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let events: EventRecord[] = [];
  let loadError = false;
  try {
    events = await getUpcomingEvents();
  } catch (error) {
    console.error("Homepage event query failed", error);
    loadError = true;
  }

  const featured = events[0];
  const remaining = events.slice(1);

  return (
    <main>
      <section className="mx-auto max-w-[1440px] px-5 pb-10 pt-7 sm:px-8 sm:pt-10 lg:px-12">
        <div className="relative min-h-[520px] overflow-hidden rounded-[24px] bg-[#171719] text-white sm:min-h-[590px] lg:min-h-[650px]">
          {featured?.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={featured.image_url}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-55"
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_20%,#657332_0%,transparent_38%),radial-gradient(ellipse_at_100%_100%,#7b462c_0%,transparent_38%),linear-gradient(125deg,#111114_25%,#272821_100%)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-black/5" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/5" />
          <div className="relative flex min-h-[520px] flex-col justify-between p-7 sm:min-h-[590px] sm:p-12 lg:min-h-[650px] lg:p-16">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/70 sm:text-xs">
                <Sparkles size={14} className="text-lime" /> Your next night out starts here
              </p>
              <span className="hidden rounded-full border border-white/30 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/75 sm:inline-flex">
                Live, your way
              </span>
            </div>
            <div className="max-w-[780px] pb-4 sm:pb-8">
              <p className="mb-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-lime sm:text-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-lime" /> Tickets for the moments that matter
              </p>
              <h1 className="max-w-[760px] text-[clamp(3.5rem,9vw,8rem)] font-black leading-[0.84] tracking-[-0.085em]">
                Go where<br className="hidden sm:block" /> the night <span className="text-lime">goes.</span>
              </h1>
              <p className="mt-7 max-w-[430px] text-[15px] leading-7 text-white/75 sm:text-[17px]">
                Find the show you&apos;ll talk about all week. Your seat is waiting.
              </p>
              <Link
                href="#events"
                className="mt-8 inline-flex items-center gap-3 rounded-full bg-lime px-6 py-4 text-[12px] font-black text-ink transition hover:bg-white"
              >
                Find your next event <ArrowUpRight size={16} />
              </Link>
            </div>
            <div className="flex items-end justify-between border-t border-white/25 pt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-white/60 sm:text-[11px]">
              <span>Good nights, better seats</span>
              <span className="flex items-center gap-2"><ArrowDownRight size={15} /> Scroll to explore</span>
            </div>
          </div>
        </div>
      </section>

      <section id="events" className="mx-auto max-w-[1440px] scroll-mt-24 px-5 pb-24 pt-16 sm:px-8 sm:pt-20 lg:px-12 lg:pb-32">
        <div className="mb-9 flex flex-col justify-between gap-5 sm:mb-12 sm:flex-row sm:items-end">
          <div>
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-ink/45">On the calendar</p>
            <h2 className="text-[clamp(2.5rem,5vw,4.5rem)] font-black leading-[0.9] tracking-[-0.075em]">
              Good things<br className="sm:hidden" /> are happening.
            </h2>
          </div>
          <p className="max-w-[260px] text-[13px] leading-6 text-ink/55">
            The room, the crowd, the first note. Find the one that feels like yours.
          </p>
        </div>

        {loadError ? (
          <div className="rounded-2xl border border-red-900/10 bg-white p-8 text-sm text-ink/65">
            Events couldn&apos;t be loaded. Check the database and MongoDB connections, then refresh this page.
          </div>
        ) : events.length ? (
          <>
            {featured && (
              <Link
                href={`/events/${featured.event_id}`}
                className="group mb-7 grid overflow-hidden rounded-[20px] border border-black/10 bg-white sm:grid-cols-[1.15fr_0.85fr]"
              >
                <div className="relative min-h-[260px] bg-[#c8c7be] sm:min-h-[340px]">
                  {featured.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={featured.image_url} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]" />
                  ) : <div className="grain absolute inset-0 bg-gradient-to-br from-lime/70 to-ink/70" />}
                  <span className="absolute left-5 top-5 rounded-full bg-lime px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em]">Next up</span>
                </div>
                <div className="flex flex-col justify-between p-6 sm:p-9 lg:p-12">
                  <div>
                    <div className="mb-5 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-ink/45">
                      <CalendarDays size={13} /> {new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date(featured.start_time))}
                    </div>
                    <h3 className="max-w-[430px] text-[clamp(2rem,4vw,3.5rem)] font-black leading-[0.95] tracking-[-0.07em]">{featured.title}</h3>
                    <p className="mt-4 text-[13px] text-ink/55">{featured.venue_name} · {featured.location}</p>
                    {featured.description && <p className="mt-5 max-w-[440px] text-[13px] leading-6 text-ink/60">{featured.description}</p>}
                  </div>
                  <div className="mt-8 flex items-center justify-between border-t border-black/10 pt-5">
                    <span className="text-[12px] font-semibold text-ink/60">From <strong className="text-ink">${Number(featured.base_price).toFixed(2)}</strong></span>
                    <span className="inline-flex items-center gap-2 text-[12px] font-black">Pick your seat <MoveRight size={16} className="transition group-hover:translate-x-1" /></span>
                  </div>
                </div>
              </Link>
            )}
            {remaining.length > 0 && (
              <div className="grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
                {remaining.map((event, index) => <EventCard key={event.event_id} event={event} index={index} />)}
              </div>
            )}
            {events.length === 1 && (
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-2xl border border-black/10 bg-white/70 p-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-ink/40">01 / Find your thing</p>
                  <p className="mt-3 text-sm font-bold">The lineup is just getting started.</p>
                </div>
                <div className="rounded-2xl border border-black/10 bg-white/70 p-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-ink/40">02 / Choose a seat</p>
                  <p className="mt-3 text-sm font-bold">A live seat map keeps your pick yours.</p>
                </div>
                <div className="rounded-2xl border border-black/10 bg-white/70 p-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-ink/40">03 / Make a night of it</p>
                  <p className="mt-3 text-sm font-bold">Your ticket is ready as soon as you are.</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-[20px] border border-black/10 bg-white px-6 py-16 text-center">
            <p className="text-lg font-bold">Nothing on the calendar just yet.</p>
            <p className="mt-2 text-sm text-ink/55">Check back soon for new events.</p>
          </div>
        )}
      </section>

      <section id="how-it-works" className="bg-ink text-white">
        <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.8fr_1.2fr] lg:px-12 lg:py-24">
          <div>
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-lime">The easy part</p>
            <h2 className="max-w-[440px] text-[clamp(2.6rem,5vw,4.5rem)] font-black leading-[0.88] tracking-[-0.075em]">
              From “maybe”<br />to “see you there.”
            </h2>
          </div>
          <div className="grid gap-8 border-t border-white/20 pt-6 sm:grid-cols-3 lg:border-t-0 lg:pt-2">
            {[
              ["01", "Find your event", "Concerts, pop-ups, and nights worth staying out for."],
              ["02", "Choose your seat", "See live availability and hold a seat while you check out."],
              ["03", "Get your ticket", "Confirm your booking and make the plan official."],
            ].map(([number, title, copy]) => (
              <div key={number} className="border-t border-white/20 pt-5">
                <span className="text-[11px] font-bold text-lime">{number}</span>
                <h3 className="mt-7 text-[18px] font-extrabold tracking-[-0.04em]">{title}</h3>
                <p className="mt-2 max-w-[230px] text-[12px] leading-5 text-white/55">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-[1440px] flex-col justify-between gap-3 px-5 py-6 text-[11px] font-semibold text-ink/45 sm:flex-row sm:items-center sm:px-8 lg:px-12">
        <Link href="/" className="font-black tracking-[-0.04em] text-ink">seatline<span className="text-[#8ca82a]">.</span></Link>
        <span>Find your people. Find your place.</span>
        <Link href="#events" className="inline-flex items-center gap-1 text-ink/70 hover:text-ink">Back to events <ArrowUpRight size={12} /></Link>
      </footer>
    </main>
  );
}