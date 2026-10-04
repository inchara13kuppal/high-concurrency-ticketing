import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import type { EventRecord } from "@/lib/queries";
import { formatINR } from "@/lib/format";

function formatDate(dateValue: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    weekday: "short",
  }).format(new Date(dateValue));
}

export function EventCard({ event, index = 0 }: { event: EventRecord; index?: number }) {
  return (
    <Link
      href={`/events/${event.event_id}`}
      className="group rise-in flex flex-col"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="relative aspect-[1.12/1] overflow-hidden rounded-[18px] bg-[#d9d7d0]">
        {event.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.image_url}
            alt=""
            className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="grain grid h-full place-items-center bg-gradient-to-br from-lime/80 via-[#b0b1a2] to-ink/70">
            <span className="text-6xl font-black tracking-tighter text-white/80">
              {event.title.slice(0, 1)}
            </span>
          </div>
        )}
        <span suppressHydrationWarning={true} className="absolute left-3 top-3 rounded-full bg-paper px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.11em]">
          {formatDate(event.start_time)}
        </span>
        <span className="absolute bottom-3 right-3 grid h-10 w-10 translate-y-2 place-items-center rounded-full bg-lime opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <ArrowUpRight size={18} />
        </span>
      </div>
      <div className="flex items-start justify-between gap-3 pt-4">
        <div className="min-w-0">
          <h3 className="truncate text-[18px] font-extrabold tracking-[-0.65px] sm:text-[20px]">{event.title}</h3>
          <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-ink/55">
            <MapPin size={13} className="shrink-0" />
            <span className="truncate">{event.venue_name} · {event.location}</span>
          </div>
        </div>
        <p suppressHydrationWarning={true} className="shrink-0 pt-0.5 text-[12px] font-bold text-ink/80">
          {formatINR(event.base_price)}<span className="font-medium text-ink/45">+</span>
        </p>
      </div>
      {event.tags?.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {event.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="rounded-full border border-black/10 px-2.5 py-1 text-[10px] font-semibold text-ink/55">
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </Link>
  );
}