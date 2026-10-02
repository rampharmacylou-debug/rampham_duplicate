"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Truck, Pencil, Trash2, Users, MessageCircle } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import EmptyState from "@/components/EmptyState";
import Drawer from "@/components/Drawer";
import RefTag from "@/components/RefTag";
import SearchFilterBar from "@/components/SearchFilterBar";
import { TextField, SelectField } from "@/components/fields";
import { useApiCollection } from "@/hooks/useApiCollection";
import { useRole } from "@/lib/roleContext";
import { exportTripsToWhatsApp } from "@/lib/exportWhatsApp";
import { TransportRecord, SavedClient } from "@/lib/types";

function fmtKsh(n: number) { return `KSh ${n.toLocaleString("en-KE")}`; }
type Form = { clientId: string; clientName: string; riderName: string; routeName: string; riderPrice: string; phamPrice: string };
const BLANK: Form = { clientId: "", clientName: "", riderName: "", routeName: "", riderPrice: "", phamPrice: "" };

export default function TransportPage() {
  const { isAdmin } = useRole();
  const { items: trips, loading: tripsLoading, add, update, remove } = useApiCollection<TransportRecord>("/api/transport", "trips");
  const { items: clients, loading: clientsLoading } = useApiCollection<SavedClient>("/api/clients", "clients");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(BLANK);
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedClients = useMemo(() => [...clients].sort((a, b) => a.clientName.localeCompare(b.clientName)), [clients]);
  const sorted = useMemo(() => [...trips].sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")), [trips]);

  const clientFilterOpts = useMemo(() => {
    const names = Array.from(new Set(trips.map((t) => t.clientName))).sort();
    return [{ value: "all", label: "All clients" }, ...names.map((n) => ({ value: n, label: n }))];
  }, [trips]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sorted.filter((t) => {
      const matchSearch = !q || t.clientName.toLowerCase().includes(q) || t.routeName.toLowerCase().includes(q) || t.riderName.toLowerCase().includes(q);
      return matchSearch && (clientFilter === "all" || t.clientName === clientFilter);
    });
  }, [sorted, search, clientFilter]);

  const riderTotal = trips.reduce((s, t) => s + t.riderPrice, 0);
  const phamTotal = trips.reduce((s, t) => s + t.phamPrice, 0);

  function openCreate() { setEditId(null); setForm(BLANK); setError(null); setOpen(true); }
  function openEdit(t: TransportRecord) { setEditId(t.id); setForm({ clientId: t.clientId ?? "", clientName: t.clientName, riderName: t.riderName ?? "", routeName: t.routeName, riderPrice: String(t.riderPrice), phamPrice: String(t.phamPrice) }); setError(null); setOpen(true); }

  function pickClient(clientId: string) {
    if (!clientId) { setForm((f) => ({ ...BLANK, riderName: f.riderName, clientId: "" })); return; }
    const c = clients.find((x) => x.id === clientId);
    if (c) setForm((f) => ({ ...f, clientId, clientName: c.clientName, routeName: c.routeName, riderPrice: String(c.riderPrice), phamPrice: String(c.phamPrice) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientName.trim()) return;
    setSaving(true); setError(null);
    try {
      const payload = { clientId: form.clientId || undefined, clientName: form.clientName.trim(), riderName: form.riderName.trim(), routeName: form.routeName.trim(), riderPrice: Number(form.riderPrice) || 0, phamPrice: Number(form.phamPrice) || 0 };
      if (editId) await update(editId, payload); else await add(payload);
      setOpen(false);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to save."); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Remove this trip?")) return;
    await remove(id);
  }

  if (tripsLoading || clientsLoading) return <div className="py-20 text-center text-sm text-muted">Loading transport…</div>;

  return (
    <div className="space-y-8">
      <PageHeader title="Transport" hideAction={!isAdmin} description="Trips by rider, client, and route, priced in KSh." actionLabel="Log trip" onAction={openCreate}
        secondaryAction={
          <div className="flex flex-wrap gap-2">
            <Link href="/clients" className="flex items-center gap-1.5 rounded-md border border-hairline bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-canvas"><Users size={16} />Manage clients</Link>
            <button type="button" onClick={() => exportTripsToWhatsApp(filtered)} disabled={filtered.length === 0}
              className="flex items-center gap-1.5 rounded-md border border-hairline bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-canvas disabled:opacity-50"><MessageCircle size={16} />Export WhatsApp</button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Trips logged" value={String(trips.length)} />
        <StatCard label="Rider total" value={fmtKsh(riderTotal)} />
        <StatCard label="Pham total" value={fmtKsh(phamTotal)} />
        <StatCard label="Combined" value={fmtKsh(riderTotal + phamTotal)} />
      </div>

      <SearchFilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search by client, route, or rider…" filterValue={clientFilter} onFilterChange={setClientFilter} filterOptions={clientFilterOpts} />

      {sorted.length === 0 ? (
        <EmptyState icon={Truck} title="No trips logged yet" description="Log a trip, or pick a saved client to fill in route and prices automatically." actionLabel="Log a trip" onAction={openCreate} />
      ) : filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-hairline bg-surface/60 px-4 py-10 text-center text-sm text-muted">No trips match your search or filter.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-hairline bg-surface">
          <table className="w-full min-w-[720px] text-sm">
            <thead><tr className="border-b border-hairline text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Ref</th><th className="px-4 py-3 font-medium">Rider</th>
              <th className="px-4 py-3 font-medium">Client</th><th className="px-4 py-3 font-medium">Route</th>
              <th className="px-4 py-3 font-medium text-right">Rider price</th><th className="px-4 py-3 font-medium text-right">Pham price</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr></thead>
            <tbody>
              {filtered.map((t) => {
                const idx = sorted.findIndex((x) => x.id === t.id);
                return (
                  <tr key={t.id} className="border-b border-hairline last:border-0 hover:bg-canvas/40">
                    <td className="px-4 py-3"><RefTag>TRN-{String(sorted.length - idx).padStart(3, "0")}</RefTag></td>
                    <td className="px-4 py-3 text-ink">{t.riderName || <span className="italic text-muted">Unassigned</span>}</td>
                    <td className="px-4 py-3 font-medium text-ink">
                      {t.clientId ? <Link href={`/clients/${t.clientId}`} className="hover:underline">{t.clientName}</Link> : t.clientName}
                    </td>
                    <td className="px-4 py-3 text-muted">{t.routeName}</td>
                    <td className="px-4 py-3 text-right font-mono text-ink">{fmtKsh(t.riderPrice)}</td>
                    <td className="px-4 py-3 text-right font-mono text-ink">{fmtKsh(t.phamPrice)}</td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button onClick={() => openEdit(t)} className="rounded-md p-1.5 text-muted hover:bg-ink/5 hover:text-ink"><Pencil size={15} /></button>
                          <button onClick={() => handleDelete(t.id)} className="rounded-md p-1.5 text-muted hover:bg-danger/10 hover:text-danger"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot><tr className="border-t border-hairline bg-canvas/40 font-medium text-ink">
              <td className="px-4 py-3" colSpan={4}>Total</td>
              <td className="px-4 py-3 text-right font-mono">{fmtKsh(riderTotal)}</td>
              <td className="px-4 py-3 text-right font-mono">{fmtKsh(phamTotal)}</td>
              <td className="px-4 py-3" />
            </tr></tfoot>
          </table>
        </div>
      )}

      <Drawer open={open} onClose={() => setOpen(false)} title={editId ? "Edit trip" : "Log trip"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <TextField label="Rider name" value={form.riderName} onChange={(e) => setForm({ ...form, riderName: e.target.value })} placeholder="e.g. Brian K." autoFocus />
          <SelectField label="Client" value={form.clientId} onChange={(e) => pickClient(e.target.value)}>
            <option value="">+ One-off client</option>
            {sortedClients.map((c) => <option key={c.id} value={c.id}>{c.clientName}</option>)}
          </SelectField>
          {!form.clientId && <TextField label="Client name" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} placeholder="e.g. Mary W." required />}
          <TextField label="Route" value={form.routeName} onChange={(e) => setForm({ ...form, routeName: e.target.value })} placeholder="e.g. Westlands – CBD" required />
          <div className="grid grid-cols-2 gap-4">
            <TextField label="Rider price (KSh)" type="number" min={0} value={form.riderPrice} onChange={(e) => setForm({ ...form, riderPrice: e.target.value })} />
            <TextField label="Pham price (KSh)" type="number" min={0} value={form.phamPrice} onChange={(e) => setForm({ ...form, phamPrice: e.target.value })} />
          </div>
          {error && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={saving} className="flex-1 rounded-md bg-accent px-4 py-2 text-sm font-medium text-surface hover:bg-accent/90 disabled:opacity-60">{saving ? "Saving…" : editId ? "Save changes" : "Add trip"}</button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-hairline px-4 py-2 text-sm font-medium text-muted hover:bg-canvas">Cancel</button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
