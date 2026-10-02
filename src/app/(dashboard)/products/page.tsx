"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Package, Pencil, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import EmptyState from "@/components/EmptyState";
import Drawer from "@/components/Drawer";
import RefTag from "@/components/RefTag";
import SearchFilterBar from "@/components/SearchFilterBar";
import { TextField } from "@/components/fields";
import { useApiCollection } from "@/hooks/useApiCollection";
import LastUpdated from "@/components/LastUpdated";
import { parseProductWorkbook } from "@/lib/productImport";
import { useRole } from "@/lib/roleContext";
import { Product } from "@/lib/types";

const BARCODE_FILTER_OPTIONS = [
  { value: "all",     label: "All products" },
  { value: "missing", label: "Missing barcode" },
  { value: "has",     label: "Has barcode" },
];

type Form = { sku: string; no: string; product: string; packsize: string; unitPrice: string; price: string; barcode: string };
const BLANK: Form = { sku: "", no: "", product: "", packsize: "", unitPrice: "", price: "", barcode: "" };
type Banner = { kind: "success" | "error"; message: string };

// Price = Pack Size × Unit Price. Only auto-fills when both are plain
// numbers — leaves price alone for pack sizes like "24x2" that don't
// parse cleanly, so the field is still there to fill in by hand.
function computedPrice(packsize: string, unitPrice: string): string | null {
  if (!packsize.trim() || !unitPrice.trim()) return null;
  const pack = Number(packsize);
  const unit = Number(unitPrice);
  if (!Number.isFinite(pack) || !Number.isFinite(unit)) return null;
  return String(Math.round(pack * unit * 100) / 100);
}

