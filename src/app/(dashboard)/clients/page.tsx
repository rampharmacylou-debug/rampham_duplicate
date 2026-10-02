"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Users,
  Pencil,
  Trash2,
  Phone,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import EmptyState from "@/components/EmptyState";
import Drawer from "@/components/Drawer";
import SearchFilterBar from "@/components/SearchFilterBar";
import { TextField } from "@/components/fields";
import { useApiCollection } from "@/hooks/useApiCollection";
import { useRole } from "@/lib/roleContext";
import { parseClientWorkbook } from "@/lib/clientImport";
import { SavedClient } from "@/lib/types";

function fmtKsh(n: number) {
  return `KSh ${n.toLocaleString("en-KE")}`;
}

// Builds a WhatsApp share link with the client's name, number, and Pham
// price, each on its own line — just the values, no field labels. It
// carries no phone number of its own, so WhatsApp opens the chat/contact
// picker and lets the user choose who to send it to, rather than jumping
// straight into a chat with the client's own number.
function whatsappShareHref(c: SavedClient): string {
  const phones = c.phone
    .trim()
    .split(/[,\s]+/)
    .join("\n");
  const message = [
    c.clientName,
    c.routeName,
    phones,
    `Cost: ${c.phamPrice}`,
    //fmtKsh(c.phamPrice),
  ].join("\n\n");
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
}

type Banner = { kind: "success" | "error"; message: string };

type Form = {
  clientName: string;
  phone: string;
  routeName: string;
  riderPrice: string;
  phamPrice: string;
};

const BLANK: Form = {
  clientName: "",
  phone: "",
  routeName: "",
  riderPrice: "",
  phamPrice: "",
};

