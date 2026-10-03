"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { MessageSquareText, Star } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

type Review = {
  event_id: string;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
};

export function EventReviews({ eventId }: { eventId: string }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadReviews() {
    try {
      const response = await fetch(`/api/events/${eventId}/reviews`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load reviews.");
      setReviews(data.reviews);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load reviews.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadReviews(); }, [eventId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/events/${eventId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save your review.");
      setReviews((previous) => [data.review, ...previous]);
      setComment("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not save your review.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[22px] border border-black/10 bg-white p-6 sm:p-8">
      <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-ink/40">From the crowd</p>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[24px] font-black tracking-[-0.06em]">Reviews.</h2>
        <span className="rounded-full bg-[#f4f3ef] px-3 py-1.5 text-[10px] font-bold text-ink/55">{reviews.length} {reviews.length === 1 ? "review" : "reviews"}</span>
      </div>
      <form onSubmit={submit} className="mt-5 rounded-2xl bg-[#f7f6f3] p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-bold">{session ? "How was it?" : "Been to this event?"}</p>
          <label className="flex items-center gap-2 text-[10px] font-semibold text-ink/55">
            <span className="sr-only">Rating</span>
            <select
              aria-label="Rating"
              value={rating}
              onChange={(event) => setRating(Number(event.target.value))}
              className="rounded-lg border border-black/10 bg-white px-2 py-1.5 text-[11px] font-bold text-ink outline-none"
            >
              {[5, 4, 3, 2, 1].map((score) => <option key={score} value={score}>{score} / 5</option>)}
            </select>
          </label>
        </div>
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          minLength={8}
          maxLength={1000}
          rows={3}
          placeholder={session ? "Share a few words with the next crowd…" : "Sign in to share your review…"}
          className="mt-3 w-full resize-y rounded-xl border border-black/10 bg-white p-3 text-[12px] leading-5 outline-none focus:border-ink/40"
        />
        {error && <p role="alert" className="mt-2 text-[11px] font-semibold text-red-700">{error}</p>}
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-[9px] text-ink/40">8–1,000 characters</span>
          {session ? (
            <button disabled={busy || comment.trim().length < 8} className="rounded-full bg-ink px-4 py-2 text-[10px] font-black text-white disabled:opacity-40">
              {busy ? "Posting…" : "Post review"}
            </button>
          ) : (
            <Link href={`/login?callbackUrl=${encodeURIComponent(`/events/${eventId}`)}`} className="rounded-full bg-ink px-4 py-2 text-[10px] font-black text-white">Sign in to review</Link>
          )}
        </div>
      </form>
      <div className="mt-5 divide-y divide-black/10">
        {loading ? (
          <p className="py-5 text-[11px] text-ink/45">Loading reviews…</p>
        ) : reviews.length ? reviews.map((review, index) => (
          <article key={`${review.event_id}-${review.created_at}-${index}`} className="py-4 first:pt-0 last:pb-0">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-bold">{review.user_name}</p>
              <time className="text-[9px] font-medium text-ink/40">{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(review.created_at))}</time>
            </div>
            <p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-ink/70">
              <Star size={12} fill="currentColor" className="text-[#829934]" /> {review.rating} / 5
            </p>
            <p className="mt-2 whitespace-pre-wrap text-[12px] leading-6 text-ink/60">{review.comment}</p>
          </article>
        )) : (
          <p className="flex items-center gap-2 py-5 text-[11px] text-ink/45"><MessageSquareText size={14} /> No reviews yet. Be the first to leave one.</p>
        )}
      </div>
    </section>
  );
}