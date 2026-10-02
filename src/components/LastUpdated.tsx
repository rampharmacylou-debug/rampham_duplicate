"use client";

import { RefreshCw } from "lucide-react";

type Props = {
  date: Date | null;
  onRefresh?: () => void;
};

function formatRelative(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 10)  return "just now";
  if (diff < 60)  return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return date.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });
}

export default function LastUpdated({ date, onRefresh }: Props) {
  if (!date) return null;
  return (
    <div className="flex items-center gap-2 text-xs text-muted">
      <span>Updated {formatRelative(date)}</span>
      {onRefresh && (
        <button
          onClick={onRefresh}
          title="Refresh now"
          className="rounded p-0.5 hover:text-ink"
        >
          <RefreshCw size={12} />
        </button>
      )}
    </div>
  );
}
