"use client";

import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { parseProductWorkbook } from "@/lib/productImport";

type ImportResult = { added: number; updated: number; skippedEmptyRows: number };

type Props = {
  onImported: (result: ImportResult) => void;
  onError: (message: string) => void;
};

export default function ImportExcelButton({ onImported, onError }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setLoading(true);
    try {
      const { rows, skippedEmptyRows } = await parseProductWorkbook(file);
      if (rows.length === 0) {
        onError("Couldn't find any rows with a SKU, product name, or barcode. Check the column headers.");
        return;
      }
      const res = await fetch("/api/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (!res.ok) { onError(data.error ?? "Import failed on the server."); return; }
      onImported({ added: data.added, updated: data.updated, skippedEmptyRows });
    } catch {
      onError("Couldn't read that file. Make sure it's a .xlsx, .xls, or .csv export.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleChange} className="hidden" />
      <button type="button" onClick={() => inputRef.current?.click()} disabled={loading}
        className="flex items-center gap-1.5 rounded-md border border-hairline bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-canvas disabled:opacity-60">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
        Import Excel
      </button>
    </>
  );
}
