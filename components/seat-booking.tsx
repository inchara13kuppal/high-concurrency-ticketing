"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Check, Clock3, LockKeyhole, RotateCw, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatINR } from "@/lib/format";
import type { EventRecord } from "@/lib/queries";

type SeatSnapshot = {
  capacity: number;
  soldSeats: string[];
  lockedSeats: { seatNumber: string; ownedByYou: boolean }[];
};

export function SeatBooking({ event, isUnderage }: { event: EventRecord; isUnderage: boolean }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<SeatSnapshot | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [lockExpiresAt, setLockExpiresAt] = useState<number | null>(null);

  const refreshSeats = useCallback(async () => {
    try {
      const response = await fetch(`/api/events/${event.event_id}/seats`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not refresh seats.");
      setSnapshot(data);
      setNotice("");
      setLoading(false);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not refresh seats.");
      setLoading(false);
    }
  }, [event.event_id]);

  useEffect(() => {
    void refreshSeats();
    const interval = window.setInterval(() => void refreshSeats(), 5000);
    return () => window.clearInterval(interval);
  }, [refreshSeats]);

  useEffect(() => {
    if (!lockExpiresAt || !selectedSeats.length) return;
    const timeout = window.setTimeout(() => {
      setSelectedSeats([]);
      setLockExpiresAt(null);
      setNotice("Your five-minute hold expired. Select the seat again to continue.");
      void refreshSeats();
    }, Math.max(0, lockExpiresAt - Date.now()));
    return () => window.clearTimeout(timeout);
  }, [lockExpiresAt, selectedSeats, refreshSeats]);

  const sold = useMemo(() => new Set(snapshot?.soldSeats ?? []), [snapshot]);
  const selectedSeatSet = useMemo(() => new Set(selectedSeats), [selectedSeats]);
  const locks = useMemo(
    () => new Map((snapshot?.lockedSeats ?? []).map((seat) => [seat.seatNumber, seat.ownedByYou])),
    [snapshot],
  );
  const seatCount = snapshot?.capacity ?? event.total_capacity;
  const ticketPrice = Number(event.base_price);
  const totalPrice = ticketPrice * selectedSeats.length;

  async function release(seatNumbers: string[]) {
    const response = await fetch("/api/seats/release", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: event.event_id, seatNumbers }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not release those seats.");
  }

  async function chooseSeat(seatNumber: string) {
    if (isUnderage) {
      alert("Access Denied: You must be 18 or older to book tickets.");
      return;
    }

    setNotice("");
    if (sold.has(seatNumber)) return;

    if (selectedSeatSet.has(seatNumber)) {
      setBusy(true);
      try {
        await release([seatNumber]);
        const remaining = selectedSeats.filter((seat) => seat !== seatNumber);
        setSelectedSeats(remaining);
        if (!remaining.length) setLockExpiresAt(null);
        void refreshSeats();
      } catch (error) {
        showBookingError(error instanceof Error ? error.message : "Could not release that seat.");
      } finally {
        setBusy(false);
      }
      return;
    }
    if (locks.has(seatNumber) && !locks.get(seatNumber)) return;
    if (!session?.user?.id) {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    setBusy(true);
    try {
      const nextSeats = [...selectedSeats, seatNumber].sort((left, right) => Number(left) - Number(right));
      const response = await fetch("/api/seats/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.event_id, seatNumbers: nextSeats }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "That seat could not be held.");
      setSelectedSeats(data.seatNumbers);
      setLockExpiresAt(Date.now() + data.expiresIn * 1000);
      await refreshSeats();
    } catch (error) {
      showBookingError(error instanceof Error ? error.message : "That seat could not be held.");
      void refreshSeats();
    } finally {
      setBusy(false);
    }
  }

  async function simulatePayment(paymentResult: "SUCCESS" | "FAILURE") {
    if (!selectedSeats.length) return;
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.event_id, seatNumbers: selectedSeats, paymentResult }),
      });
      const data = await response.json();
      setModalOpen(false);
      setSelectedSeats([]);
      setLockExpiresAt(null);
      if (!response.ok) {
        if (paymentResult === "FAILURE" && response.status === 402) {
          setNotice(data.message || "Payment was not completed. Your seats have been released.");
        } else {
          showBookingError(data.error || "Checkout could not be completed.");
        }
      } else {
        const bookingIds = Array.isArray(data.bookingIds) ? data.bookingIds.join("~") : "";
        if (!bookingIds) throw new Error("Your tickets were confirmed, but the confirmation page could not be opened.");
        router.push(`/ticket/${event.event_id}/${bookingIds}`);
      }
      await refreshSeats();
    } catch (error) {
      setModalOpen(false);
      showBookingError(error instanceof Error ? error.message : "Checkout could not be completed.");
      await refreshSeats();
    } finally {
      setBusy(false);
    }
  }

  function showBookingError(message: string) {
    if (message === "You must be 18 or older to book tickets.") {
      alert("Access Denied: You must be 18 or older to book tickets.");
      return;
    }
    setNotice(message);
  }

  return (
    <section id="choose-seats" className="rounded-[22px] border border-black/10 bg-white p-5 sm:p-7">
      <div className="flex flex-col justify-between gap-4 border-b border-black/10 pb-5 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-ink/45">Choose your spot</p>
          <h2 className="text-2xl font-black tracking-[-0.06em] sm:text-[30px]">Pick a seat.</h2>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-semibold text-ink/55">
          <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-full border border-black/30" /> Available</span>
          <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-full bg-lime" /> Your seat</span>
          <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-full bg-[#d8d8d8]" /> Held</span>
          <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-full bg-ink" /> Sold</span>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-[620px]">
        <div className="mb-10 text-center">
          <div className="mx-auto h-2 max-w-[420px] rounded-[50%] bg-gradient-to-r from-transparent via-ink/25 to-transparent shadow-[0_12px_18px_-14px_rgba(16,16,20,0.7)]" />
          <span className="mt-3 block text-[9px] font-black uppercase tracking-[0.3em] text-ink/35">Stage</span>
        </div>
        {loading ? (
          <div className="grid grid-cols-10 gap-2 sm:gap-3" aria-label="Loading available seats">
            {Array.from({ length: Math.min(seatCount, 60) }, (_, index) => (
              <span key={index} className="aspect-square animate-pulse rounded-full bg-black/5" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-8 gap-2 sm:grid-cols-10 sm:gap-3">
            {Array.from({ length: seatCount }, (_, index) => {
              const seatNumber = String(index + 1).padStart(3, "0");
              const isSold = sold.has(seatNumber);
              const heldByOther = locks.has(seatNumber) && !locks.get(seatNumber);
              const isSelected = selectedSeatSet.has(seatNumber);
              const isOwnedLock = locks.get(seatNumber) === true;
              const disabled = isSold || heldByOther || busy;
              return (
                <button
                  key={seatNumber}
                  type="button"
                  onClick={() => void chooseSeat(seatNumber)}
                  disabled={disabled}
                  aria-label={`Seat ${seatNumber}${isSold ? ", sold" : heldByOther ? ", held by another guest" : isSelected || isOwnedLock ? ", held by you" : ", available"}`}
                  aria-pressed={isSelected}
                  className={[
                    "aspect-square rounded-full text-[9px] font-bold transition sm:text-[10px]",
                    isSold ? "cursor-not-allowed bg-ink text-white/65" :
                    isSelected || isOwnedLock ? "bg-lime text-ink shadow-[0_0_0_3px_rgba(216,255,72,0.28)]" :
                    heldByOther ? "cursor-not-allowed bg-[#dededb] text-ink/25" :
                    "border border-black/20 bg-white text-ink/65 hover:border-ink hover:bg-ink hover:text-white",
                  ].join(" ")}
                >
                  {seatNumber}
                </button>
              );
            })}
          </div>
        )}
        <div className="mt-5 flex items-center justify-between text-[10px] font-semibold text-ink/40">
          <span>Front of venue</span>
          <button onClick={() => void refreshSeats()} className="inline-flex items-center gap-1.5 hover:text-ink" aria-label="Refresh seat availability">
            <RotateCw size={12} /> Live availability
          </button>
        </div>
      </div>

      {notice && (
        <div
          role="alert"
          className="mt-6 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-[12px] font-semibold text-red-700"
        >
          <X size={15} className="mt-0.5 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      <div className="mt-7 flex flex-col gap-4 border-t border-black/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink/40">Ticket price</p>
          <p className="mt-1 text-lg font-black">{formatINR(ticketPrice)} <span className="text-[11px] font-medium text-ink/45">per seat</span></p>
          {selectedSeats.length > 0 && (
            <p className="mt-1 text-[11px] font-semibold text-ink/55">
              {selectedSeats.length} {selectedSeats.length === 1 ? "seat" : "seats"} · {formatINR(totalPrice)} total
            </p>
          )}
        </div>
        {selectedSeats.length > 0 ? (
          <button
            onClick={() => setModalOpen(true)}
            disabled={busy}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ink px-6 text-[12px] font-black text-white transition hover:bg-black/75 disabled:opacity-50"
          >
            Continue with {selectedSeats.length} {selectedSeats.length === 1 ? "seat" : "seats"} <ArrowRightIcon />
          </button>
        ) : (
          <p className="text-[11px] font-medium text-ink/45">
            {session ? "Select an available seat to continue." : "Sign in is required to hold a seat."}
          </p>
        )}
      </div>

      {modalOpen && selectedSeats.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/65 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) setModalOpen(false);
          }}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="checkout-heading" className="w-full max-w-[460px] rounded-[22px] bg-paper p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-ink/40">Checkout · Test mode</p>
                <h2 id="checkout-heading" className="text-[28px] font-black leading-none tracking-[-0.07em]">Make it official.</h2>
              </div>
              <button aria-label="Close checkout" disabled={busy} onClick={() => setModalOpen(false)} className="rounded-full border border-black/15 p-2 transition hover:bg-black/5 disabled:opacity-50">
                <X size={16} />
              </button>
            </div>
            <div className="mt-6 rounded-2xl border border-black/10 bg-white p-4">
              <p className="truncate text-[13px] font-bold">{event.title}</p>
              <div className="mt-3 flex items-center justify-between text-[11px] text-ink/55">
                <span className="max-w-[65%]">Seats {selectedSeats.join(", ")} <span className="mx-1">·</span> {selectedSeats.length} {selectedSeats.length === 1 ? "ticket" : "tickets"}</span>
                <span className="font-black text-ink">{formatINR(totalPrice)}</span>
              </div>
            </div>
            <p className="mt-5 flex items-center gap-2 text-[11px] font-semibold text-ink/55">
              <Clock3 size={14} /> Your seat is held for five minutes while you check out.
            </p>
            <div className="mt-6 space-y-3">
              <button
                onClick={() => void simulatePayment("SUCCESS")}
                disabled={busy}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-lime text-[12px] font-black transition hover:bg-[#c9ed36] disabled:opacity-50"
              >
                <Check size={15} /> Simulate Payment: SUCCESS
              </button>
              <button
                onClick={() => void simulatePayment("FAILURE")}
                disabled={busy}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-black/15 bg-white text-[12px] font-black transition hover:border-red-300 hover:text-red-700 disabled:opacity-50"
              >
                <LockKeyhole size={14} /> Simulate Payment: FAILURE
              </button>
            </div>
            <p className="mt-4 text-center text-[10px] leading-5 text-ink/40">
              This is a test checkout. No payment details are collected or charged.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function ArrowRightIcon() {
  return <span aria-hidden="true" className="text-base leading-none">→</span>;
}