export default function ClientsPage() {
  const { isAdmin } = useRole();
  const { items, loading, add, update, remove, reload } =
    useApiCollection<SavedClient>("/api/clients", "clients");

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(BLANK);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 6000);
    return () => clearTimeout(t);
  }, [banner]);

  const sorted = useMemo(
    () => [...items].sort((a, b) => a.clientName.localeCompare(b.clientName)),
    [items],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return !q
      ? sorted
      : sorted.filter(
          (c) =>
            c.clientName.toLowerCase().includes(q) ||
            (c.phone ?? "").toLowerCase().includes(q) ||
            c.routeName.toLowerCase().includes(q),
        );
  }, [sorted, search]);

  function openCreate() {
    setEditId(null);
    setForm(BLANK);
    setError(null);
    setOpen(true);
  }

  function openEdit(c: SavedClient) {
    setEditId(c.id);
    setForm({
      clientName: c.clientName,
      phone: c.phone ?? "",
      routeName: c.routeName,
      riderPrice: String(c.riderPrice),
      phamPrice: String(c.phamPrice),
    });
    setError(null);
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        clientName: form.clientName.trim(),
        phone: form.phone.trim(),
        routeName: form.routeName.trim(),
        riderPrice: Number(form.riderPrice) || 0,
        phamPrice: Number(form.phamPrice) || 0,
      };
      if (editId) await update(editId, payload);
      else await add(payload);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (
      !window.confirm("Remove this client? Past trips and diary entries stay.")
    )
      return;
    await remove(id);
  }

  async function handleImport(file: File) {
    try {
      const { rows, skippedEmptyRows } = await parseClientWorkbook(file);
      if (rows.length === 0) {
        setBanner({
          kind: "error",
          message: "No readable rows found. Check column headers.",
        });
        return;
      }

      const CHUNK = 500;
      let totalAdded = 0,
        totalUpdated = 0;

      for (let i = 0; i < rows.length; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK);
        const res = await fetch("/api/clients/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: chunk }),
        });
        const text = await res.text();
        let data: { added?: number; updated?: number; error?: string };
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(
            `Server error on chunk ${Math.floor(i / CHUNK) + 1}: ${text.slice(0, 200)}`,
          );
        }
        if (!res.ok) {
          setBanner({ kind: "error", message: data.error ?? "Import failed." });
          return;
        }
        totalAdded += data.added ?? 0;
        totalUpdated += data.updated ?? 0;
      }

      const parts = [
        totalAdded ? `${totalAdded} added` : null,
        totalUpdated ? `${totalUpdated} updated` : null,
        skippedEmptyRows ? `${skippedEmptyRows} blank rows skipped` : null,
      ].filter(Boolean);

      setBanner({
        kind: "success",
        message: `Import complete — ${parts.join(", ")}.`,
      });
      await reload();
    } catch (err) {
      setBanner({
        kind: "error",
        message:
          err instanceof Error ? err.message : "Could not read that file.",
      });
    }
  }

  if (loading)
    return (
      <div className="py-20 text-center text-sm text-muted">
        Loading clients…
      </div>
    );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Clients"
        description="Saved client profiles with phone, route, and pricing."
        actionLabel="Add client"
        onAction={openCreate}
        hideAction={!isAdmin}
        secondaryAction={
          isAdmin ? (
            <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-hairline bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-canvas">
              Upload Excel
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) handleImport(f);
                }}
              />
            </label>
          ) : undefined
        }
      />

      {banner && (
        <div
          className={`flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm ${
            banner.kind === "success"
              ? "border-success/30 bg-success/10 text-success"
              : "border-danger/30 bg-danger/10 text-danger"
          }`}
        >
          {banner.kind === "success" ? (
            <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
          ) : (
            <AlertCircle size={17} className="mt-0.5 shrink-0" />
          )}
          <span>{banner.message}</span>
        </div>
      )}

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
          title="No clients saved yet"
          description="Add a client's phone, route and prices to reuse them every time."
          actionLabel="Add a client"
          onAction={openCreate}
        />
      ) : filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-hairline bg-surface/60 px-4 py-10 text-center text-sm text-muted">
          No clients match your search.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-hairline bg-surface">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Route</th>
                <th className="px-4 py-3 font-medium text-right">
                  Rider price
                </th>
                <th className="px-4 py-3 font-medium text-right">Pham price</th>
                {isAdmin && (
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-hairline last:border-0 hover:bg-canvas/40"
                >
                  <td className="px-4 py-3 font-medium text-ink">
                    <Link href={`/clients/${c.id}`} className="hover:underline">
                      {c.clientName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {c.phone ? (
                      <a
                        href={`tel:${c.phone}`}
                        className="flex items-center gap-1 text-accent hover:underline"
                      >
                        <Phone size={13} />
                        {c.phone}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">{c.routeName || "—"}</td>
                  <td className="px-4 py-3 text-right font-mono text-ink">
                    {fmtKsh(c.riderPrice)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-ink">
                    {fmtKsh(c.phamPrice)}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <a
                          href={whatsappShareHref(c)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Share client details on WhatsApp"
                          title="Share on WhatsApp"
                          className="rounded-md p-1.5 text-muted hover:bg-[#25D366]/10 hover:text-[#25D366]"
                        >
                          <MessageCircle size={15} />
                        </a>
                        <button
                          onClick={() => openEdit(c)}
                          aria-label="Edit"
                          className="rounded-md p-1.5 text-muted hover:bg-ink/5 hover:text-ink"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          aria-label="Delete"
                          className="rounded-md p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isAdmin && (
        <Drawer
          open={open}
          onClose={() => {
            setOpen(false);
            setError(null);
          }}
          title={editId ? "Edit client" : "Add client"}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <TextField
              label="Client name"
              value={form.clientName}
              onChange={(e) => setForm({ ...form, clientName: e.target.value })}
              placeholder="e.g. Acme Traders"
              required
              autoFocus
            />
            <TextField
              label="Phone number"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="e.g. 0712 345 678"
              type="tel"
              inputMode="tel"
            />
            <TextField
              label="Route"
              value={form.routeName}
              onChange={(e) => setForm({ ...form, routeName: e.target.value })}
              placeholder="e.g. Westlands – CBD"
            />
            <div className="grid grid-cols-2 gap-4">
              <TextField
                label="Rider price (KSh)"
                type="number"
                min={0}
                value={form.riderPrice}
                onChange={(e) =>
                  setForm({ ...form, riderPrice: e.target.value })
                }
              />
              <TextField
                label="Pham price (KSh)"
                type="number"
                min={0}
                value={form.phamPrice}
                onChange={(e) =>
                  setForm({ ...form, phamPrice: e.target.value })
                }
              />
            </div>

            {error && (
              <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-md bg-accent px-4 py-2 text-sm font-medium text-surface hover:bg-accent/90 disabled:opacity-60"
              >
                {saving ? "Saving…" : editId ? "Save changes" : "Add client"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setError(null);
                }}
                className="rounded-md border border-hairline px-4 py-2 text-sm font-medium text-muted hover:bg-canvas"
              >
                Cancel
              </button>
            </div>
          </form>
        </Drawer>
      )}
    </div>
  );
}
