"use client";

import { useRole } from "@/lib/roleContext";
import { ShieldCheck, Eye } from "lucide-react";

export default function RoleSwitcher() {
  const { role, setRole } = useRole();
  const isAdmin = role === "admin";

  return (
    <div className="flex items-center gap-1 rounded-lg border border-hairline bg-canvas p-1">
      <button
        onClick={() => setRole("admin")}
        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
          isAdmin
            ? "bg-ink text-surface shadow-sm"
            : "text-muted hover:text-ink"
        }`}
      >
        <ShieldCheck size={13} />
        Admin
      </button>
      <button
        onClick={() => setRole("staff")}
        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
          !isAdmin
            ? "bg-ink text-surface shadow-sm"
            : "text-muted hover:text-ink"
        }`}
      >
        <Eye size={13} />
        Staff
      </button>
    </div>
  );
}
