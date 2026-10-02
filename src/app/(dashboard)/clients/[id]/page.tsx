"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Truck, NotebookPen, Phone } from "lucide-react";
import StatCard from "@/components/StatCard";
import RefTag from "@/components/RefTag";
import PaidBadge from "@/components/PaidBadge";
import { SavedClient, TransportRecord, DiaryEntry } from "@/lib/types";

function fmtKsh(n: number) { return `KSh ${n.toLocaleString("en-KE")}`; }
function fmtDate(iso: string) { return new Date(iso + "T00:00:00").toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }); }

type ClientDetail = { client: SavedClient; trips: TransportRecord[]; diary: DiaryEntry[] };

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/clients/${id}`)
      .then((r) => { if (r.status === 404) { setNotFound(true); return null; } return r.json(); })
      .then((d) => { if (d) setData(d); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="py-20 text-center text-sm text-muted">Loading client…</div>;

  if (notFound || !data) return (
    <div className="space-y-6">
      <Link href="/clients" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft size={15} />Back to clients</Link>
      <p className="rounded-lg border border-dashed border-hairline bg-surface/60 px-4 py-10 text-center text-sm text-muted">This client couldn&apos;t be found — they may have been removed.</p>
    </div>
  );

  const { client, trips, diary } = data;
  const riderTotal = trips.reduce((s, t) => s + t.riderPrice, 0);
  const phamTotal = trips.reduce((s, t) => s + t.phamPrice, 0);
  const outstanding = diary.filter((e) => e.paidStatus !== "paid").length;

  return (
    <div className="space-y-10">
      <div>
        <Link href="/clients" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft size={15} />Back to clients</Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4 border-b border-hairline pb-6">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink">{client.clientName}</h1>
            <p className="mt-1 text-sm text-muted">Default route: {client.routeName || "—"}</p>
            {client.phone && (
              <a href={`tel:${client.phone}`} className="mt-1 flex items-center gap-1.5 text-sm text-accent hover:underline">
                <Phone size={14} />{client.phone}
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Default rider price" value={fmtKsh(client.riderPrice)} />
        <StatCard label="Default pham price" value={fmtKsh(client.phamPrice)} />
        <StatCard label="Trips logged" value={String(trips.length)} />
        <StatCard label="Outstanding" value={String(outstanding)} hint={`of ${diary.length} diary entries`} />
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2"><Truck size={16} className="text-muted" /><h2 className="font-display text-base font-bold text-ink">Routes &amp; trips</h2></div>
        {trips.length === 0 ? (
          <p className="rounded-lg border border-dashed border-hairline bg-surface/60 px-4 py-8 text-center text-sm text-muted">No trips logged for this client yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-hairline bg-surface">
            <table className="w-full min-w-[480px] text-sm">
              <thead><tr className="border-b border-hairline text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">Rider</th><th className="px-4 py-3 font-medium">Route</th>
                <th className="px-4 py-3 font-medium text-right">Rider price</th><th className="px-4 py-3 font-medium text-right">Pham price</th>
              </tr></thead>
              <tbody>
                {trips.map((t) => (
                  <tr key={t.id} className="border-b border-hairline last:border-0">
                    <td className="px-4 py-3 text-ink">{t.riderName || <span className="italic text-muted">Unassigned</span>}</td>
                    <td className="px-4 py-3 text-muted">{t.routeName}</td>
                    <td className="px-4 py-3 text-right font-mono text-ink">{fmtKsh(t.riderPrice)}</td>
                    <td className="px-4 py-3 text-right font-mono text-ink">{fmtKsh(t.phamPrice)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="border-t border-hairline bg-canvas/40 font-medium text-ink">
                <td className="px-4 py-3" colSpan={2}>Total</td>
                <td className="px-4 py-3 text-right font-mono">{fmtKsh(riderTotal)}</td>
                <td className="px-4 py-3 text-right font-mono">{fmtKsh(phamTotal)}</td>
              </tr></tfoot>
            </table>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2"><NotebookPen size={16} className="text-muted" /><h2 className="font-display text-base font-bold text-ink">Diary status</h2></div>
        {diary.length === 0 ? (
          <p className="rounded-lg border border-dashed border-hairline bg-surface/60 px-4 py-8 text-center text-sm text-muted">No diary entries logged for this client yet.</p>
        ) : (
          <ol className="space-y-3">
            {diary.map((e) => (
              <li key={e.id} className="rounded-lg border border-hairline bg-surface px-4 py-4">
                <div className="flex items-start gap-3">
                  <RefTag>{fmtDate(e.date)}</RefTag>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm text-text/80">{e.itemsTaken} · Qty {e.qty}</p>
                      <PaidBadge status={e.paidStatus} />
                    </div>
                    {e.transport ? <p className="mt-1 text-xs text-muted">Transport {fmtKsh(e.transport)}</p> : null}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