export default function ProductsPage() {
  const { isAdmin } = useRole();
  const { items, loading, add, update, remove, lastUpdated, reload } =
    useApiCollection<Product>("/api/products", "products");

  const [open, setOpen]       = useState(false);
  const [editId, setEditId]   = useState<string | null>(null);
  const [form, setForm]       = useState<Form>(BLANK);
  const [banner, setBanner]   = useState<Banner | null>(null);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [search, setSearch]   = useState("");
  const [barcodeFilter, setBarcodeFilter] = useState("all");
  const [saving, setSaving]   = useState(false);

  // Defer the expensive filter so typing always feels instant
  const deferredSearch = useDeferredValue(search);
  const deferredFilter = useDeferredValue(barcodeFilter);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 6000);
    return () => clearTimeout(t);
  }, [banner]);

  // Cap rendered rows so DOM updates stay fast and never block keystrokes.
  // Even with useDeferredValue, rendering 4,976 <tr> elements takes ~300ms
  // which blocks the event loop and drops fast keystrokes.
  const ROW_LIMIT = 100;

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return items.filter((p) => {
      const match =
        !q ||
        (p.sku ?? "").toLowerCase().includes(q) ||
        (p.product ?? "").toLowerCase().includes(q) ||
        (p.barcode ?? "").toLowerCase().includes(q) ||
        (p.no ?? "").toLowerCase().includes(q);
      const has = Boolean(p.barcode?.trim());
      const filt =
        deferredFilter === "all" ||
        (deferredFilter === "missing" && !has) ||
        (deferredFilter === "has" && has);
      return match && filt;
    });
  }, [items, deferredSearch, deferredFilter]);

  function openCreate() {
    setEditId(null);
    setForm({ ...BLANK, no: String(items.length + 1) });
    setDrawerError(null);
    setOpen(true);
  }

  function openEdit(p: Product) {
    setEditId(p.id);
    setForm({
      sku:       String(p.sku       ?? ""),
      no:        String(p.no        ?? ""),
      product:   String(p.product   ?? ""),
      packsize:  String(p.packsize  ?? ""),
      unitPrice: String(p.unitPrice ?? ""),
      price:     String(p.price     ?? ""),
      barcode:   String(p.barcode   ?? ""),
    });
    setDrawerError(null);
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setDrawerError(null);
    try {
      const payload = {
        sku:       form.sku.trim(),
        no:        form.no.trim(),
        product:   form.product.trim(),
        packsize:  form.packsize.trim(),
        unitPrice: form.unitPrice.trim(),
        price:     form.price.trim(),
        barcode:   form.barcode.trim(),
      };
      if (editId) {
        await update(editId, payload);
      } else {
        await add(payload);
      }
      setOpen(false);
    } catch (err) {
      // Show error inside the drawer so user can see it while form is open
      setDrawerError(err instanceof Error ? err.message : "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Remove this product?")) return;
    try {
      await remove(id);
    } catch (err) {
      setBanner({ kind: "error", message: err instanceof Error ? err.message : "Failed to delete." });
    }
  }

  async function handleImport(file: File) {
    try {
      const { rows, skippedEmptyRows } = await parseProductWorkbook(file);
      if (rows.length === 0) {
        setBanner({ kind: "error", message: "No readable rows found. Check column headers." });
        return;
      }

      const CHUNK = 500;
      let totalAdded = 0, totalUpdated = 0;

      for (let i = 0; i < rows.length; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK);
        const res = await fetch("/api/products/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: chunk }),
        });
        const text = await res.text();
        let data: { added?: number; updated?: number; error?: string };
        try { data = JSON.parse(text); }
        catch { throw new Error(`Server error on chunk ${Math.floor(i / CHUNK) + 1}: ${text.slice(0, 200)}`); }
        if (!res.ok) { setBanner({ kind: "error", message: data.error ?? "Import failed." }); return; }
        totalAdded   += data.added   ?? 0;
        totalUpdated += data.updated ?? 0;
      }

      const parts = [
        totalAdded   ? `${totalAdded} added`   : null,
        totalUpdated ? `${totalUpdated} updated` : null,
        skippedEmptyRows ? `${skippedEmptyRows} blank rows skipped` : null,
      ].filter(Boolean);

      // Push the full, now-updated product list to Google Sheets, once,
      // after the whole import (all chunks) has finished.
      let sheetNote = "";
      try {
        const sheetRes = await fetch("/api/products/export-sheet", { method: "POST" });
        const sheetData = await sheetRes.json().catch(() => ({}));
        if (sheetData?.ok) sheetNote = " Synced to Google Sheets.";
        else if (sheetData?.error) sheetNote = ` (Google Sheets export failed: ${sheetData.error})`;
        // if skipped (not configured), say nothing — most users won't have set this up
      } catch {
        sheetNote = " (Could not reach Google Sheets export.)";
      }

      setBanner({ kind: "success", message: `Import complete — ${parts.join(", ")}.${sheetNote}` });
      await reload();
    } catch (err) {
      setBanner({ kind: "error", message: err instanceof Error ? err.message : "Could not read that file." });
    }
  }

  if (loading) return <div className="py-20 text-center text-sm text-muted">Loading products…</div>;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Products"
        description="SKU, packsize, pricing, and barcode for everything on the manifest."
        actionLabel="Log product"
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
        <div className={`flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm ${
          banner.kind === "success"
            ? "border-success/30 bg-success/10 text-success"
            : "border-danger/30 bg-danger/10 text-danger"
        }`}>
          {banner.kind === "success"
            ? <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
            : <AlertCircle size={17} className="mt-0.5 shrink-0" />}
          <span>{banner.message}</span>
        </div>
      )}

      <div className="flex justify-end -mt-2 mb-2">
        <LastUpdated date={lastUpdated} onRefresh={reload} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Products tracked" value={String(items.length)} />
        <StatCard
          label="Missing barcode"
          value={String(items.filter((p) => !p.barcode?.trim()).length)}
          hint={items.filter((p) => !p.barcode?.trim()).length ? "Needs attention" : "All set"}
        />
        <StatCard label="Showing" value={String(filtered.length)} />
      </div>

      <SearchFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by No, product, SKU, or barcode…"
        filterValue={barcodeFilter}
        onFilterChange={setBarcodeFilter}
        filterOptions={BARCODE_FILTER_OPTIONS}
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products yet"
          description="Upload your Excel sheet or add the first item by hand."
          actionLabel="Log a product"
          onAction={openCreate}
        />
      ) : filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-hairline bg-surface/60 px-4 py-10 text-center text-sm text-muted">
          No products match your search or filter.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-hairline bg-surface">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">No</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Pack Size</th>
                <th className="px-4 py-3 font-medium text-right">Unit Price</th>
                <th className="px-4 py-3 font-medium text-right">Price</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                {isAdmin && <th className="px-4 py-3 font-medium text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, ROW_LIMIT).map((p) => (
                <tr key={p.id} className="border-b border-hairline last:border-0 hover:bg-canvas/40">
                  <td className="px-4 py-3 font-mono text-xs text-muted">{p.no || "—"}</td>
                  <td className="px-4 py-3 font-medium text-ink">
                    {p.product || <span className="italic text-muted">Unnamed</span>}
                  </td>
                  <td className="px-4 py-3 text-muted">{p.packsize || "—"}</td>
                  <td className="px-4 py-3 text-right font-mono text-ink">{p.unitPrice || "—"}</td>
                  <td className="px-4 py-3 text-right font-mono text-ink">{p.price || "—"}</td>
                  <td className="px-4 py-3">
                    <RefTag>{p.sku || "—"}</RefTag>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => openEdit(p)}
                          aria-label="Edit"
                          className="rounded-md p-1.5 text-muted hover:bg-ink/5 hover:text-ink"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
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
          {filtered.length > ROW_LIMIT && (
            <div className="border-t border-hairline bg-canvas/40 px-4 py-3 text-center text-xs text-muted">
              Showing first {ROW_LIMIT} of {filtered.length} results — type more to narrow down
            </div>
          )}
        </div>
      )}

      {isAdmin && (
        <Drawer
          open={open}
          onClose={() => { setOpen(false); setDrawerError(null); }}
          title={editId ? "Edit product" : "Add product"}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <TextField
              label="Product name"
              value={form.product}
              onChange={(e) => setForm({ ...form, product: e.target.value })}
              placeholder="e.g. Acyclovir 800mg 35s"
              autoFocus
            />
            <div className="grid grid-cols-2 gap-4">
              <TextField
                label="No"
                value={form.no}
                onChange={(e) => setForm({ ...form, no: e.target.value })}
                placeholder="e.g. 1"
              />
              <TextField
                label="Pack Size"
                value={form.packsize}
                onChange={(e) => {
                  const packsize = e.target.value;
                  setForm((f) => ({ ...f, packsize, price: computedPrice(packsize, f.unitPrice) ?? f.price }));
                }}
                placeholder="e.g. 35"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TextField
                label="Unit Price (KSh)"
                value={form.unitPrice}
                onChange={(e) => {
                  const unitPrice = e.target.value;
                  setForm((f) => ({ ...f, unitPrice, price: computedPrice(f.packsize, unitPrice) ?? f.price }));
                }}
                placeholder="e.g. 100"
              />
              <TextField
                label="Price (KSh)"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="e.g. 3500 — auto-fills from Pack Size × Unit Price"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TextField
                label="SKU"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                placeholder="e.g. HEL-001"
              />
              <TextField
                label="Barcode"
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                placeholder="e.g. 6009123456781"
                inputMode="numeric"
              />
            </div>

            {/* Error shown inside the drawer so user can see it */}
            {drawerError && (
              <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-danger">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <span>{drawerError}</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-md bg-accent px-4 py-2 text-sm font-medium text-surface hover:bg-accent/90 disabled:opacity-60"
              >
                {saving ? "Saving…" : editId ? "Save changes" : "Add product"}
              </button>
              <button
                type="button"
                onClick={() => { setOpen(false); setDrawerError(null); }}
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
