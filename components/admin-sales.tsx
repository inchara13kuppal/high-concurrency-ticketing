"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, Download, Plus, RotateCw } from "lucide-react";
import { formatINR } from "@/lib/format";

type SalesRow = {
  event_id: string;
  event_title: string;
  venue_name: string;
  location: string;
  start_time: string;
  tickets_sold: number;
  total_revenue: string;
};

export function AdminSales() {
  const [rows, setRows] = useState<SalesRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadSales() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/sales", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load sales data.");
      setRows(data.sales);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load sales data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadSales(); }, []);

  const totalTickets = rows.reduce((sum, row) => sum + Number(row.tickets_sold), 0);
  const totalRevenue = rows.reduce((sum, row) => sum + Number(row.total_revenue), 0);

  return (
    <main className="mx-auto min-h-[calc(100vh-74px)] max-w-[1440px] px-5 py-8 sm:px-8 sm:py-12 lg:px-12 lg:py-16">
      <Link href="/" className="inline-flex items-center gap-2 text-[11px] font-bold text-ink/50 hover:text-ink">
        <ArrowLeft size={14} /> Back to events
      </Link>
      <div className="mt-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-ink/45">Seatline / Admin</p>
          <h1 className="text-[clamp(2.7rem,6vw,5rem)] font-black leading-[0.88] tracking-[-0.08em]">Sales, at a glance.</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/events"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-black/15 bg-white px-5 text-[11px] font-black transition hover:border-ink"
          >
            <Plus size={14} /> Add event
          </Link>
          <a
            href="/api/admin/sales.csv"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-[11px] font-black text-white transition hover:bg-black/75"
          >
            <Download size={14} /> Download CSV <ArrowUpRight size={13} />
          </a>
        </div>
      </div>

      <div className="mt-9 grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Events tracked" value={String(rows.length)} />
        <SummaryCard label="Tickets sold" value={totalTickets.toLocaleString("en-US")} />
        <SummaryCard label="Gross revenue" value={formatINR(totalRevenue)} />
      </div>

      <section className="mt-8 overflow-hidden rounded-[20px] border border-black/10 bg-white">
        <div className="flex items-center justify-between border-b border-black/10 px-5 py-4 sm:px-7">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-ink/40">Event performance</p>
            <h2 className="mt-1 text-lg font-black tracking-[-0.04em]">Sales summary</h2>
          </div>
          <button onClick={() => void loadSales()} disabled={loading} className="inline-flex items-center gap-1.5 text-[10px] font-bold text-ink/50 hover:text-ink disabled:opacity-50">
            <RotateCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
        {error ? (
          <div role="alert" className="p-8 text-sm font-semibold text-red-700">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left">
              <thead className="bg-[#f4f3ef] text-[9px] font-black uppercase tracking-[0.14em] text-ink/45">
                <tr>
                  <th className="px-5 py-3.5 sm:px-7">Event</th>
                  <th className="px-5 py-3.5">Venue</th>
                  <th className="px-5 py-3.5">Start time</th>
                  <th className="px-5 py-3.5 text-right">Tickets</th>
                  <th className="px-5 py-3.5 text-right sm:px-7">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 text-[12px]">
                {loading && !rows.length ? (
                  Array.from({ length: 4 }, (_, index) => (
                    <tr key={index}>
                      {Array.from({ length: 5 }, (_, cell) => <td key={cell} className="px-5 py-5 sm:px-7"><span className="block h-3 animate-pulse rounded bg-black/5" /></td>)}
                    </tr>
                  ))
                ) : rows.length ? rows.map((row) => (
                  <tr key={row.event_id} className="transition hover:bg-[#faf9f6]">
                    <td className="px-5 py-4 font-bold sm:px-7">{row.event_title}</td>
                    <td className="px-5 py-4 text-ink/55">{row.venue_name}<span className="mt-1 block text-[10px]">{row.location}</span></td>
                    <td className="px-5 py-4 text-ink/55">{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(row.start_time))}</td>
                    <td className="px-5 py-4 text-right font-bold">{Number(row.tickets_sold).toLocaleString("en-US")}</td>
                    <td className="px-5 py-4 text-right font-black sm:px-7">{formatINR(row.total_revenue)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="px-7 py-12 text-center text-[12px] font-medium text-ink/45">No event sales to show yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="mt-4 text-[10px] leading-5 text-ink/40">Revenue reflects confirmed bookings at each event&apos;s current base ticket price.</p>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-black/10 bg-white p-5 sm:p-6">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-ink/40">{label}</p>
      <p className="mt-4 text-[clamp(1.8rem,4vw,2.8rem)] font-black leading-none tracking-[-0.07em]">{value}</p>
    </div>
  );
}