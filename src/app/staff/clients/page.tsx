"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Users, Phone } from "lucide-react";
import StatCard from "@/components/StatCard";
import SearchFilterBar from "@/components/SearchFilterBar";
import LastUpdated from "@/components/LastUpdated";
import EmptyState from "@/components/EmptyState";
import { useApiCollection } from "@/hooks/useApiCollection";
import { SavedClient } from "@/lib/types";

function fmtKsh(n: number) {
  return `KSh ${n.toLocaleString("en-KE")}`;
}

export default function StaffClientsPage() {
  const { items, loading, lastUpdated, reload } = useApiCollection<SavedClient>(
    "/api/clients",
    "clients",
  );
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const sorted = useMemo(
    () => [...items].sort((a, b) => a.clientName.localeCompare(b.clientName)),
    [items],
  );

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return !q
      ? sorted
      : sorted.filter(
          (c) =>
            c.clientName.toLowerCase().includes(q) ||
            (c.phone ?? "").toLowerCase().includes(q) ||
            c.routeName.toLowerCase().includes(q),
        );
  }, [sorted, deferredSearch]);

  if (loading)
    return (
      <div className="py-20 text-center text-sm text-muted">
        Loading clients…
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-hairline pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
            Clients
          </h1>
          <p className="mt-1 text-sm text-muted">
            Client contacts and pricing — read only.
          </p>
        </div>
        <LastUpdated date={lastUpdated} onRefresh={reload} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Clients saved" value={String(items.length)} />
        <StatCard label="Showing" value={String(filtered.length)} />
      </div>

      <SearchFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, phone, or route…"
      />

      {sorted.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No clients yet"
          description="An admin needs to add clients first."
        />
      ) : filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-hairline bg-surface/60 px-4 py-10 text-center text-sm text-muted">
          No clients match your search.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-hairline bg-surface">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Route</th>
                <th className="px-4 py-3 font-medium text-right">Price</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-hairline last:border-0 hover:bg-canvas/40"
                >
                  <td className="px-4 py-3 font-medium text-ink">
                    {c.clientName}
                  </td>
                  <td className="px-4 py-3">
                    {c.phone ? (
                      <a
                        href={`tel:${c.phone}`}
                        className="flex items-center gap-1 text-accent hover:underline"
                      >
                        <Phone size={13} />
                        {c.phone}
                      </a>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">{c.routeName || "—"}</td>
                  <td className="px-4 py-3 text-right font-mono text-ink">
                    {fmtKsh(c.phamPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
