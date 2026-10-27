"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { ArrowUpRight, Menu, Ticket, X } from "lucide-react";
import { useState } from "react";

export function SiteHeader() {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="relative z-40 border-b border-black/10 bg-paper">
      <div className="mx-auto flex h-[74px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link href="/" className="group flex items-center gap-2.5" onClick={() => setMenuOpen(false)}>
          <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-lime">
            <Ticket size={17} strokeWidth={2.2} />
          </span>
          <span className="text-[20px] font-black tracking-[-1.1px]">seatline<span className="text-[#8ca82a]">.</span></span>
        </Link>

        <nav className="hidden items-center gap-8 text-[13px] font-semibold text-ink/70 md:flex">
          <Link href="/#events" className="transition hover:text-ink">Explore events</Link>
          <Link href="/#how-it-works" className="transition hover:text-ink">How it works</Link>
          {session?.user?.role === "Admin" && (
            <Link href="/admin" className="transition hover:text-ink">Sales dashboard</Link>
          )}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          {status === "loading" ? (
            <div className="h-9 w-24 animate-pulse rounded-full bg-black/5" />
          ) : session ? (
            <>
              <span className="max-w-32 truncate text-[13px] font-semibold text-ink/60">
                {session.user?.name?.split(" ")[0]}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-full border border-black/15 px-4 py-2 text-[12px] font-bold transition hover:border-ink"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-[13px] font-bold transition hover:text-black/60">Log in</Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-[12px] font-bold text-white transition hover:bg-black/75"
              >
                Create account <ArrowUpRight size={14} />
              </Link>
            </>
          )}
        </div>

        <button
          className="grid h-10 w-10 place-items-center rounded-full border border-black/15 md:hidden"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={19} /> : <Menu size={19} />}
        </button>
      </div>
      {menuOpen && (
        <nav className="absolute inset-x-0 top-full border-b border-black/10 bg-paper px-5 py-5 shadow-lg md:hidden">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-4 text-sm font-semibold">
            <Link href="/#events" onClick={() => setMenuOpen(false)}>Explore events</Link>
            <Link href="/#how-it-works" onClick={() => setMenuOpen(false)}>How it works</Link>
            {session?.user?.role === "Admin" && <Link href="/admin" onClick={() => setMenuOpen(false)}>Sales dashboard</Link>}
            {session ? (
              <button className="text-left" onClick={() => signOut({ callbackUrl: "/" })}>Sign out</button>
            ) : (
              <div className="flex gap-4 border-t border-black/10 pt-4">
                <Link href="/login" onClick={() => setMenuOpen(false)}>Log in</Link>
                <Link href="/register" onClick={() => setMenuOpen(false)}>Create account</Link>
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}