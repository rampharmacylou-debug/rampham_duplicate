"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { NotebookPen, Pencil, Trash2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import EmptyState from "@/components/EmptyState";
import Drawer from "@/components/Drawer";
import RefTag from "@/components/RefTag";
import PaidBadge from "@/components/PaidBadge";
import SearchFilterBar from "@/components/SearchFilterBar";
import { TextField, SelectField } from "@/components/fields";
import { useApiCollection } from "@/hooks/useApiCollection";
import { useRole } from "@/lib/roleContext";
import { DiaryEntry, PaidStatus, SavedClient } from "@/lib/types";

function isoToday() { return new Date().toISOString().slice(0, 10); }
function fmtDate(iso: string) { return new Date(iso + "T00:00:00").toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }); }
function fmtKsh(n: number) { return `KSh ${n.toLocaleString("en-KE")}`; }

type Form = { clientId: string; clientName: string; date: string; itemsTaken: string; qty: string; transport: string; paidStatus: PaidStatus };
const BLANK: Form = { clientId: "", clientName: "", date: isoToday(), itemsTaken: "", qty: "1", transport: "", paidStatus: "unpaid" };
const PAID_OPTS = [{ value: "all", label: "All payment status" }, { value: "paid", label: "Paid" }, { value: "partial", label: "Partially paid" }, { value: "unpaid", label: "Not paid" }];

export default function DiaryPage() {
  const { isAdmin } = useRole();
  const { items: entries, loading: entriesLoading, add, update, remove } = useApiCollection<DiaryEntry>("/api/diary", "entries");
  const { items: clients, loading: clientsLoading } = useApiCollection<SavedClient>("/api/clients", "clients");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(BLANK);
  const [search, setSearch] = useState("");
  const [paidFilter, setPaidFilter] = useState("all");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedClients = useMemo(() => [...clients].sort((a, b) => a.clientName.localeCompare(b.clientName)), [clients]);
  const sorted = useMemo(() => [...entries].sort((a, b) => b.date.localeCompare(a.date)), [entries]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sorted.filter((e) => {
      const matchSearch = !q || e.clientName.toLowerCase().includes(q) || e.itemsTaken.toLowerCase().includes(q);
      return matchSearch && (paidFilter === "all" || e.paidStatus === paidFilter);
    });
  }, [sorted, search, paidFilter]);

  function sevenDaysAgo() { const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().slice(0, 10); }
  const last7 = entries.filter((e) => e.date >= sevenDaysAgo()).length;
  const outstanding = entries.filter((e) => e.paidStatus !== "paid").length;

  function openCreate() { setEditId(null); setForm(BLANK); setError(null); setOpen(true); }
  function openEdit(e: DiaryEntry) { setEditId(e.id); setForm({ clientId: e.clientId ?? "", clientName: e.clientName, date: e.date, itemsTaken: e.itemsTaken, qty: String(e.qty), transport: String(e.transport), paidStatus: e.paidStatus }); setError(null); setOpen(true); }

  function pickClient(clientId: string) {
    if (!clientId) { setForm((f) => ({ ...f, clientId: "", clientName: "" })); return; }
    const c = clients.find((x) => x.id === clientId);
    if (c) setForm((f) => ({ ...f, clientId, clientName: c.clientName }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientName.trim() || !form.itemsTaken.trim()) return;
    setSaving(true); setError(null);
    try {
      const payload = { clientId: form.clientId || undefined, clientName: form.clientName.trim(), date: form.date || isoToday(), itemsTaken: form.itemsTaken.trim(), qty: Number(form.qty) || 0, transport: Number(form.transport) || 0, paidStatus: form.paidStatus };
      if (editId) await update(editId, payload); else await add(payload);
      setOpen(false);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to save."); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Remove this diary entry?")) return;
    await remove(id);
  }

  if (entriesLoading || clientsLoading) return <div className="py-20 text-center text-sm text-muted">Loading diary…</div>;

  return (
    <div className="space-y-8">
      <PageHeader title="Diary" description="What each client took, when, and whether they paid." actionLabel="New entry" onAction={openCreate} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Entries logged" value={String(entries.length)} />
        <StatCard label="Last 7 days" value={String(last7)} />
        <StatCard label="Outstanding" value={String(outstanding)} hint={outstanding ? "Not fully paid" : "All settled"} />
      </div>
      <SearchFilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search by client or item…" filterValue={paidFilter} onFilterChange={setPaidFilter} filterOptions={PAID_OPTS} />

      {sorted.length === 0 ? (
        <EmptyState icon={NotebookPen} title="No entries yet" description="Log what a client took today — items, quantity, transport, and payment status." actionLabel="Write an entry" onAction={openCreate} />
      ) : filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-hairline bg-surface/60 px-4 py-10 text-center text-sm text-muted">No entries match your search or filter.</p>
      ) : (
        <ol className="space-y-3">
          {filtered.map((entry) => {
            const idx = sorted.findIndex((e) => e.id === entry.id);
            return (
              <li key={entry.id} className="group rounded-lg border border-hairline bg-surface px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <RefTag>DIA-{String(sorted.length - idx).padStart(3, "0")}</RefTag>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-ink">
                          {entry.clientId ? <Link href={`/clients/${entry.clientId}`} className="hover:underline">{entry.clientName}</Link> : entry.clientName}
                        </p>
                        <PaidBadge status={entry.paidStatus} />
                      </div>
                      <p className="mt-0.5 font-mono text-xs text-muted">{fmtDate(entry.date)}</p>
                      <p className="mt-2 text-sm text-text/80">{entry.itemsTaken} · Qty {entry.qty}{entry.transport ? ` · Transport ${fmtKsh(entry.transport)}` : ""}</p>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button onClick={() => openEdit(entry)} className="rounded-md p-1.5 text-muted hover:bg-ink/5 hover:text-ink"><Pencil size={15} /></button>
                      <button onClick={() => handleDelete(entry.id)} className="rounded-md p-1.5 text-muted hover:bg-danger/10 hover:text-danger"><Trash2 size={15} /></button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <Drawer open={open} onClose={() => setOpen(false)} title={editId ? "Edit entry" : "New diary entry"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <SelectField label="Client" value={form.clientId} onChange={(e) => pickClient(e.target.value)}>
            <option value="">+ One-off client</option>
            {sortedClients.map((c) => <option key={c.id} value={c.id}>{c.clientName}</option>)}
          </SelectField>
          {!form.clientId && <TextField label="Client name" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} placeholder="e.g. Mary W." required autoFocus />}
          <TextField label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          <TextField label="Items taken" value={form.itemsTaken} onChange={(e) => setForm({ ...form, itemsTaken: e.target.value })} placeholder="e.g. Helmet — full face" required />
          <div className="grid grid-cols-2 gap-4">
            <TextField label="Qty" type="number" min={0} value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
            <TextField label="Transport (KSh)" type="number" min={0} value={form.transport} onChange={(e) => setForm({ ...form, transport: e.target.value })} />
          </div>
          <SelectField label="Paid progress" value={form.paidStatus} onChange={(e) => setForm({ ...form, paidStatus: e.target.value as PaidStatus })}>
            <option value="unpaid">Not paid</option><option value="partial">Partially paid</option><option value="paid">Paid</option>
          </SelectField>
          {error && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={saving} className="flex-1 rounded-md bg-accent px-4 py-2 text-sm font-medium text-surface hover:bg-accent/90 disabled:opacity-60">{saving ? "Saving…" : editId ? "Save changes" : "Add entry"}</button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-hairline px-4 py-2 text-sm font-medium text-muted hover:bg-canvas">Cancel</button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
