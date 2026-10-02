"use client";

import { useMemo, useState } from "react";
import { Truck } from "lucide-react";
import StatCard from "@/components/StatCard";
import SearchFilterBar from "@/components/SearchFilterBar";
import LastUpdated from "@/components/LastUpdated";
import RefTag from "@/components/RefTag";
import EmptyState from "@/components/EmptyState";
import { useApiCollection } from "@/hooks/useApiCollection";
import { TransportRecord } from "@/lib/types";

function fmtKsh(n: number) { return `KSh ${n.toLocaleString("en-KE")}`; }

export default function StaffTransportPage() {
  const { items, loading, lastUpdated, reload } = useApiCollection<TransportRecord>("/api/transport", "trips");
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("all");

  const sorted = useMemo(() => [...items].sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")), [items]);
  const clientOpts = useMemo(() => {
    const names = Array.from(new Set(items.map((t) => t.clientName))).sort();
    return [{ value: "all", label: "All clients" }, ...names.map((n) => ({ value: n, label: n }))];
  }, [items]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sorted.filter((t) =>
      (!q || t.clientName.toLowerCase().includes(q) || t.routeName.toLowerCase().includes(q) || (t.riderName ?? "").toLowerCase().includes(q))
      && (clientFilter === "all" || t.clientName === clientFilter)
    );
  }, [sorted, search, clientFilter]);

  const phamTotal = items.reduce((s, t) => s + t.phamPrice, 0);

  if (loading) return <div className="py-20 text-center text-sm text-muted">Loading transport…</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-hairline pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Transport route</h1>
          <p className="mt-1 text-sm text-muted">Trips by rider, client, and route — read only.</p>
        </div>
        <LastUpdated date={lastUpdated} onRefresh={reload} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Trips logged" value={String(items.length)} />
        <StatCard label="Price total" value={fmtKsh(phamTotal)} />
      </div>

      <SearchFilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search by client, route, or rider…" filterValue={clientFilter} onFilterChange={setClientFilter} filterOptions={clientOpts} />

      {sorted.length === 0 ? (
        <EmptyState icon={Truck} title="No trips yet" description="An admin needs to log trips first." />
      ) : filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-hairline bg-surface/60 px-4 py-10 text-center text-sm text-muted">No trips match your search or filter.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-hairline bg-surface">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">Ref</th>
                <th className="px-4 py-3 font-medium">Rider</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Route</th>
                <th className="px-4 py-3 font-medium text-right">Price</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const idx = sorted.findIndex((x) => x.id === t.id);
                return (
                  <tr key={t.id} className="border-b border-hairline last:border-0 hover:bg-canvas/40">
                    <td className="px-4 py-3"><RefTag>TRN-{String(sorted.length - idx).padStart(3, "0")}</RefTag></td>
                    <td className="px-4 py-3 text-ink">{t.riderName || <span className="italic text-muted">Unassigned</span>}</td>
                    <td className="px-4 py-3 font-medium text-ink">{t.clientName}</td>
                    <td className="px-4 py-3 text-muted">{t.routeName}</td>
                    <td className="px-4 py-3 text-right font-mono text-ink">{fmtKsh(t.phamPrice)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
