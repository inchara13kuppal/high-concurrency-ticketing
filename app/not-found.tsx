import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <main className="grid min-h-[70vh] place-items-center px-5">
      <div className="max-w-lg text-center">
        <p className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-ink/40">404 / Wrong room</p>
        <h1 className="text-5xl font-black tracking-[-0.08em]">This event isn&apos;t on the list.</h1>
        <p className="mt-4 text-sm leading-6 text-ink/55">It may have sold out, ended, or moved to another page.</p>
        <Link href="/" className="mt-7 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-xs font-black text-white">
          <ArrowLeft size={14} /> Back to Seatline
        </Link>
      </div>
    </main>
  );
}