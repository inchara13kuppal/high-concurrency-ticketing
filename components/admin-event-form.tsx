"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Check, ImagePlus, LoaderCircle, Plus } from "lucide-react";

type VenueOption = {
  venue_id: string;
  name: string;
  location: string;
  total_capacity: number;
};

type EventFormState = {
  title: string;
  venue_id: string;
  start_time: string;
  base_price: string;
  total_capacity: string;
  images: string;
  director: string;
  lead_artists: string;
};

const emptyForm: EventFormState = {
  title: "",
  venue_id: "",
  start_time: "",
  base_price: "",
  total_capacity: "",
  images: "",
  director: "",
  lead_artists: "",
};

export function AdminEventForm({ venues }: { venues: VenueOption[] }) {
  const [form, setForm] = useState<EventFormState>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [loadingEvent, setLoadingEvent] = useState(false);
  const [editId, setEditId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const selectedVenue = venues.find((venue) => venue.venue_id === form.venue_id);

  useEffect(() => {
    const eventId = new URLSearchParams(window.location.search).get("edit");
    if (!eventId) return;

    setEditId(eventId);
    setLoadingEvent(true);
    void (async () => {
      try {
        const response = await fetch(`/api/admin/events/${encodeURIComponent(eventId)}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load this event.");
        const event = data.event;
        if (!event) throw new Error("Could not load this event.");

        const startTime = new Date(event.start_time);
        const localStartTime = new Date(startTime.getTime() - startTime.getTimezoneOffset() * 60_000)
          .toISOString()
          .slice(0, 16);
        setForm({
          title: event.title ?? "",
          venue_id: event.venue_id ?? "",
          start_time: localStartTime,
          base_price: String(event.base_price ?? ""),
          total_capacity: String(event.total_capacity ?? ""),
          images: Array.isArray(event.images) ? event.images.join("\n") : event.image_url ?? "",
          director: event.director ?? "",
          lead_artists: Array.isArray(event.lead_artists) ? event.lead_artists.join(", ") : "",
        });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load this event.");
      } finally {
        setLoadingEvent(false);
      }
    })();
  }, []);

  function update(field: keyof EventFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
    setSuccess("");
  }

  function selectVenue(venueId: string) {
    const venue = venues.find((option) => option.venue_id === venueId);
    setForm((current) => ({
      ...current,
      venue_id: venueId,
      total_capacity: venue ? String(venue.total_capacity) : "",
    }));
    setError("");
    setSuccess("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!selectedVenue) {
      setError("Choose a venue before adding this event.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(
        editId ? `/api/admin/events/${encodeURIComponent(editId)}` : "/api/admin/events",
        {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          venue_id: form.venue_id,
          start_time: new Date(form.start_time).toISOString(),
          base_price: form.base_price,
          total_capacity: Number(form.total_capacity),
          images: form.images.split("\n").map((image) => image.trim()).filter(Boolean),
          director: form.director.trim(),
          lead_artists: form.lead_artists.split(/[,\n]/).map((artist) => artist.trim()).filter(Boolean),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create the event.");
      if (editId) {
        setSuccess("Event updated.");
      } else {
        setSuccess("Event created. Its ticket inventory is ready.");
        setForm((current) => ({
          ...emptyForm,
          venue_id: current.venue_id,
          total_capacity: current.total_capacity,
        }));
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not create the event.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto min-h-[calc(100vh-74px)] max-w-[1100px] px-5 py-8 sm:px-8 sm:py-12 lg:py-16">
      <Link href="/admin" className="inline-flex items-center gap-2 text-[11px] font-bold text-ink/50 hover:text-ink">
        <ArrowLeft size={14} /> Sales dashboard
      </Link>
      <div className="mt-8">
        <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-ink/45">Seatline / Admin</p>
        <h1 className="text-[clamp(2.7rem,6vw,5rem)] font-black leading-[0.88] tracking-[-0.08em]">{editId ? "Edit event." : "Add an event."}</h1>
        <p className="mt-4 max-w-[620px] text-sm leading-6 text-ink/55">
          Event title, venue, schedule, price, and capacity are stored in PostgreSQL. Images and film credits are stored in MongoDB.
        </p>
      </div>

      {loadingEvent && <p role="status" className="mt-6 text-sm font-semibold text-ink/55">Loading event details…</p>}
      <form onSubmit={(event) => void submit(event)} className="mt-8 grid gap-5 rounded-[20px] border border-black/10 bg-white p-5 sm:grid-cols-2 sm:p-8">
        <label className="space-y-2 text-[11px] font-bold text-ink/65 sm:col-span-2">
          Event title
          <input
            required
            maxLength={220}
            value={form.title}
            onChange={(event) => update("title", event.target.value)}
            className="h-12 w-full rounded-xl border border-black/15 bg-white px-4 text-sm font-semibold text-ink outline-none focus:border-ink"
            placeholder="Film screening or live event"
          />
        </label>

        <label className="space-y-2 text-[11px] font-bold text-ink/65">
          Venue
          <select
            required
            value={form.venue_id}
            onChange={(event) => selectVenue(event.target.value)}
            disabled={!venues.length}
            className="h-12 w-full rounded-xl border border-black/15 bg-white px-4 text-sm font-semibold text-ink outline-none focus:border-ink disabled:bg-black/5"
          >
            <option value="">{venues.length ? "Select a venue" : "No venues available"}</option>
            {venues.map((venue) => (
              <option key={venue.venue_id} value={venue.venue_id}>
                {venue.name} · {venue.location}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-[11px] font-bold text-ink/65">
          Total capacity
          <input
            type="number"
            required
            min="1"
            max="100000"
            step="1"
            value={form.total_capacity}
            onChange={(event) => update("total_capacity", event.target.value)}
            className="h-12 w-full rounded-xl border border-black/15 bg-white px-4 text-sm font-semibold text-ink outline-none focus:border-ink"
            placeholder="Choose a venue"
          />
          <span className="block text-[10px] font-medium text-ink/40">Prefilled from the venue; editable for this event.</span>
        </label>

        <label className="space-y-2 text-[11px] font-bold text-ink/65">
          Start time
          <input
            type="datetime-local"
            required
            value={form.start_time}
            onChange={(event) => update("start_time", event.target.value)}
            className="h-12 w-full rounded-xl border border-black/15 bg-white px-4 text-sm font-semibold text-ink outline-none focus:border-ink"
          />
        </label>

        <label className="space-y-2 text-[11px] font-bold text-ink/65">
          Ticket price (INR)
          <input
            type="number"
            required
            min="0"
            max="99999999.99"
            step="0.01"
            value={form.base_price}
            onChange={(event) => update("base_price", event.target.value)}
            className="h-12 w-full rounded-xl border border-black/15 bg-white px-4 text-sm font-semibold text-ink outline-none focus:border-ink"
            placeholder="699.00"
          />
        </label>

        <label className="space-y-2 text-[11px] font-bold text-ink/65 sm:col-span-2">
          Images
          <span className="flex items-center gap-1.5 text-[10px] font-medium text-ink/40"><ImagePlus size={12} /> Add one image URL per line.</span>
          <textarea
            rows={3}
            value={form.images}
            onChange={(event) => update("images", event.target.value)}
            className="w-full resize-y rounded-xl border border-black/15 bg-white px-4 py-3 text-sm font-medium text-ink outline-none focus:border-ink"
            placeholder="https://example.com/event-poster.jpg"
          />
        </label>

        <label className="space-y-2 text-[11px] font-bold text-ink/65">
          Director
          <input
            maxLength={180}
            value={form.director}
            onChange={(event) => update("director", event.target.value)}
            className="h-12 w-full rounded-xl border border-black/15 bg-white px-4 text-sm font-semibold text-ink outline-none focus:border-ink"
            placeholder="Director name"
          />
        </label>

        <label className="space-y-2 text-[11px] font-bold text-ink/65">
          Lead artists
          <input
            value={form.lead_artists}
            onChange={(event) => update("lead_artists", event.target.value)}
            className="h-12 w-full rounded-xl border border-black/15 bg-white px-4 text-sm font-semibold text-ink outline-none focus:border-ink"
            placeholder="Artist one, Artist two"
          />
        </label>

        {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[12px] font-semibold text-red-700 sm:col-span-2">{error}</p>}
        {success && <p role="status" className="flex items-center gap-2 rounded-xl bg-lime/25 px-4 py-3 text-[12px] font-semibold text-ink sm:col-span-2"><Check size={15} /> {success} <Link href="/admin" className="ml-auto underline">View dashboard</Link></p>}

        <div className="flex flex-col gap-3 border-t border-black/10 pt-5 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] leading-5 text-ink/40">The selected venue&apos;s capacity is used to initialize this event&apos;s available seats.</p>
          <button
            type="submit"
            disabled={busy || loadingEvent || !venues.length}
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-ink px-6 text-[12px] font-black text-white transition hover:bg-black/75 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? <LoaderCircle size={15} className="animate-spin" /> : <Plus size={15} />}
            {busy ? (editId ? "Saving changes…" : "Creating event…") : (editId ? "Save changes" : "Create event")}
          </button>
        </div>
      </form>
    </main>
  );
}