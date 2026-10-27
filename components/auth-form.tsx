"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Ticket } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [name, setName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const register = mode === "register";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (register) {
        const response = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, dateOfBirth, email, password }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Registration failed.");
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (!result || result.error) throw new Error("That email and password do not match.");
      const callbackUrl = new URLSearchParams(window.location.search).get("callbackUrl");
      const safeCallback = callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "/";
      router.push(safeCallback);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-74px)]">
      <div className="mx-auto grid min-h-[calc(100vh-74px)] max-w-[1440px] lg:grid-cols-[1fr_0.92fr]">
        <section className="flex flex-col justify-between px-5 py-8 sm:px-10 sm:py-10 lg:px-16 lg:py-14">
          <Link href="/" className="inline-flex w-fit items-center gap-2 text-[12px] font-bold text-ink/55 transition hover:text-ink">
            <ArrowLeft size={15} /> Back to Seatline
          </Link>
          <div className="mx-auto w-full max-w-[430px] py-12">
            <span className="mb-8 grid h-11 w-11 place-items-center rounded-full bg-ink text-lime">
              <Ticket size={18} />
            </span>
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-ink/45">
              {register ? "Make it a night" : "Good to have you back"}
            </p>
            <h1 className="text-[clamp(2.7rem,6vw,4.5rem)] font-black leading-[0.9] tracking-[-0.08em]">
              {register ? <>Find your<br />people.</> : <>Pick up<br />where you left off.</>}
            </h1>
            <p className="mt-5 max-w-[360px] text-[14px] leading-6 text-ink/55">
              {register
                ? "Create an account to choose seats and keep your tickets in one place."
                : "Sign in to pick your seat and make your next night official."}
            </p>

            <form onSubmit={submit} className="mt-9 space-y-4">
              {register && (
                <label className="block">
                  <span className="mb-2 block text-[11px] font-bold">Your name</span>
                  <input
                    required
                    minLength={2}
                    maxLength={120}
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Alex Morgan"
                    className="h-12 w-full rounded-xl border border-black/15 bg-white px-4 text-[13px] outline-none transition focus:border-ink"
                  />
                </label>
              )}
              {register && (
                <label className="block">
                  <span className="mb-2 block text-[11px] font-bold">Date of birth</span>
                  <input
                    required
                    type="date"
                    autoComplete="bday"
                    max={new Date().toISOString().slice(0, 10)}
                    value={dateOfBirth}
                    onChange={(event) => setDateOfBirth(event.target.value)}
                    className="h-12 w-full rounded-xl border border-black/15 bg-white px-4 text-[13px] outline-none transition focus:border-ink"
                  />
                </label>
              )}
              <label className="block">
                <span className="mb-2 block text-[11px] font-bold">Email address</span>
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="h-12 w-full rounded-xl border border-black/15 bg-white px-4 text-[13px] outline-none transition focus:border-ink"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-[11px] font-bold">Password</span>
                <span className="relative block">
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    minLength={register ? 10 : 1}
                    maxLength={128}
                    autoComplete={register ? "new-password" : "current-password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={register ? "At least 10 characters" : "Your password"}
                    className="h-12 w-full rounded-xl border border-black/15 bg-white px-4 pr-12 text-[13px] outline-none transition focus:border-ink"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((show) => !show)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ink/45 hover:text-ink"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>
              </label>
              {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[12px] font-semibold text-red-700">{error}</p>}
              <button
                disabled={busy}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink text-[12px] font-black text-white transition hover:bg-black/75 disabled:cursor-wait disabled:opacity-60"
              >
                {busy ? "One moment…" : register ? "Create account" : "Log in"}
                {!busy && <ArrowRight size={15} />}
              </button>
            </form>
            <p className="mt-6 text-center text-[12px] text-ink/55">
              {register ? "Already have an account?" : "New to Seatline?"}{" "}
              <Link className="font-extrabold text-ink underline underline-offset-4" href={register ? "/login" : "/register"}>
                {register ? "Log in" : "Create an account"}
              </Link>
            </p>
          </div>
          <p className="text-[10px] font-semibold text-ink/35">Seatline · Find your next live moment</p>
        </section>
        <aside className="relative hidden overflow-hidden bg-ink lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_25%,#829934_0%,transparent_30%),radial-gradient(ellipse_at_10%_90%,#73523a_0%,transparent_42%),linear-gradient(145deg,#151518,#34352c)]" />
          <div className="grain absolute inset-0 opacity-35" />
          <div className="absolute inset-0 flex flex-col justify-between p-12 text-white xl:p-16">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
              <span className="h-2 w-2 rounded-full bg-lime" /> Live happens here
            </div>
            <div>
              <p className="max-w-[470px] text-[clamp(2.7rem,5vw,5rem)] font-black leading-[0.91] tracking-[-0.08em]">
                Be in the room<br />when it <span className="text-lime">happens.</span>
              </p>
              <p className="mt-6 max-w-[330px] text-[13px] leading-6 text-white/55">
                A sold-out chorus. A new favorite. A story that starts with a ticket.
              </p>
            </div>
            <div className="flex items-center justify-between border-t border-white/20 pt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">
              <span>Seatline, for nights like these</span><span>01 / 03</span>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}