"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Check, Clock3, LockKeyhole, RotateCw, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { EventRecord } from "@/lib/queries";

type SeatSnapshot = {
  capacity: number;
  soldSeats: string[];
  lockedSeats: { seatNumber: string; ownedByYou: boolean }[];
};

export function SeatBooking({ event }: { event: EventRecord }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<SeatSnapshot | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [confirmation, setConfirmation] = useState("");
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
    if (!lockExpiresAt || !selectedSeat) return;
    const timeout = window.setTimeout(() => {
      setSelectedSeat(null);
      setLockExpiresAt(null);
      setNotice("Your five-minute hold expired. Select the seat again to continue.");
      void refreshSeats();
    }, Math.max(0, lockExpiresAt - Date.now()));
    return () => window.clearTimeout(timeout);
  }, [lockExpiresAt, selectedSeat, refreshSeats]);

  const sold = useMemo(() => new Set(snapshot?.soldSeats ?? []), [snapshot]);
  const locks = useMemo(
    () => new Map((snapshot?.lockedSeats ?? []).map((seat) => [seat.seatNumber, seat.ownedByYou])),
    [snapshot],
  );
  const seatCount = snapshot?.capacity ?? event.total_capacity;
  const ticketPrice = Number(event.base_price);

  async function release(seatNumber: string) {
    await fetch("/api/seats/release", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: event.event_id, seatNumber }),
    });
  }

  async function chooseSeat(seatNumber: string) {
    setNotice("");
    setConfirmation("");
    if (sold.has(seatNumber)) return;

    if (selectedSeat === seatNumber) {
      setBusy(true);
      try {
        await release(seatNumber);
      } finally {
        setSelectedSeat(null);
        setLockExpiresAt(null);
        setBusy(false);
        void refreshSeats();
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
      if (selectedSeat) await release(selectedSeat);
      const response = await fetch("/api/seats/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.event_id, seatNumber }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "That seat could not be held.");
      setSelectedSeat(data.seatNumber);
      setLockExpiresAt(Date.now() + data.expiresIn * 1000);
      await refreshSeats();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "That seat could not be held.");
      setSelectedSeat(null);
      setLockExpiresAt(null);
      void refreshSeats();
    } finally {
      setBusy(false);
    }
  }

  async function simulatePayment(paymentResult: "SUCCESS" | "FAILURE") {
    if (!selectedSeat) return;
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.event_id, seatNumber: selectedSeat, paymentResult }),
      });
      const data = await response.json();
      setModalOpen(false);
      setSelectedSeat(null);
      setLockExpiresAt(null);
      if (!response.ok) {
        if (paymentResult === "FAILURE" && response.status === 402) {
          setNotice(data.message || "Payment was not completed. The seat has been released.");
        } else {
          setNotice(data.error || "Checkout could not be completed.");
        }
      } else {
        setConfirmation(`Ticket confirmed · Seat ${data.seatNumber} · Booking ${data.bookingId}`);
      }
      await refreshSeats();
    } catch (error) {
      setModalOpen(false);
      setNotice(error instanceof Error ? error.message : "Checkout could not be completed.");
      await refreshSeats();
    } finally {
      setBusy(false);
    }
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
              const isSelected = selectedSeat === seatNumber;
              const isOwnedLock = locks.get(seatNumber) === true;
              const disabled = isSold || heldByOther || busy;
              return (
                <button
                  key={seatNumber}
                  type="button"
                  onClick={() => void chooseSeat(seatNumber)}
                  disabled={disabled}
                  aria-label={`Seat ${seatNumber}${isSold ? ", sold" : heldByOther ? ", held by another guest" : isSelected || isOwnedLock ? ", held by you" : ", available"}`}
                  aria-pressed={isSelected || isOwnedLock}
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

      {(notice || confirmation) && (
        <div
          role={notice ? "alert" : "status"}
          className={`mt-6 flex items-start gap-2 rounded-xl px-4 py-3 text-[12px] font-semibold ${confirmation ? "bg-lime/40 text-ink" : "bg-red-50 text-red-700"}`}
        >
          {confirmation ? <Check size={16} className="mt-0.5 shrink-0" /> : <X size={15} className="mt-0.5 shrink-0" />}
          <span>{confirmation || notice}</span>
        </div>
      )}

      <div className="mt-7 flex flex-col gap-4 border-t border-black/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink/40">Ticket price</p>
          <p className="mt-1 text-lg font-black">${ticketPrice.toFixed(2)} <span className="text-[11px] font-medium text-ink/45">per seat</span></p>
        </div>
        {selectedSeat ? (
          <button
            onClick={() => setModalOpen(true)}
            disabled={busy}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ink px-6 text-[12px] font-black text-white transition hover:bg-black/75 disabled:opacity-50"
          >
            Continue with seat {selectedSeat} <ArrowRightIcon />
          </button>
        ) : (
          <p className="text-[11px] font-medium text-ink/45">
            {session ? "Select an available seat to continue." : "Sign in is required to hold a seat."}
          </p>
        )}
      </div>

      {modalOpen && selectedSeat && (
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
                <span>Seat {selectedSeat} <span className="mx-1">·</span> 1 ticket</span>
                <span className="font-black text-ink">${ticketPrice.toFixed(2)}</span>
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