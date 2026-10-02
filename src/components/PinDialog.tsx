"use client";

import { useRef, useState } from "react";
import { Lock, X, Loader2 } from "lucide-react";

type Props = {
  onSuccess: () => void;
};

export default function PinDialog({ onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function openDialog() {
    setPin("");
    setError("");
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pin.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) {
        setOpen(false);
        onSuccess();
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Incorrect PIN.");
        setPin("");
        inputRef.current?.focus();
      }
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={openDialog}
        className="flex items-center gap-1.5 rounded-md border border-hairline px-3 py-1.5 text-xs font-medium text-muted hover:bg-canvas hover:text-ink"
      >
        <Lock size={13} />
        Admin mode
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* Backdrop */}
          <button
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/40"
          />
          {/* Dialog */}
          <div className="relative w-full max-w-xs rounded-xl border border-hairline bg-surface p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-base font-bold text-ink">Enter admin PIN</p>
                <p className="mt-0.5 text-xs text-muted">
                  PIN unlocks full admin access for this session.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-muted hover:bg-ink/5 hover:text-ink"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <input
                ref={inputRef}
                type="password"
                value={pin}
                onChange={(e) => { setPin(e.target.value); setError(""); }}
                placeholder="PIN"
                autoComplete="off"
                className="w-full rounded-md border border-hairline bg-white px-3 py-2 text-center text-lg tracking-[0.5em] outline-none focus:border-accent focus:ring-1 focus:ring-accent/40"
              />
              {error && (
                <p className="rounded-md bg-danger/10 px-3 py-1.5 text-center text-sm text-danger">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading || !pin.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-surface hover:bg-accent/90 disabled:opacity-60"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />}
                {loading ? "Checking…" : "Unlock"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
